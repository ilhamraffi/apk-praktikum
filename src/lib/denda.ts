// src/lib/denda.ts
// Kontrak PM Sprint 4 (SRS-21): perhitungan keterlambatan (grace period), ID tagihan
// deterministik, dan format nominal rupiah. Dipakai tampilan & diverifikasi ulang di backend.
import type { StatusKetepatan } from "../types";

export const GRACE_PERIOD_DEFAULT_MENIT = 15;
export const GRACE_PERIOD_MAKS_MENIT = 180;
export const NOMINAL_DENDA_DEFAULT = 5_000;
export const NOMINAL_DENDA_MAKS = 1_000_000;

export interface HasilKeterlambatan {
  statusKetepatan: StatusKetepatan;
  terlambat: boolean;
  terlambatMenit: number;
  batasTepatWaktu: Date | null;
}

function keTimestampMs(nilai: Date | number | { toDate?: () => Date } | null | undefined): number | null {
  if (nilai == null) return null;
  if (typeof nilai === "number") return Number.isFinite(nilai) ? nilai : null;
  if (nilai instanceof Date) {
    const ms = nilai.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof nilai === "object" && typeof nilai.toDate === "function") {
    try {
      const d = nilai.toDate();
      const ms = d instanceof Date ? d.getTime() : Number.NaN;
      return Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * ID tagihan deterministik per kejadian keterlambatan agar 1 sesi + 1 praktikan
 * tidak mungkin menghasilkan tagihan ganda.
 */
export function buatFineId(sessionId: string, uid: string): string {
  const s = sessionId.trim();
  const u = uid.trim();
  if (!s || !u || s.includes("/") || u.includes("/")) {
    throw new Error("Identitas sesi atau praktikan tidak valid untuk tagihan.");
  }
  return `${s}_${u}`;
}

/**
 * Menghitung ketepatan waktu terhadap `waktuMulaiSesi + gracePeriodMenit`.
 * Presensi sebelum atau tepat pada batas toleransi dianggap TEPAT_WAKTU.
 */
export function hitungKeterlambatan(
  waktuPresensi: Date | number | { toDate?: () => Date },
  waktuMulaiSesi: Date | number | { toDate?: () => Date } | null | undefined,
  gracePeriodMenit = GRACE_PERIOD_DEFAULT_MENIT,
): HasilKeterlambatan {
  const msPresensi = keTimestampMs(waktuPresensi);
  const msMulai = keTimestampMs(waktuMulaiSesi);
  if (msPresensi == null || msMulai == null) {
    return {
      statusKetepatan: "TEPAT_WAKTU",
      terlambat: false,
      terlambatMenit: 0,
      batasTepatWaktu: null,
    };
  }

  const toleransi = Number.isFinite(gracePeriodMenit)
    ? Math.max(0, Math.min(GRACE_PERIOD_MAKS_MENIT, gracePeriodMenit))
    : GRACE_PERIOD_DEFAULT_MENIT;
  const msBatas = msMulai + toleransi * 60_000;
  const batasTepatWaktu = new Date(msBatas);

  if (msPresensi <= msBatas) {
    return {
      statusKetepatan: "TEPAT_WAKTU",
      terlambat: false,
      terlambatMenit: 0,
      batasTepatWaktu,
    };
  }

  const selisihMs = msPresensi - msBatas;
  return {
    statusKetepatan: "TERLAMBAT",
    terlambat: true,
    terlambatMenit: Math.max(1, Math.ceil(selisihMs / 60_000)),
    batasTepatWaktu,
  };
}

export function formatRupiah(nominal: number | null | undefined): string {
  if (nominal == null || !Number.isFinite(nominal) || nominal < 0) {
    return "Rp0";
  }
  const bulat = Math.round(nominal);
  return `Rp${bulat.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
