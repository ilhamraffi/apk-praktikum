// Utilitas pemeriksaan izin — milik Fauzan. Tidak mengubah kontrak bersama.
import type { PengajuanIzin, StatusIzin } from "../types";

export type KeputusanIzin = Exclude<StatusIzin, "pending">;
export const LABEL_STATUS_IZIN: Record<StatusIzin, string> = {
  pending: "Menunggu", approved: "Diterima", rejected: "Ditolak",
};

export function idIzinValid(nilai: unknown): nilai is string {
  return typeof nilai === "string" && Boolean(nilai.trim()) && !nilai.includes("/") && nilai !== "." && nilai !== "..";
}

export function teksIzin(nilai: unknown, pengganti: string): string {
  return typeof nilai === "string" && nilai.trim() ? nilai.trim() : pengganti;
}

/** Validasi batas baca agar dokumen rusak tidak menjadi keputusan atau crash JSX. */
export function bacaPengajuanIzin(id: string, nilai: unknown): PengajuanIzin & { id: string } {
  const data = nilai as Partial<PengajuanIzin> | undefined;
  if (!idIzinValid(id) || !data || !idIzinValid(data.uid) || !idIzinValid(data.sessionId)
    || typeof data.alasan !== "string" || !data.alasan.trim()
    || (data.status !== "pending" && data.status !== "approved" && data.status !== "rejected")) {
    throw new Error("Data pengajuan izin tidak lengkap atau tidak valid. Hubungi pengelola aplikasi.");
  }
  return {
    id, uid: data.uid, sessionId: data.sessionId, alasan: data.alasan,
    status: data.status,
    kategoriAI: typeof data.kategoriAI === "string" ? data.kategoriAI : null,
    statusAI: typeof data.statusAI === "string" ? data.statusAI : null,
    diputuskanOleh: typeof data.diputuskanOleh === "string" ? data.diputuskanOleh : null,
    dibuatPada: data.dibuatPada ?? null,
    diputuskanPada: data.diputuskanPada ?? null,
  };
}

/** AI boleh selesai belakangan; perubahan alasan/pemilik/sesi wajib diperiksa ulang. */
export function isiIzinSama(a: PengajuanIzin, b: PengajuanIzin): boolean {
  return a.id === b.id && a.uid === b.uid && a.sessionId === b.sessionId && a.alasan === b.alasan;
}

function tanggalIzin(nilai: unknown): Date | null {
  try {
    let tanggal: unknown = null;
    if (nilai && typeof nilai === "object" && "toDate" in nilai && typeof nilai.toDate === "function") {
      tanggal = nilai.toDate();
    } else if (typeof nilai === "string" && /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(nilai)) {
      tanggal = new Date(nilai);
    }
    return tanggal instanceof Date && Number.isFinite(tanggal.getTime()) ? tanggal : null;
  } catch {
    return null;
  }
}

export function urutkanIzin(daftar: PengajuanIzin[]): PengajuanIzin[] {
  return [...daftar].sort((a, b) =>
    (tanggalIzin(b.dibuatPada)?.getTime() ?? 0) - (tanggalIzin(a.dibuatPada)?.getTime() ?? 0)
    || (a.id ?? "").localeCompare(b.id ?? ""));
}

export function formatWaktuIzin(nilai: unknown): string {
  const tanggal = tanggalIzin(nilai);
  if (!tanggal) return "Waktu server belum tersedia";
  return tanggal.toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "Asia/Jakarta",
  }) + " WIB";
}
