// EDOM dari materi pengajar: inferensi sentimen lokal, tanpa HTTP/paket native.
// Kontrak Promise<string> dipertahankan untuk pemanggil pengajuan izin.
import model from "../ai/edom/model-edom.json";
import { createSentimentClassifier } from "../ai/edom/sentiment";

export class TeksTidakDikenaliEDOM extends Error {
  constructor() {
    super("Teks belum dapat dianalisis oleh model EDOM. Pengajuan tetap dapat diperiksa asisten.");
    this.name = "TeksTidakDikenaliEDOM";
  }
}

let classify: ReturnType<typeof createSentimentClassifier> | undefined;

export async function klasifikasikanAlasan(alasan: string): Promise<string> {
  // Lazy singleton: model disiapkan sekali, tidak pada setiap render/pengajuan.
  classify ??= createSentimentClassifier(model);
  const prediction = classify(alasan);
  if (prediction.label === null || prediction.status !== "predicted") {
    throw new TeksTidakDikenaliEDOM();
  }
  if (!["positif", "netral", "negatif"].includes(prediction.label)) {
    throw new Error("Label model EDOM tidak valid.");
  }
  return prediction.label;
}
