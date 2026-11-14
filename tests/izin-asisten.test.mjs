// Firebase tiruan: tidak membaca/menulis proyek tim atau menguji Security Rules asli.
import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./helpers/load-source.mjs";
import { hookHarness } from "./helpers/hook-harness.mjs";

const util = loadSource("src/utils/izinAsisten.ts");
const errors = loadSource("src/lib/errors.ts");
const pengajuan = {
  id: "izin-satu", uid: "praktikan-a", sessionId: "sesi-satu", alasan: "Sedang sakit",
  kategoriAI: "Kesehatan", statusAI: "success", status: "pending", dibuatPada: "2026-11-14T01:00:00Z",
};
const input = { asistenUid: "asisten-a", pengajuan, keputusan: "approved" };
const path = "permissions/izin-satu";

function firestoreHarness(react) {
  const documents = new Map([["users/asisten-a", { role: "ASISTEN" }], [path, { ...pengajuan }]]);
  const auth = { currentUser: { uid: "asisten-a" } };
  const control = { offline: false, onRead: null, retryChange: null, onSubscribe: null, attempts: 0 };
  const writes = [], reads = [], listeners = [];
  const serverTime = { serverTimestamp: true };
  let queue = Promise.resolve();
  const firestore = {
    doc: (_db, ...parts) => ({ path: parts.join("/") }),
    collection: (_db, name) => ({ path: name }),
    where: (...args) => args,
    query: (ref, ...filters) => ({ ...ref, filters }),
    serverTimestamp: () => serverTime,
    runTransaction: (_db, callback) => {
      // Serialisasi commit + simulasi retry; contention nyata harus diuji di emulator.
      const result = queue.then(async () => {
        if (control.offline) throw { code: "firestore/unavailable" };
        for (let attempt = 0; attempt < 2; attempt += 1) {
          control.attempts += 1;
          const staged = [];
          await callback({
            get: async (ref) => {
              assert.equal(staged.length, 0, "Tidak boleh read setelah write");
              reads.push(ref.path);
              const data = documents.get(ref.path);
              control.onRead?.(ref.path);
              return { exists: () => data !== undefined, data: () => data };
            },
            update: (ref, data) => staged.push({ path: ref.path, data }),
          });
          if (attempt === 0 && control.retryChange) { control.retryChange(); continue; }
          staged.forEach((write) => {
            assert.ok(documents.has(write.path), "Update tidak membuat dokumen baru");
            documents.set(write.path, { ...documents.get(write.path), ...write.data });
            writes.push(write);
          });
          break;
        }
      });
      queue = result.catch(() => {});
      return result;
    },
    onSnapshot: (ref, options, next, error) => {
      if (typeof options === "function") { error = next; next = options; options = {}; }
      const listener = { ref, options, next, error, stops: 0 };
      listeners.push(listener);
      control.onSubscribe?.(listener);
      return () => { listener.stops += 1; };
    },
  };
  const mocks = {
    ...(react ? { react } : {}), "@react-native-firebase/firestore": firestore,
    "../lib/firebase": { auth, db: {} }, "../lib/errors": errors, "../utils/izinAsisten": util,
  };
  const source = loadSource("src/hooks/useIzinAsisten.ts", mocks);
  const reference = loadSource("src/hooks/useReferensiIzinAsisten.ts", mocks);
  const results = [];
  return {
    ...source, ...reference, auth, documents, control, reads, writes, listeners, serverTime,
    subscribe: (uid, target) => source.langgananIzinAsisten(uid, target, (data) => results.push(data)),
    latest: () => results.at(-1), count: () => results.length,
    emit: (listener, data, fromCache = false, hasPendingWrites = false) => {
      const metadata = { fromCache, hasPendingWrites };
      listener.next(listener.ref.filters ? {
        metadata, docs: data.map(([id, value]) => ({ id, data: () => value })),
      } : {
        metadata, id: listener.ref.path.split("/").at(-1), exists: () => data !== null, data: () => data,
      });
    },
  };
}

test("keputusan hanya memperbarui tiga field, identitas Auth, dan waktu server", async () => {
  for (const keputusan of ["approved", "rejected"]) {
    const h = firestoreHarness();
    await h.putuskanPengajuanIzin({ ...input, keputusan });
    assert.deepEqual(h.writes, [{ path, data: { status: keputusan, diputuskanOleh: "asisten-a", diputuskanPada: h.serverTime } }]);
    assert.equal(h.documents.get(path).alasan, pengajuan.alasan);
    assert.equal(h.documents.get(path).kategoriAI, pengajuan.kategoriAI);
    assert.deepEqual(h.reads, ["users/asisten-a", path]);
    assert.equal([...h.documents.keys()].some((key) => key.includes("attendance")), false);
  }
});

test("AI tidak menentukan keputusan: kategori kosong/gagal maupun berubah saat retry tetap boleh", async () => {
  for (const keputusan of ["approved", "rejected"]) {
    const h = firestoreHarness();
    h.documents.set(path, { ...pengajuan, kategoriAI: null, statusAI: "timeout" });
    h.control.retryChange = () => h.documents.set(path, { ...h.documents.get(path), kategoriAI: "Kegiatan", statusAI: "success" });
    await h.putuskanPengajuanIzin({ ...input, keputusan });
    assert.equal(h.documents.get(path).status, keputusan);
    assert.equal(h.documents.get(path).kategoriAI, "Kegiatan");
    assert.equal(h.writes.length, 1);
  }
});

