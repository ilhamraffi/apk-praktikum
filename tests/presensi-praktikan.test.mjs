// node --test tests/*.test.mjs — tanpa koneksi ke proyek Firebase tim.
import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const util = loadSource("src/utils/presensiPraktikan.ts");
const geo = loadSource("src/lib/geo.ts");
const errors = loadSource("src/lib/errors.ts");

const koordinatDalam = { latitude: -6.973, longitude: 107.6301, akurasiMeter: 15 };
const koordinatLuar = { latitude: -6.975, longitude: 107.635, akurasiMeter: 12 };
const labDefault = {
  id: "lab-1",
  nama: "Lab Komputasi Dasar",
  gedung: "Gedung E301",
  latitude: -6.973,
  longitude: 107.63,
  radiusMeter: 50,
};
const session = {
  id: "satu",
  classId: "a",
  labId: "lab-1",
  namaPraktikum: "Pemrograman",
  modul: "Modul 1",
  waktu: "Senin 08:00",
  ruangan: "Lab 1",
  status: "DIBUKA",
};
const record = {
  nama: "Andi",
  nim: "230001",
  statusKehadiran: "Hadir",
  catatan: "Hadir",
  waktu: "2026-11-14T01:00:00Z",
  jarakMeter: 12.4,
};
const request = {
  uid: "praktikan-a",
  sesiId: "satu",
  catatan: "  catatan saya  ",
  koordinat: koordinatDalam,
};
const attendancePath = "sessions/satu/attendance/praktikan-a";

function presensiHarness(react) {
  const calls = [];
  const listeners = [];
  let nextError = null;
  const firestore = {
    doc: (_db, ...parts) => ({ path: parts.join("/") }),
    onSnapshot: (ref, options, next, error) => {
      const listener = { ref, options, next, error, active: true, stops: 0 };
      listeners.push(listener);
      return () => {
        listener.active = false;
        listener.stops += 1;
      };
    },
  };
  const source = loadSource("src/hooks/usePresensiPraktikan.ts", {
    ...(react ? { react } : {}),
    "@react-native-firebase/firestore": firestore,
    "../lib/firebase": { db: {} },
    "../lib/errors": errors,
    "../lib/presensi": {
      catatPresensi: async (payload) => {
        calls.push(payload);
        if (nextError) throw nextError;
        return { jarakMeter: 12.4, radiusMeter: 50 };
      },
    },
    "../utils/presensiPraktikan": util,
  });
  const snapshots = [];
  return {
    ...source,
    calls,
    listeners,
    setNextError: (err) => {
      nextError = err;
    },
    subscribe: (uid, ids) =>
      source.langgananPresensiPraktikan(uid, ids, (data) => snapshots.push(data)),
    latest: () => snapshots.at(-1),
    count: () => snapshots.length,
    emit: (listener, data, fromCache = false, hasPendingWrites = false) =>
      listener.next({
        exists: () => data !== null,
        data: () => data,
        metadata: { fromCache, hasPendingWrites },
      }),
  };
}

function labHarness(react) {
  const listeners = [];
  const snapshots = [];
  const firestore = {
    doc: (_db, ...parts) => ({ path: parts.join("/") }),
    onSnapshot: (ref, options, next, error) => {
      const listener = { ref, options, next, error, active: true, stops: 0 };
      listeners.push(listener);
      return () => {
        listener.active = false;
        listener.stops += 1;
      };
    },
  };
  const source = loadSource("src/hooks/useLabSesi.ts", {
    ...(react ? { react } : {}),
    "@react-native-firebase/firestore": firestore,
    "../lib/firebase": { db: {} },
    "../lib/errors": errors,
  });
  return {
    ...source,
    listeners,
    subscribe: (labId) => source.langgananLabSesi(labId, (data) => snapshots.push(data)),
    latest: () => snapshots.at(-1),
    count: () => snapshots.length,
    emit: (listener, data, fromCache = false) =>
      listener.next({
        exists: () => data !== null,
        data: () => data,
        metadata: { fromCache },
      }),
  };
}

test("catatPresensiPraktikan meneruskan koordinat dan catatan ke Cloud Function callable", async () => {
  const h = presensiHarness();
  await h.catatPresensiPraktikan(request);
  assert.deepEqual(h.calls, [
    { sessionId: "satu", catatan: "catatan saya", koordinat: koordinatDalam },
  ]);
});

test("catatan kosong otomatis diisi default 'Hadir' agar tetap opsional di UI", async () => {
  const h = presensiHarness();
  await h.catatPresensiPraktikan({ ...request, catatan: "   " });
  assert.deepEqual(h.calls, [
    { sessionId: "satu", catatan: "Hadir", koordinat: koordinatDalam },
  ]);
});

