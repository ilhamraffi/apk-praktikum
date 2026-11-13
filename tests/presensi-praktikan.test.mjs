// node --test tests/*.test.mjs — tanpa koneksi ke proyek Firebase tim.
import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const util = loadSource("src/utils/presensiPraktikan.ts");
const errors = loadSource("src/lib/errors.ts");
const profil = { nama: "Andi", nim: "230001", email: "andi@example.test", role: "PRAKTIKAN" };
const session = { id: "satu", classId: "a", namaPraktikum: "Pemrograman", modul: "Modul 1", waktu: "Senin 08:00", ruangan: "Lab 1", status: "DIBUKA" };
const record = { nama: "Andi", nim: "230001", statusKehadiran: "Hadir", catatan: "", waktu: "2026-11-14T01:00:00Z" };
const request = { uid: "praktikan-a", sesiId: "satu", catatan: "  catatan saya  " };
const attendancePath = "sessions/satu/attendance/praktikan-a";

function firestoreHarness(react) {
  const documents = new Map([
    ["users/praktikan-a", { ...profil }],
    ["classes/a", { nama: "Kelas A", kode: "A", pesertaUids: ["praktikan-a"] }],
    ["sessions/satu", { ...session }],
  ]);
  const auth = { currentUser: { uid: "praktikan-a" } };
  const state = { offline: false, onRead: null, retryChange: null, attempts: 0 };
  const writes = [];
  const listeners = [];
  const serverTime = { serverTimestamp: true };
  let queue = Promise.resolve();
  const firestore = {
    doc: (_db, ...parts) => ({ path: parts.join("/") }),
    serverTimestamp: () => serverTime,
    runTransaction: (_db, callback) => {
      // Serialisasi model commit; Firebase asli menangani contention/retry.
      const operation = queue.then(async () => {
        if (state.offline) throw { code: "firestore/unavailable" };
        for (let attempt = 0; attempt < 2; attempt += 1) {
          state.attempts += 1;
          const staged = [];
          await callback({
            get: async (ref) => {
              assert.equal(staged.length, 0, "Semua read harus sebelum write");
              const data = documents.get(ref.path);
              state.onRead?.(ref.path);
              return { exists: () => data !== undefined, data: () => data };
            },
            set: (ref, data) => staged.push({ path: ref.path, data }),
          });
          if (attempt === 0 && state.retryChange) {
            state.retryChange();
            continue;
          }
          staged.forEach((write) => { documents.set(write.path, write.data); writes.push(write); });
          break;
        }
      });
      queue = operation.catch(() => {});
      return operation;
    },
    onSnapshot: (ref, options, next, error) => {
      const listener = { ref, options, next, error, active: true, stops: 0 };
      listeners.push(listener);
      return () => { listener.active = false; listener.stops += 1; };
    },
  };
  const source = loadSource("src/hooks/usePresensiPraktikan.ts", {
    ...(react ? { react } : {}),
    "@react-native-firebase/firestore": firestore,
    "../lib/firebase": { auth, db: {} },
    "../lib/errors": errors,
    "../utils/presensiPraktikan": util,
  });
  const snapshots = [];
  return {
    ...source, documents, auth, state, writes, listeners, serverTime,
    subscribe: (uid, ids) => source.langgananPresensiPraktikan(uid, ids, (data) => snapshots.push(data)),
    latest: () => snapshots.at(-1),
    count: () => snapshots.length,
    emit: (listener, data, fromCache = false, hasPendingWrites = false) => listener.next({
      exists: () => data !== null, data: () => data, metadata: { fromCache, hasPendingWrites },
    }),
  };
}

test("presensi memakai profil server, ID dokumen UID, kontrak rekap, dan serverTimestamp", async () => {
  const h = firestoreHarness();
  await h.catatPresensiPraktikan({ ...request, nama: "Nama palsu", nim: "palsu", statusKehadiran: "Izin" });
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].path, attendancePath);
  assert.deepEqual(h.writes[0].data, {
    nama: "Andi", nim: "230001", statusKehadiran: "Hadir", catatan: "catatan saya", waktu: h.serverTime,
  });
  // Pembaca rekap Ilham harus bisa menghitung dokumen yang kita tulis.
  const { hitungRekapPresensi } = loadSource("src/components/asisten/dataRekapPresensi.ts");
  const rekap = hitungRekapPresensi([{ ...h.writes[0].data, uid: request.uid }], 1);
  assert.equal(rekap.jumlahHadir, 1);
  assert.equal(rekap.jumlahDiabaikan, 0);
});