test("dua keputusan bersamaan tidak menimpa keputusan pertama dalam model transaksi", async () => {
  const h = firestoreHarness();
  const results = await Promise.allSettled([
    h.putuskanPengajuanIzin(input), h.putuskanPengajuanIzin({ ...input, keputusan: "rejected" }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.match(results.find((result) => result.status === "rejected").reason.message, /sudah diputuskan/);
  assert.equal(h.writes.length, 1);
  assert.equal(h.documents.get(path).status, "approved");
});

test("izin yang sudah diputuskan tidak bisa diubah atau direset", async () => {
  for (const status of ["approved", "rejected"]) {
    const h = firestoreHarness();
    h.documents.set(path, { ...pengajuan, status });
    await assert.rejects(h.putuskanPengajuanIzin(input), /sudah diputuskan/);
    assert.equal(h.writes.length, 0);
  }
});

test("bukan asisten, profil hilang, dan perubahan akun ditolak sebelum write", async () => {
  for (const change of [
    (h) => h.documents.set("users/asisten-a", { role: "PRAKTIKAN" }),
    (h) => h.documents.delete("users/asisten-a"),
    (h) => { h.auth.currentUser = { uid: "asisten-b" }; },
    (h) => { h.control.onRead = () => { h.auth.currentUser = null; }; },
  ]) {
    const h = firestoreHarness(); change(h);
    await assert.rejects(h.putuskanPengajuanIzin(input));
    assert.equal(h.writes.length, 0);
  }
});

test("retry memeriksa ulang role, alasan, UID/sesi, dokumen hilang, dan status", async () => {
  for (const change of [
    (h) => h.documents.set("users/asisten-a", { role: "PRAKTIKAN" }),
    (h) => h.documents.set(path, { ...pengajuan, alasan: "Alasan baru" }),
    (h) => h.documents.set(path, { ...pengajuan, uid: "praktikan-b" }),
    (h) => h.documents.set(path, { ...pengajuan, sessionId: "sesi-dua" }),
    (h) => h.documents.delete(path),
    (h) => h.documents.set(path, { ...pengajuan, status: "rejected" }),
  ]) {
    const h = firestoreHarness();
    h.control.retryChange = () => change(h);
    await assert.rejects(h.putuskanPengajuanIzin(input));
    assert.equal(h.control.attempts, 2);
    assert.equal(h.writes.length, 0);
  }
});

test("offline tidak mengantre atau mengklaim keputusan berhasil", async () => {
  const h = firestoreHarness();
  h.control.offline = true;
  await assert.rejects(h.putuskanPengajuanIzin(input), (error) => error.code === "firestore/unavailable");
  assert.equal(h.documents.get(path).status, "pending");
  assert.equal(h.writes.length, 0);
});

test("input/keputusan ilegal dan data rusak ditolak sebelum transaksi", async () => {
  for (const bad of [
    { ...input, keputusan: "pending" }, { ...input, keputusan: "accept" }, { ...input, asistenUid: "x/y" },
    { ...input, pengajuan: { ...pengajuan, id: "" } }, { ...input, pengajuan: { ...pengajuan, alasan: "  " } },
    { ...input, pengajuan: { ...pengajuan, sessionId: "x/y" } }, { ...input, pengajuan: { ...pengajuan, status: "approved" } },
  ]) {
    const h = firestoreHarness();
    await assert.rejects(h.putuskanPengajuanIzin(bad));
    assert.equal(h.control.attempts, 0);
  }
});

test("daftar difilter status, memuat waktu null, dan ID selalu berasal dari path", () => {
  const h = firestoreHarness();
  h.subscribe("asisten-a", { jenis: "daftar", status: "pending" });
  const listener = h.listeners[0];
  assert.deepEqual(listener.ref, { path: "permissions", filters: [["status", "==", "pending"]] });
  assert.equal(listener.options.includeMetadataChanges, true);
  h.emit(listener, [
    ["lama", { ...pengajuan, dibuatPada: null }],
    ["baru", { ...pengajuan, id: "id-palsu", kategoriAI: null }],
  ]);
  assert.deepEqual(h.latest().izin.map((item) => item.id), ["baru", "lama"]);
  assert.equal(h.latest().izin[0].kategoriAI, null);
  assert.equal(h.latest().loading, false);
});

test("detail berubah real-time, membedakan cache/tertunda, lalu kosong saat dihapus", () => {
  const h = firestoreHarness();
  h.subscribe("asisten-a", { jenis: "detail", id: "izin-satu" });
  const listener = h.listeners[0];
  assert.equal(listener.ref.path, path);
  h.emit(listener, pengajuan, true, true);
  assert.equal(h.latest().dariCache, true);
  assert.equal(h.latest().tertunda, true);
  h.emit(listener, { ...pengajuan, status: "approved" });
  assert.equal(h.latest().izin[0].status, "approved");
  assert.equal(h.latest().dariCache, false);
  assert.equal(h.latest().tertunda, false);
  h.emit(listener, null);
  assert.deepEqual(h.latest().izin, []);
  assert.equal(h.latest().error, null);
});

test("listener gagal/data rusak menghapus data lama dan mengabaikan callback terlambat", () => {
  for (const fail of [
    (h, listener) => listener.error({ code: "firestore/permission-denied" }),
    (h, listener) => h.emit(listener, { ...pengajuan, alasan: {} }),
  ]) {
    const h = firestoreHarness();
    const stop = h.subscribe("asisten-a", { jenis: "detail", id: "izin-satu" });
    const listener = h.listeners[0];
    h.emit(listener, pengajuan);
    fail(h, listener);
    assert.deepEqual(h.latest().izin, []);
    assert.ok(h.latest().error);
    const count = h.count();
    h.emit(listener, pengajuan); stop(); stop();
    assert.equal(h.count(), count);
    assert.equal(listener.stops, 1);
  }
});

test("tanpa UID, akun berbeda, dan ID invalid tidak membuat listener; error sinkron juga dibersihkan", () => {
  for (const [uid, target] of [
    [undefined, { jenis: "daftar", status: "pending" }], ["akun-lain", { jenis: "daftar", status: "pending" }],
    ["asisten-a", { jenis: "detail", id: "a/b" }], ["asisten-a", { jenis: "daftar", status: "invalid" }],
  ]) {
    const h = firestoreHarness(); h.subscribe(uid, target);
    assert.equal(h.listeners.length, 0);
    assert.equal(h.latest().loading, false);
  }
  const h = firestoreHarness();
  h.control.onSubscribe = (listener) => listener.error({ code: "firestore/permission-denied" });
  h.subscribe("asisten-a", { jenis: "daftar", status: "pending" });
  assert.equal(h.listeners[0].stops, 1);
});

test("hook segera menyembunyikan izin akun/filter/detail sebelumnya dan membersihkan listener", () => {
  const hooks = hookHarness(); const h = firestoreHarness(hooks.react);
  const render = (uid = "asisten-a", status = "pending") => hooks.render(() => h.useDaftarIzinAsisten(uid, status));
  render(); h.emit(h.listeners[0], [["izin-satu", pengajuan]]);
  assert.equal(render().izin.length, 1);
  const changed = render("asisten-a", "rejected");
  assert.equal(changed.izin.length, 0);
  assert.equal(changed.loading, true);
  assert.equal(h.listeners[0].stops, 1);
  h.emit(h.listeners[1], [["izin-dua", { ...pengajuan, status: "rejected" }]]);
  assert.equal(render("asisten-b", "rejected").izin.length, 0);
  hooks.unmount();

  const detailHooks = hookHarness(); const d = firestoreHarness(detailHooks.react);
  detailHooks.render(() => d.useDetailIzinAsisten("asisten-a", "izin-satu"));
  d.emit(d.listeners[0], pengajuan);
  assert.equal(detailHooks.render(() => d.useDetailIzinAsisten("asisten-a", "izin-dua")).pengajuan, null);
  detailHooks.unmount();
});

test("referensi profil/sesi memakai dokumen terkait, membersihkan data lama/error dan mendukung retry", () => {
  const hooks = hookHarness(); const h = firestoreHarness(hooks.react);
  const render = (id = "praktikan-a") => hooks.render(() => h.useReferensiIzinAsisten("asisten-a", "users", id));
  render(); assert.equal(h.listeners[0].ref.path, "users/praktikan-a");
  h.emit(h.listeners[0], { nama: "Andi" });
  assert.equal(render().data.nama, "Andi");
  assert.equal(render("praktikan-b").data, null);
  assert.equal(h.listeners[0].stops, 1);
  h.emit(h.listeners[0], { nama: "Callback lama" });
  h.emit(h.listeners[1], { nama: "Budi" });
  h.listeners[1].error({ code: "firestore/permission-denied" });
  const failed = render("praktikan-b");
  assert.equal(failed.data, null); assert.match(failed.error, /Akses ditolak/);
  failed.cobaLagi(); render("praktikan-b");
  assert.equal(h.listeners.length, 3);
  h.emit(h.listeners[2], null);
  assert.equal(render("praktikan-b").loading, false);
  hooks.unmount(); assert.equal(h.listeners.every((listener) => listener.stops === 1), true);
});

test("formatter menangani waktu null/tidak valid tanpa membuat waktu perangkat", () => {
  for (const nilai of [null, undefined, "besok", "2026-11-14T08:00:00", {}, { toDate: () => new Date(NaN) }, { toDate: () => { throw new Error(); } }]) {
    assert.equal(util.formatWaktuIzin(nilai), "Waktu server belum tersedia");
  }
  assert.match(util.formatWaktuIzin({ toDate: () => new Date("2026-11-14T01:00:00Z") }), /2026.*08[.:]00.*WIB/);
  assert.equal(util.teksIzin({ tidak: "valid" }, "Tidak tersedia"), "Tidak tersedia");
});
