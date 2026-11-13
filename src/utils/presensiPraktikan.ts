// Utilitas fitur praktikan — milik Fauzan.
export const BATAS_CATATAN_PRESENSI = 500;

export function validasiCatatanPresensi(nilai: string): string {
  const catatan = nilai.trim();
  if (catatan.length > BATAS_CATATAN_PRESENSI) {
    throw new Error(`Catatan maksimal ${BATAS_CATATAN_PRESENSI} karakter.`);
  }
  return catatan;
}

export function formatWaktuPresensiPraktikan(nilai: unknown): string {
  const kosong = "Waktu server belum tersedia";
  try {
    let tanggal: Date;
    if (nilai && typeof nilai === "object" && "toDate" in nilai && typeof nilai.toDate === "function") {
      tanggal = nilai.toDate();
    } else if (typeof nilai === "string") {
      if (/^([01]\d|2[0-3])[:.][0-5]\d(?:[:.][0-5]\d)?(?:\s+(?:WIB|WITA|WIT))?$/i.test(nilai.trim())) {
        return nilai.trim();
      }
      if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(nilai)) return kosong;
      tanggal = new Date(nilai);
    } else {
      return kosong;
    }
    if (!(tanggal instanceof Date) || !Number.isFinite(tanggal.getTime())) return kosong;
    return tanggal.toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: "Asia/Jakarta",
    }) + " WIB";
  } catch {
    return kosong;
  }
}
