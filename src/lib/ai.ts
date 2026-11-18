// Model kategori alasan lokal (sakit/keluarga/keperluan), tanpa HTTP/paket native.
// Kontrak Promise<string> dipertahankan untuk pemanggil pengajuan izin.
import model from "../ai/kategori/model-kategori.json";
import { createKategoriClassifier } from "../ai/kategori/classifier";

export class TeksTidakDikenaliKategori extends Error {
  constructor() {
    super("Teks belum dapat dikategorikan oleh model lokal. Pengajuan tetap dapat diperiksa asisten.");
    this.name = "TeksTidakDikenaliKategori";
  }
}

const LABEL_KATEGORI = new Set(["sakit", "keluarga", "keperluan"]);

let classify: ReturnType<typeof createKategoriClassifier> | undefined;

export async function klasifikasikanAlasan(alasan: string): Promise<string> {
  // Lazy singleton: model disiapkan sekali, tidak pada setiap render/pengajuan.
  classify ??= createKategoriClassifier(model);
  const prediction = classify(alasan);
  if (prediction.label === null || prediction.status !== "predicted") {
    throw new TeksTidakDikenaliKategori();
  }
  if (!LABEL_KATEGORI.has(prediction.label)) {
    throw new Error("Label model kategori tidak valid.");
  }
  return prediction.label;
}

/** @deprecated Nama lama sebelum model kategori; dipertahankan agar import lama tetap jalan. */
export const TeksTidakDikenaliEDOM = TeksTidakDikenaliKategori;
