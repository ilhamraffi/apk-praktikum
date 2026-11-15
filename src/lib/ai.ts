const BATAS_WAKTU_AI = 10_000;

interface ResponsAI {
  kategori?: unknown;
  category?: unknown;
  label?: unknown;
  result?: { kategori?: unknown; category?: unknown; label?: unknown };
}

function ambilKategori(data: ResponsAI): string | null {
  const nilai = data.kategori ?? data.category ?? data.label
    ?? data.result?.kategori ?? data.result?.category ?? data.result?.label;
  return typeof nilai === "string" && nilai.trim() ? nilai.trim() : null;
}

export async function klasifikasikanAlasan(alasan: string): Promise<string> {
  const endpoint = process.env.EXPO_PUBLIC_AI_API_URL?.trim();
  if (!endpoint) throw new Error("Endpoint klasifikasi AI belum dikonfigurasi.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BATAS_WAKTU_AI);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alasan }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Layanan AI mengembalikan HTTP ${response.status}.`);
    const data = await response.json() as ResponsAI;
    const kategori = ambilKategori(data);
    if (!kategori) throw new Error("Respons AI tidak memuat kategori.");
    return kategori;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Layanan AI tidak merespons dalam batas waktu.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