test("ID tidak valid, catatan terlalu panjang, dan koordinat belum siap ditolak sebelum panggil server", async () => {
  const kasusInvalid = [
    { ...request, sesiId: "a/b" },
    { ...request, uid: "" },
    { ...request, catatan: "a".repeat(501) },
    { ...request, koordinat: { latitude: -6.97, longitude: 107.63, akurasiMeter: null } },
    { ...request, koordinat: { latitude: Number.NaN, longitude: 107.63, akurasiMeter: 10 } },
  ];
  for (const input of kasusInvalid) {
    const h = presensiHarness();
    await assert.rejects(h.catatPresensiPraktikan(input));
    assert.equal(h.calls.length, 0);
  }
});

test("penolakan server (ganda/di luar radius/offline) diteruskan tanpa dianggap sukses", async () => {
  const h = presensiHarness();
  const err = Object.assign(new Error("Presensi untuk sesi ini sudah tercatat."), {
    code: "already-exists",
  });
  h.setNextError(err);
  await assert.rejects(h.catatPresensiPraktikan(request), /sudah tercatat/);
  assert.equal(h.calls.length, 1);
});

test("listener pribadi tidak membaca koleksi atau UID peserta lain", () => {
  const h = presensiHarness();
  h.subscribe("praktikan-a", ["satu", "dua", "satu"]);
  assert.deepEqual(
    h.listeners.map((item) => item.ref.path),
    ["sessions/dua/attendance/praktikan-a", attendancePath],
  );
  h.emit(h.listeners[0], null);
  assert.equal(h.latest().loading, true);
  h.emit(h.listeners[1], { ...record, uid: "uid-yang-salah" });
  assert.equal(h.latest().loading, false);
  assert.equal(h.latest().catatan.size, 1);
  assert.equal(h.latest().catatan.get("satu").uid, "praktikan-a");
});

test("tanpa UID atau sesi tidak membuat listener", () => {
  for (const [uid, ids] of [
    [undefined, ["satu"]],
    ["praktikan-a", []],
  ]) {
    const h = presensiHarness();
    h.subscribe(uid, ids);
    assert.equal(h.listeners.length, 0);
    assert.equal(h.latest().loading, false);
  }
});

test("metadata memisahkan cache, write tertunda, dan konfirmasi server", () => {
  const h = presensiHarness();
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
  const h = presensiHarness();
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
  const h = presensiHarness();
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
    data: {
      catatan: new Map([["satu", record]]),
      tertunda: new Set(),
      loading: false,
      error: null,
      dariCache: false,
    },
  };
  let calls = 0;
  const h = presensiHarness({
    useState: () => [calls++ % 2 === 0 ? 0 : oldState, () => {}],
    useEffect: () => {},
    useCallback: (callback) => callback,
  });
  for (const [uid, ids] of [
    ["praktikan-b", ["satu"]],
    ["praktikan-a", ["dua"]],
    [undefined, ["satu"]],
  ]) {
    const result = h.usePresensiPraktikan(uid, ids);
    assert.equal(result.catatan.size, 0);
    assert.equal(result.loading, Boolean(uid));
  }
  assert.equal(h.usePresensiPraktikan("praktikan-a", ["satu"]).catatan.size, 1);
  assert.equal(h.listeners.length, 0);
});

test("useLabSesi melanggan dokumen lab real-time, menyertakan perubahan radius, dan membersihkan listener", () => {
  const h = labHarness();
  const stop = h.subscribe("lab-1");
  assert.equal(h.listeners.length, 1);
  assert.equal(h.listeners[0].ref.path, "labs/lab-1");
  assert.equal(h.latest().loading, true);

  h.emit(h.listeners[0], { ...labDefault, radiusMeter: 30 }, false);
  assert.equal(h.latest().loading, false);
  assert.equal(h.latest().lab.radiusMeter, 30);

  // Asisten memperbesar radius -> langsung terbarui tanpa reload.
  h.emit(h.listeners[0], { ...labDefault, radiusMeter: 100 }, false);
  assert.equal(h.latest().lab.radiusMeter, 100);

  stop();
  stop();
  assert.equal(h.listeners[0].stops, 1);
  const count = h.count();
  h.emit(h.listeners[0], { ...labDefault, radiusMeter: 200 }, false);
  assert.equal(h.count(), count);
});

test("useLabSesi menolak labId kosong atau tidak valid tanpa membuka listener", () => {
  for (const labId of [undefined, "", "  ", "lab/1"]) {
    const h = labHarness();
    h.subscribe(labId);
    assert.equal(h.listeners.length, 0);
    assert.equal(h.latest().lab, null);
    assert.equal(h.latest().loading, false);
  }
});