test("percobaan ganda termasuk dua permintaan bersamaan menghasilkan satu catatan", async () => {
  const h = firestoreHarness();
  const results = await Promise.allSettled([h.catatPresensiPraktikan(request), h.catatPresensiPraktikan(request)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.match(results.find((result) => result.status === "rejected").reason.message, /sudah tercatat/);
  assert.equal(h.writes.length, 1);
});

test("catatan Izin yang sudah ada tidak ditimpa menjadi Hadir", async () => {
  const h = firestoreHarness();
  h.documents.set(attendancePath, { ...record, statusKehadiran: "Izin" });
  await assert.rejects(h.catatPresensiPraktikan(request), /sudah tercatat/);
  assert.equal(h.writes.length, 0);
  assert.equal(h.documents.get(attendancePath).statusKehadiran, "Izin");
});

test("sesi belum dibuka, ditutup, dan hilang tidak menerima presensi", async () => {
  for (const status of ["BELUM_DIBUKA", "DITUTUP", null]) {
    const h = firestoreHarness();
    if (status) h.documents.set("sessions/satu", { ...session, status });
    else h.documents.delete("sessions/satu");
    await assert.rejects(h.catatPresensiPraktikan(request), /belum dibuka|sudah ditutup|tidak ditemukan/);
    assert.equal(h.writes.length, 0);
  }
});

test("role salah, profil hilang/tidak lengkap, dan bukan peserta ditolak", async () => {
  const changes = [
    (h) => h.documents.set("users/praktikan-a", { ...profil, role: "ASISTEN" }),
    (h) => h.documents.delete("users/praktikan-a"),
    (h) => h.documents.set("users/praktikan-a", { ...profil, nim: " " }),
    (h) => h.documents.set("classes/a", { pesertaUids: ["praktikan-b"] }),
    (h) => h.documents.delete("classes/a"),
  ];
  for (const change of changes) {
    const h = firestoreHarness();
    change(h);
    await assert.rejects(h.catatPresensiPraktikan(request));
    assert.equal(h.writes.length, 0);
  }
});

test("akun berbeda atau logout di tengah transaksi ditolak", async () => {
  for (const during of [false, true]) {
    const h = firestoreHarness();
    if (during) h.state.onRead = (path) => { if (path === "classes/a") h.auth.currentUser = null; };
    else h.auth.currentUser = { uid: "praktikan-b" };
    await assert.rejects(h.catatPresensiPraktikan(request), /Sesi akun berubah/);
    assert.equal(h.writes.length, 0);
  }
});

test("retry transaksi memeriksa ulang sesi ditutup, peserta dicabut, atau duplikat", async () => {
  const changes = [
    (h) => h.documents.set("sessions/satu", { ...session, status: "DITUTUP" }),
    (h) => h.documents.set("classes/a", { pesertaUids: [] }),
    (h) => h.documents.set(attendancePath, record),
  ];
  for (const change of changes) {
    const h = firestoreHarness();
    h.state.retryChange = () => change(h);
    await assert.rejects(h.catatPresensiPraktikan(request));
    assert.equal(h.state.attempts, 2);
    assert.equal(h.writes.length, 0);
  }
});

test("offline tidak dianggap sukses atau menyimpan ke antrean lokal", async () => {
  const h = firestoreHarness();
  h.state.offline = true;
  await assert.rejects(h.catatPresensiPraktikan(request), (err) => err.code === "firestore/unavailable");
  assert.equal(h.documents.has(attendancePath), false);
  assert.equal(h.writes.length, 0);
});

test("ID tidak valid dan catatan terlalu panjang ditolak sebelum transaksi", async () => {
  for (const input of [{ ...request, sesiId: "a/b" }, { ...request, uid: "" }, { ...request, catatan: "a".repeat(501) }]) {
    const h = firestoreHarness();
    await assert.rejects(h.catatPresensiPraktikan(input));
    assert.equal(h.state.attempts, 0);
    assert.equal(h.writes.length, 0);
  }
});

test("listener pribadi tidak membaca koleksi atau UID peserta lain", () => {
  const h = firestoreHarness();
  h.subscribe("praktikan-a", ["satu", "dua", "satu"]);
  assert.deepEqual(h.listeners.map((item) => item.ref.path), ["sessions/dua/attendance/praktikan-a", attendancePath]);
  h.emit(h.listeners[0], null);
  assert.equal(h.latest().loading, true);
  h.emit(h.listeners[1], { ...record, uid: "uid-yang-salah" });
  assert.equal(h.latest().loading, false);
  assert.equal(h.latest().catatan.size, 1);
  assert.equal(h.latest().catatan.get("satu").uid, "praktikan-a");
});

test("tanpa UID atau sesi tidak membuat listener", () => {
  for (const [uid, ids] of [[undefined, ["satu"]], ["praktikan-a", []]]) {
    const h = firestoreHarness();
    h.subscribe(uid, ids);
    assert.equal(h.listeners.length, 0);
    assert.equal(h.latest().loading, false);
  }
});

test("metadata memisahkan cache, write tertunda, dan konfirmasi server", () => {
  const h = firestoreHarness();
  h.subscribe("praktikan-a", ["satu"]);
  assert.equal(h.listeners[0].options.includeMetadataChanges, true);
  h.emit(h.listeners[0], { ...record, waktu: null }, true, true);
  assert.equal(h.latest().tertunda.has("satu"), true);
  assert.equal(h.latest().dariCache, true);
  h.emit(h.listeners[0], record, false, false);
  assert.equal(h.latest().tertunda.size, 0);
  assert.equal(h.latest().dariCache, false);
});

test("listener error menghapus riwayat lama dan menolak callback terlambat", () => {
  const h = firestoreHarness();
  h.subscribe("praktikan-a", ["satu", "dua"]);
  h.emit(h.listeners[1], record);
  h.listeners[0].error({ code: "firestore/permission-denied" });
  assert.equal(h.latest().catatan.size, 0);
  assert.match(h.latest().error, /Akses ditolak/);
  assert.equal(h.listeners.some((item) => item.active), false);
  const count = h.count();
  h.emit(h.listeners[1], record);
  assert.equal(h.count(), count);
});

test("unmount/logout menghentikan seluruh listener sekali", () => {
  const h = firestoreHarness();
  const stop = h.subscribe("praktikan-a", ["satu", "dua"]);
  stop();
  stop();
  assert.equal(h.listeners.every((item) => item.stops === 1), true);
  const count = h.count();
  h.emit(h.listeners[0], record);
  assert.equal(h.count(), count);
});

test("hook menyembunyikan data akun/sesi sebelumnya sebelum effect sempat berjalan", () => {
  const oldState = {
    key: JSON.stringify(["praktikan-a", JSON.stringify(["satu"]), 0]),
    data: { catatan: new Map([["satu", record]]), tertunda: new Set(), loading: false, error: null, dariCache: false },
  };
  let calls = 0;
  const h = firestoreHarness({
    useState: () => [calls++ % 2 === 0 ? 0 : oldState, () => {}],
    useEffect: () => {},
    useCallback: (callback) => callback,
  });
  for (const [uid, ids] of [["praktikan-b", ["satu"]], ["praktikan-a", ["dua"]], [undefined, ["satu"]]]) {
    const result = h.usePresensiPraktikan(uid, ids);
    assert.equal(result.catatan.size, 0);
    assert.equal(result.loading, Boolean(uid));
  }
  assert.equal(h.usePresensiPraktikan("praktikan-a", ["satu"]).catatan.size, 1);
  assert.equal(h.listeners.length, 0);
});

test("formatter tidak mengarang waktu ketika timestamp belum tersedia", () => {
  for (const value of [null, undefined, {}, "bukan tanggal", { toDate: () => new Date(NaN) }, { toDate: () => { throw new Error(); } }]) {
    assert.equal(util.formatWaktuPresensiPraktikan(value), "Waktu server belum tersedia");
  }
  assert.match(util.formatWaktuPresensiPraktikan({ toDate: () => new Date("2026-11-14T01:00:00Z") }), /2026.*08[.:]00.*WIB/);
});
