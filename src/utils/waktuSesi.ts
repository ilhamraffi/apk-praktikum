// src/utils/waktuSesi.ts
// Helper waktu sesi: parsing input form, format tampilan, dan tanggal berulang.
// Murni JavaScript (tanpa paket native), jadi tidak perlu build ulang APK.
import type { Sesi } from "../types";

type PunyaToDate = { toDate: () => Date };

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const dua = (n: number) => String(n).padStart(2, "0");

/** Timestamp Firestore atau Date -> Date. Selain itu null. */
export function keDate(nilai: unknown): Date | null {
  if (nilai instanceof Date) return nilai;
  if (nilai && typeof (nilai as PunyaToDate).toDate === "function") {
    return (nilai as PunyaToDate).toDate();
  }
  return null;
}

/** "DD-MM-YYYY" (atau DD/MM/YYYY) -> bagian tanggal, null jika bukan tanggal kalender yang valid. */
export function parseTanggal(teks: string) {
  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(teks.trim());
  if (!m) return null;
  const hari = Number(m[1]);
  const bulan = Number(m[2]);
  const tahun = Number(m[3]);
  const cek = new Date(tahun, bulan - 1, hari);
  if (
    cek.getFullYear() !== tahun ||
    cek.getMonth() !== bulan - 1 ||
    cek.getDate() !== hari
  ) {
    return null;
  }
  return { tahun, bulan, hari };
}

/** "HH:MM" (atau HH.MM) -> jam dan menit, null jika tidak valid. */
export function parseJam(teks: string) {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(teks.trim());
  if (!m) return null;
  const jam = Number(m[1]);
  const menit = Number(m[2]);
  if (jam > 23 || menit > 59) return null;
  return { jam, menit };
}

/**
 * Mask input tanggal: hanya angka yang diterima, tanda "-" disisipkan otomatis
 * (ketik 20112026 -> 20-11-2026). Dipakai di onChangeText.
 */
export function maskTanggal(teks: string): string {
  const d = teks.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
}

/** Mask input jam: hanya angka, ":" disisipkan otomatis (ketik 0830 -> 08:30). */
export function maskJam(teks: string): string {
  const d = teks.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** Gabungkan teks tanggal dan jam (waktu perangkat) menjadi Date; null jika salah satunya tidak valid. */
export function gabungWaktu(tanggal: string, jam: string): Date | null {
  const t = parseTanggal(tanggal);
  const j = parseJam(jam);
  if (!t || !j) return null;
  return new Date(t.tahun, t.bulan - 1, t.hari, j.jam, j.menit, 0, 0);
}

export const formatTanggalInput = (d: Date) =>
  `${dua(d.getDate())}-${dua(d.getMonth() + 1)}-${d.getFullYear()}`;

export const formatJamInput = (d: Date) =>
  `${dua(d.getHours())}:${dua(d.getMinutes())}`;

/** Geser tanggal sebanyak `minggu` minggu; jam tetap sama. */
export function tambahMinggu(d: Date, minggu: number): Date {
  const hasil = new Date(d.getTime());
  hasil.setDate(hasil.getDate() + 7 * minggu);
  return hasil;
}

/** Contoh: "Kamis, 20 Nov 2026". */
export const formatTanggalPanjang = (d: Date) =>
  `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;

/**
 * Teks waktu untuk tampilan. Sesi baru memakai `mulai`/`selesai`;
 * sesi lama (belum punya `mulai`) jatuh kembali ke teks `waktu` lama.
 */
export function teksWaktuSesi(
  sesi: Pick<Sesi, "mulai" | "selesai" | "waktu">,
): string {
  const mulai = keDate(sesi.mulai);
  if (!mulai) return sesi.waktu?.trim() || "Belum tersedia";
  const selesai = keDate(sesi.selesai);
  const jam =
    formatJamInput(mulai) + (selesai ? ` - ${formatJamInput(selesai)}` : "");
  return `${formatTanggalPanjang(mulai)}, ${jam}`;
}

/** Pembanding urutan jadwal: tanggal mulai naik; sesi lama (tanpa mulai) di akhir. */
export function urutkanSesi(
  a: Pick<Sesi, "mulai" | "namaPraktikum" | "modul">,
  b: Pick<Sesi, "mulai" | "namaPraktikum" | "modul">,
): number {
  const ma = keDate(a.mulai)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const mb = keDate(b.mulai)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (ma !== mb) return ma < mb ? -1 : 1;
  return (
    (a.namaPraktikum ?? "").localeCompare(b.namaPraktikum ?? "") ||
    (a.modul ?? "").localeCompare(b.modul ?? "")
  );
}