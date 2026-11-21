// src/utils/ringkasanSesi.ts
// Fungsi murni untuk beranda: sapaan sesuai jam, tanggal lengkap, dan ringkasan sesi.
import type { Sesi } from "../types";
import { keDate } from "./waktuSesi";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Pagi 04-10, siang 11-14, sore 15-17, malam 18-03. */
export function sapaanWaktu(sekarang: Date): string {
  const jam = sekarang.getHours();
  if (jam >= 4 && jam < 11) return "Selamat pagi";
  if (jam >= 11 && jam < 15) return "Selamat siang";
  if (jam >= 15 && jam < 18) return "Selamat sore";
  return "Selamat malam";
}

/** Contoh: "Kamis, 19 November 2026". */
export function tanggalLengkap(tanggal: Date): string {
  return `${HARI[tanggal.getDay()]}, ${tanggal.getDate()} ${BULAN[tanggal.getMonth()]} ${tanggal.getFullYear()}`;
}

/** Kata pertama nama, untuk sapaan. Nama kosong -> teks kosong. */
export function namaDepan(nama: string | undefined | null): string {
  return (nama ?? "").trim().split(/\s+/)[0] ?? "";
}

function sama(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export type RingkasanSesi = { hariIni: number; dibuka: number; total: number };

/** Jumlah sesi hari ini (menurut `mulai`), sesi yang sedang dibuka, dan seluruh sesi. */
export function ringkasSesi(
  daftar: Pick<Sesi, "mulai" | "status">[],
  sekarang: Date,
): RingkasanSesi {
  let hariIni = 0;
  let dibuka = 0;
  for (const sesi of daftar) {
    if (sesi.status === "DIBUKA") dibuka += 1;
    const mulai = keDate(sesi.mulai);
    if (mulai && sama(mulai, sekarang)) hariIni += 1;
  }
  return { hariIni, dibuka, total: daftar.length };
}