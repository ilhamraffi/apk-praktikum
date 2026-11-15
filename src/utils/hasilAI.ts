import type { PengajuanIzin } from "../types";

const LABEL_SENTIMEN = new Map([["positif", "Positif"], ["netral", "Netral"], ["negatif", "Negatif"]]);

/** Nilai kategori lama tetap ditampilkan tanpa diasumsikan sebagai sentimen. */
export function informasiHasilAI(pengajuan: Pick<PengajuanIzin, "kategoriAI" | "statusAI">) {
  const kategori = typeof pengajuan.kategoriAI === "string" ? pengajuan.kategoriAI.trim() : "";
  const sentimen = LABEL_SENTIMEN.get(kategori.toLowerCase());
  const judul = sentimen || pengajuan.statusAI === "unknown_vocabulary" ? "Sentimen AI (EDOM)" : "Kategori AI";
  const hasil = sentimen ?? (kategori || (pengajuan.statusAI === "unknown_vocabulary"
    ? "Teks belum dapat dianalisis model."
    : pengajuan.statusAI === "failed" ? "Tidak tersedia. Pengajuan tetap dapat diperiksa."
      : pengajuan.statusAI === "not_requested" ? "Hasil analisis belum tersimpan. Gunakan analisis ulang."
        : pengajuan.statusAI === "processing" ? "Memproses..."
        : "Kategori belum tersedia. Pengajuan tetap dapat diperiksa."));
  const penjelasan = sentimen || pengajuan.statusAI === "unknown_vocabulary"
    ? "EDOM membaca sentimen teks. Hasil ini tidak memverifikasi kebenaran alasan. Keputusan tetap ditentukan asisten."
    : "Klasifikasi hanya informasi pendukung. Keputusan tetap ditentukan asisten.";
  return { judul, hasil, penjelasan };
}
