import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const waktuSesi = loadSource("src/utils/waktuSesi.ts");
const aktivitas = loadSource("src/utils/aktivitasLab.ts", {
  "./waktuSesi": waktuSesi,
});

const labA = {
  id: "lab-a",
  nama: "Lab Komputer 1",
  gedung: "Gedung E",
  latitude: -6.8915,
  longitude: 107.6107,
  radiusMeter: 50,
};

const mapKelas = new Map([
  ["k-a", { id: "k-a", nama: "Pemrograman Web", kode: "IF-A", pesertaUids: [] }],
  ["k-b", { id: "k-b", nama: "Struktur Data", kode: "IF-B", pesertaUids: [] }],
]);

test("SRS-13: ringkasAktivitasLab memilih sesi DIBUKA sebagai berlangsung dan BELUM_DIBUKA terdekat sebagai berikutnya", () => {
  const sekarang = new Date(2026, 10, 19, 9, 0);
  const daftarSesi = [
    {
      id: "s-tutup",
      classId: "k-a",
      labId: "lab-a",
      namaPraktikum: "Pemrograman Web",
      modul: "Pertemuan 1",
      mulai: new Date(2026, 10, 12, 8, 0),
      selesai: new Date(2026, 10, 12, 10, 0),
      ruangan: "Lab Komputer 1",
      status: "DITUTUP",
    },
    {
      id: "s-buka",
      classId: "k-a",
      labId: "lab-a",
      namaPraktikum: "Pemrograman Web",
      modul: "Pertemuan 2",
      mulai: new Date(2026, 10, 19, 8, 0),
      selesai: new Date(2026, 10, 19, 10, 0),
      ruangan: "Lab Komputer 1",
      status: "DIBUKA",
    },
    {
      id: "s-nanti-2",
      classId: "k-b",
      labId: "lab-a",
      namaPraktikum: "Struktur Data",
      modul: "Pertemuan 4",
      mulai: new Date(2026, 10, 20, 13, 0),
      selesai: new Date(2026, 10, 20, 15, 0),
      ruangan: "Lab Komputer 1",
      status: "BELUM_DIBUKA",
    },
    {
      id: "s-nanti-1",
      classId: "k-b",
      labId: "lab-a",
      namaPraktikum: "Struktur Data",
      modul: "Pertemuan 3",
      mulai: new Date(2026, 10, 19, 13, 0),
      selesai: new Date(2026, 10, 19, 15, 0),
      ruangan: "Lab Komputer 1",
      status: "BELUM_DIBUKA",
    },
    {
      id: "s-lab-lain",
      classId: "k-a",
      labId: "lab-b",
      namaPraktikum: "Pemrograman Web",
      modul: "Pertemuan 2",
      mulai: new Date(2026, 10, 19, 8, 0),
      ruangan: "Lab Komputer 2",
      status: "DIBUKA",
    },
  ];

  const hasil = aktivitas.ringkasAktivitasLab(labA, daftarSesi, mapKelas, sekarang);
  assert.equal(hasil.totalSesi, 4);
  assert.deepEqual(
    hasil.berlangsung.map((item) => item.sesi.id),
    ["s-buka"],
  );
  assert.equal(hasil.berlangsung[0].kelasLabel, "Pemrograman Web (IF-A)");
  assert.equal(hasil.berikutnya?.sesi.id, "s-nanti-1");
  assert.equal(hasil.berikutnya?.kelasLabel, "Struktur Data (IF-B)");
});

test("SRS-13: sesi lama tanpa labId tetap cocok melalui nama ruangan", () => {
  const daftarSesi = [
    {
      id: "s-lama",
      classId: "k-a",
      namaPraktikum: "Pemrograman Web",
      modul: "Modul Lama",
      ruangan: "lab komputer 1",
      status: "BELUM_DIBUKA",
    },
  ];
  const hasil = aktivitas.ringkasAktivitasLab(labA, daftarSesi, mapKelas);
  assert.equal(hasil.totalSesi, 1);
  assert.equal(hasil.berikutnya?.sesi.id, "s-lama");
});

test("SRS-14: ambilRuteNotifikasi memvalidasi payload route dari Cloud Functions", () => {
  assert.equal(
    aktivitas.ambilRuteNotifikasi({ data: { route: "/praktikan/sesi-123" } }),
    "/praktikan/sesi-123",
  );
  assert.equal(
    aktivitas.ambilRuteNotifikasi({ data: { route: "/praktikan/izin" } }),
    "/praktikan/izin",
  );
  assert.equal(
    aktivitas.ambilRuteNotifikasi({ data: { route: "/peta" } }),
    "/peta",
  );
  for (const tidakValid of [
    null,
    undefined,
    {},
    { data: {} },
    { data: { route: "" } },
    { data: { route: "https://evil.example.com" } },
    { data: { route: "/../../etc/passwd" } },
    { data: { route: "/rute-asing/123" } },
  ]) {
    assert.equal(aktivitas.ambilRuteNotifikasi(tidakValid), null);
  }
});

test("SRS-12: proyeksikanTitikKeKanvas menempatkan pusat di tengah (50%, 50%) dan menjaga batas kanvas", () => {
  const pusat = { latitude: -6.8915, longitude: 107.6107 };
  assert.deepEqual(aktivitas.proyeksikanTitikKeKanvas(pusat, pusat, 250), {
    xPersen: 50,
    yPersen: 50,
  });

  const utaraTimur = aktivitas.proyeksikanTitikKeKanvas(
    { latitude: -6.8905, longitude: 107.6117 },
    pusat,
    250,
  );
  assert.ok(utaraTimur.xPersen > 50 && utaraTimur.xPersen <= 92);
  assert.ok(utaraTimur.yPersen < 50 && utaraTimur.yPersen >= 10);

  const sangatJauh = aktivitas.proyeksikanTitikKeKanvas(
    { latitude: -6.0, longitude: 108.5 },
    pusat,
    250,
  );
  assert.equal(sangatJauh.xPersen, 92);
  assert.equal(sangatJauh.yPersen, 10);

  const infoOsm = aktivitas.hitungTileOsmKanvas(pusat, 250, 360, 310);
  assert.equal(infoOsm.zoom, 17);
  assert.equal(infoOsm.tiles.length, 9);
  assert.ok(infoOsm.tiles.every((t) => t.url.includes("tile.openstreetmap.org/17/")));
});
