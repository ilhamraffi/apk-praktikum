import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const waktuSesi = loadSource("src/utils/waktuSesi.ts");
const r = loadSource("src/utils/ringkasanSesi.ts", { "./waktuSesi": waktuSesi });

test("sapaan mengikuti jam", () => {
  const at = (jam) => r.sapaanWaktu(new Date(2026, 10, 19, jam, 0));
  assert.equal(at(3), "Selamat malam");
  assert.equal(at(4), "Selamat pagi");
  assert.equal(at(10), "Selamat pagi");
  assert.equal(at(11), "Selamat siang");
  assert.equal(at(14), "Selamat siang");
  assert.equal(at(15), "Selamat sore");
  assert.equal(at(17), "Selamat sore");
  assert.equal(at(18), "Selamat malam");
  assert.equal(at(23), "Selamat malam");
});

test("tanggal lengkap memakai nama hari dan bulan penuh", () => {
  assert.equal(r.tanggalLengkap(new Date(2026, 10, 19)), "Kamis, 19 November 2026");
  assert.equal(r.tanggalLengkap(new Date(2027, 0, 1)), "Jumat, 1 Januari 2027");
});

test("nama depan = kata pertama, aman untuk nilai kosong", () => {
  assert.equal(r.namaDepan("  Nadia Putri Utami "), "Nadia");
  assert.equal(r.namaDepan(""), "");
  assert.equal(r.namaDepan(undefined), "");
  assert.equal(r.namaDepan(null), "");
});

test("ringkasan: sesi hari ini, dibuka, dan total", () => {
  const sekarang = new Date(2026, 10, 19, 9, 0);
  const daftar = [
    { status: "DIBUKA", mulai: new Date(2026, 10, 19, 8, 0) },
    { status: "BELUM_DIBUKA", mulai: { toDate: () => new Date(2026, 10, 19, 13, 0) } },
    { status: "DITUTUP", mulai: new Date(2026, 10, 18, 8, 0) },
    { status: "BELUM_DIBUKA", mulai: new Date(2026, 10, 26, 8, 0) },
    { status: "DIBUKA" }, // sesi lama tanpa mulai: tetap dihitung sebagai dibuka, bukan hari ini
  ];
  assert.deepEqual({ ...r.ringkasSesi(daftar, sekarang) }, { hariIni: 2, dibuka: 2, total: 5 });
  assert.deepEqual({ ...r.ringkasSesi([], sekarang) }, { hariIni: 0, dibuka: 0, total: 0 });
});