test("evaluasiPresensiLokasi mengizinkan presensi hanya saat sesi DIBUKA, online, dan dalam radius", () => {
  const base = {
    sesi: session,
    presensi: undefined,
    presensiLoading: false,
    presensiError: null,
    dariCache: false,
    lab: labDefault,
    labLoading: false,
    labError: null,
    lokasi: { koordinat: koordinatDalam, akurasiMeter: 15, status: "siap" },
    lokasiTimeout: false,
    cekDalamRadius: geo.cekDalamRadius,
  };

  const siap = util.evaluasiPresensiLokasi(base);
  assert.equal(siap.kode, "dalam_radius");
  assert.equal(siap.bisaPresensi, true);
  assert.equal(siap.dalamRadius, true);
  assert.equal(siap.pesanNonaktif, undefined);
  assert.ok(siap.jarakMeter <= 50);

  const diLuar = util.evaluasiPresensiLokasi({
    ...base,
    lokasi: { koordinat: koordinatLuar, akurasiMeter: 12, status: "siap" },
  });
  assert.equal(diLuar.kode, "di_luar_radius");
  assert.equal(diLuar.bisaPresensi, false);
  assert.equal(diLuar.dalamRadius, false);
  assert.equal(diLuar.aksiLokasi, "coba_lagi_lokasi");
  assert.match(diLuar.pesanNonaktif, /di luar radius/i);

  const offline = util.evaluasiPresensiLokasi({ ...base, dariCache: true });
  assert.equal(offline.kode, "offline");
  assert.equal(offline.bisaPresensi, false);
  assert.equal(offline.dalamRadius, true);
  assert.equal(offline.aksiLokasi, "coba_lagi_lab");
});

test("evaluasiPresensiLokasi menangani seluruh kondisi perangkat SRS-15 dan batas akurasi 250 m", () => {
  const base = {
    sesi: session,
    presensi: undefined,
    presensiLoading: false,
    presensiError: null,
    dariCache: false,
    lab: labDefault,
    labLoading: false,
    labError: null,
    lokasi: { koordinat: null, akurasiMeter: null, status: "memuat" },
    lokasiTimeout: false,
    cekDalamRadius: geo.cekDalamRadius,
  };

  const ditolak = util.evaluasiPresensiLokasi({
    ...base,
    lokasi: { koordinat: null, akurasiMeter: null, status: "izin_ditolak" },
  });
  assert.equal(ditolak.kode, "izin_ditolak");
  assert.equal(ditolak.bisaPresensi, false);
  assert.equal(ditolak.aksiLokasi, "minta_izin_dan_pengaturan");

  const gpsMati = util.evaluasiPresensiLokasi({
    ...base,
    lokasi: { koordinat: null, akurasiMeter: null, status: "layanan_mati" },
  });
  assert.equal(gpsMati.kode, "layanan_mati");
  assert.equal(gpsMati.bisaPresensi, false);
  assert.equal(gpsMati.aksiLokasi, "pengaturan_dan_coba_lagi");

  const memuat = util.evaluasiPresensiLokasi(base);
  assert.equal(memuat.kode, "lokasi_memuat");
  assert.equal(memuat.bisaPresensi, false);
  assert.equal(memuat.aksiLokasi, "none");

  const timeout = util.evaluasiPresensiLokasi({ ...base, lokasiTimeout: true });
  assert.equal(timeout.kode, "lokasi_timeout");
  assert.equal(timeout.bisaPresensi, false);
  assert.equal(timeout.aksiLokasi, "coba_lagi_lokasi");

  const akurasiBuruk = util.evaluasiPresensiLokasi({
    ...base,
    lokasi: {
      koordinat: { ...koordinatDalam, akurasiMeter: 260 },
      akurasiMeter: 260,
      status: "siap",
    },
  });
  assert.equal(akurasiBuruk.kode, "akurasi_rendah");
  assert.equal(akurasiBuruk.bisaPresensi, false);
  assert.equal(akurasiBuruk.aksiLokasi, "coba_lagi_lokasi");

  const tanpaLab = util.evaluasiPresensiLokasi({
    ...base,
    sesi: { ...session, labId: undefined },
    lab: null,
  });
  assert.equal(tanpaLab.kode, "lab_belum_diatur");
  assert.equal(tanpaLab.bisaPresensi, false);

  const sudahHadir = util.evaluasiPresensiLokasi({ ...base, presensi: record });
  assert.equal(sudahHadir.kode, "sudah_presensi");
  assert.equal(sudahHadir.bisaPresensi, false);
});

test("formatter jarak dan waktu menangani batas angka serta nilai tidak valid dengan aman", () => {
  assert.equal(util.formatJarakMeter(12), "12 m");
  assert.equal(util.formatJarakMeter(12.46), "12,5 m");
  assert.equal(util.formatJarakMeter(50.04, 50), "50,1 m");
  assert.equal(util.formatJarakMeter(1250), "1,25 km");
  assert.equal(util.formatJarakMeter(null), "Belum tersedia");
  assert.equal(util.formatJarakMeter(-5), "Belum tersedia");
  assert.equal(util.ambilLabIdSesi({ ...session, labId: " lab-e301 " }), "lab-e301");
  assert.equal(util.ambilLabIdSesi({ ...session, labId: "a/b" }), undefined);

  for (const value of [
    null,
    undefined,
    {},
    "bukan tanggal",
    { toDate: () => new Date(NaN) },
    { toDate: () => { throw new Error(); } },
  ]) {
    assert.equal(util.formatWaktuPresensiPraktikan(value), "Waktu server belum tersedia");
  }
  assert.match(
    util.formatWaktuPresensiPraktikan({ toDate: () => new Date("2026-11-14T01:00:00Z") }),
    /2026.*08[.:]00.*WIB/,
  );
});
