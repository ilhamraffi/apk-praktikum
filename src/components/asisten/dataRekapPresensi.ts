import type { AttendanceRecord } from "../../context/DataSistem";

function teks(nilai: unknown): string {
  return typeof nilai === "string" ? nilai.trim() : "";
}

export function hitungRekapPresensi(
  presensi: readonly AttendanceRecord[],
  totalPraktikan: number,
) {
  const userIds = new Set<string>();
  const nims = new Set<string>();
  const catatan: { key: string; presensi: AttendanceRecord }[] = [];
  let jumlahDiabaikan = 0;

  for (const item of presensi) {
    const userId = teks(item?.userId);
    const nim = teks(item?.nim);
    const statusValid =
      item?.statusKehadiran === "Hadir" || item?.statusKehadiran === "Izin";

    if (
      !statusValid ||
      (!userId && !nim) ||
      (userId && userIds.has(userId)) ||
      (nim && nims.has(nim))
    ) {
      jumlahDiabaikan++;
      continue;
    }

    // Context hanya mengizinkan satu presensi. Pertahankan catatan valid pertama.
    if (userId) userIds.add(userId);
    if (nim) nims.add(nim);
    catatan.push({
      key: userId ? `user:${userId}` : `nim:${nim}`,
      presensi: item,
    });
  }

  const jumlahHadir = catatan.filter(
    ({ presensi: item }) => item.statusKehadiran === "Hadir",
  ).length;
  const jumlahIzin = catatan.length - jumlahHadir;
  const total =
    Number.isSafeInteger(totalPraktikan) && totalPraktikan >= 0
      ? totalPraktikan
      : null;
  const persentase =
    total !== null && total > 0 ? Math.round((jumlahHadir / total) * 100) : null;

  return { catatan, jumlahHadir, jumlahIzin, total, persentase, jumlahDiabaikan };
}

export function formatWaktuPresensi(nilai: string | null | undefined): string {
  const waktu = teks(nilai);
  const jam = waktu.match(
    /^([01]\d|2[0-3])[:.]([0-5]\d)(?:[:.]([0-5]\d))?(?:\s+(WIB|WITA|WIT))?$/i,
  );

  if (jam) {
    const detik = jam[3] ? `:${jam[3]}` : "";
    const zona = jam[4]?.toUpperCase() || "(zona waktu tidak tersedia)";
    return `${jam[1]}:${jam[2]}${detik} ${zona}`;
  }

  // Timestamp ISO harus menyertakan zona; jangan menebak zona waktu perangkat.
  const iso = waktu.match(
    /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i,
  );
  if (!iso) return "Waktu tidak tersedia";

  const tahun = Number(iso[1]);
  const bulan = Number(iso[2]);
  const hari = Number(iso[3]);
  const kalender = new Date(Date.UTC(tahun, bulan - 1, hari));
  const tanggal = new Date(waktu);
  if (
    kalender.getUTCFullYear() !== tahun ||
    kalender.getUTCMonth() !== bulan - 1 ||
    kalender.getUTCDate() !== hari ||
    !Number.isFinite(tanggal.getTime())
  ) {
    return "Waktu tidak tersedia";
  }

  return (
    tanggal
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      })
      .replace(/\./g, ":") + " WIB"
  );
}