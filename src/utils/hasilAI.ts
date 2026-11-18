import type { PengajuanIzin } from "../types";

/** Label sentimen EDOM lama tetap dikenali agar dokumen izin lama tidak salah tampil. */
const LABEL_SENTIMEN = new Map([["positif", "Positif"], ["netral", "Netral"], ["negatif", "Negatif"]]);
const LABEL_KATEGORI = new Map([["sakit", "Sakit"], ["keluarga", "Keluarga"], ["keperluan", "Keperluan"]]);

const PENJELASAN_KATEGORI = "Model lokal menebak jenis alasan dari teks. Hasil ini tidak memverifikasi kebenaran alasan. Keputusan tetap ditentukan asisten.";
const PENJELASAN_SENTIMEN = "EDOM membaca sentimen teks. Hasil ini tidak memverifikasi kebenaran alasan. Keputusan tetap ditentukan asisten.";
const PENJELASAN_UMUM = "Klasifikasi hanya informasi pendukung. Keputusan tetap ditentukan asisten.";

/** Nilai kategori lama tetap ditampilkan tanpa diasumsikan sebagai sentimen. */
export function informasiHasilAI(pengajuan: Pick<PengajuanIzin, "kategoriAI" | "statusAI">) {
  const kategori = typeof pengajuan.kategoriAI === "string" ? pengajuan.kategoriAI.trim() : "";
  const kunci = kategori.toLowerCase();
  const sentimen = LABEL_SENTIMEN.get(kunci);
  const kategoriAlasan = LABEL_KATEGORI.get(kunci);
  const judul = sentimen ? "Sentimen AI (EDOM)" : "Kategori AI";
  const hasil = kategoriAlasan ?? sentimen ?? (kategori || (pengajuan.statusAI === "unknown_vocabulary"
    ? "Teks belum dapat dianalisis model."
    : pengajuan.statusAI === "failed" ? "Tidak tersedia. Pengajuan tetap dapat diperiksa."
      : pengajuan.statusAI === "not_requested" ? "Hasil analisis belum tersimpan. Gunakan analisis ulang."
        : pengajuan.statusAI === "processing" ? "Memproses..."
        : "Kategori belum tersedia. Pengajuan tetap dapat diperiksa."));
  const penjelasan = kategoriAlasan ? PENJELASAN_KATEGORI : sentimen ? PENJELASAN_SENTIMEN : PENJELASAN_UMUM;
  return { judul, hasil, penjelasan };
}
