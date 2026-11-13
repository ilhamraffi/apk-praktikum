// src/components/asisten/dataRekapPresensi.ts
import type { CatatanPresensi } from "../../types";

function teks(nilai: unknown): string {
  return typeof nilai === "string" ? nilai.trim() : "";
}

export interface RekapPresensi {
  catatan: { key: string; presensi: CatatanPresensi }[];
  jumlahHadir: number;
  jumlahIzin: number;
  total: number | null;
  persentase: number | null;
  jumlahDiabaikan: number;
}

export function hitungRekapPresensi(
  presensi: readonly CatatanPresensi[],
  totalPraktikan: number,
): RekapPresensi {
  const userIds = new Set<string>();
  const nims = new Set<string>();
  const catatan: { key: string; presensi: CatatanPresensi }[] = [];
  let jumlahDiabaikan = 0;

  for (const item of presensi) {
    const userId = teks(item?.uid);
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

/** Format waktu presensi (menerima Timestamp Firestore atau string). */
export function formatWaktuPresensi(nilai: unknown): string {
  // Timestamp Firestore (objek dengan toDate()).
  if (nilai && typeof nilai === "object" && typeof (nilai as { toDate?: unknown }).toDate === "function") {
    const tanggal = (nilai as { toDate(): Date }).toDate();
    if (!Number.isFinite(tanggal.getTime())) return "Waktu tidak tersedia";
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
