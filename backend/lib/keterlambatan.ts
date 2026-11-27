// backend/lib/keterlambatan.ts
// Utilitas murni backend: hitung jarak Haversine, keterlambatan grace period,
// ID tagihan deterministik, dan format rupiah.

export const BATAS_AKURASI_METER = 250;
export const RADIUS_BUMI_METER = 6_371_000;
export const GRACE_PERIOD_DEFAULT_MENIT = 15;
export const GRACE_PERIOD_MAKS_MENIT = 180;
export const NOMINAL_DENDA_DEFAULT = 5_000;
export const NOMINAL_DENDA_MAKS = 1_000_000;

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function hitungJarakMeter(
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
): number {
  const rad = (deg: number) => deg * (Math.PI / 180);
  const dLat = rad(latB - latA);
  const dLng = rad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(latA)) * Math.cos(rad(latB)) * Math.sin(dLng / 2) ** 2;
  return RADIUS_BUMI_METER * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buatFineId(sessionId: string, uid: string): string {
  return `${sessionId}_${uid}`;
}

export function hitungKeterlambatanServer(
  msPresensi: number,
  msMulaiSesi: number | null,
  gracePeriodMenit: number,
): {
  statusKetepatan: "TEPAT_WAKTU" | "TERLAMBAT";
  terlambat: boolean;
  terlambatMenit: number;
} {
  if (msMulaiSesi == null || !Number.isFinite(msMulaiSesi)) {
    return { statusKetepatan: "TEPAT_WAKTU", terlambat: false, terlambatMenit: 0 };
  }
  const toleransi = Number.isFinite(gracePeriodMenit)
    ? Math.max(0, Math.min(GRACE_PERIOD_MAKS_MENIT, gracePeriodMenit))
    : GRACE_PERIOD_DEFAULT_MENIT;
  const msBatas = msMulaiSesi + toleransi * 60_000;
  if (msPresensi <= msBatas) {
    return { statusKetepatan: "TEPAT_WAKTU", terlambat: false, terlambatMenit: 0 };
  }
  return {
    statusKetepatan: "TERLAMBAT",
    terlambat: true,
    terlambatMenit: Math.max(1, Math.ceil((msPresensi - msBatas) / 60_000)),
  };
}

export function formatRupiah(nominal: number): string {
  const bulat = Math.max(0, Math.round(nominal));
  return `Rp${bulat.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
