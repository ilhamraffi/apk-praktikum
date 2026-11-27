// src/lib/backend.ts
// Helper komunikasi aman ke backend serverless Vercel memakai Firebase ID Token.
// Secret key (Midtrans, Firebase Admin) tidak pernah ada di aplikasi React Native.
import { auth } from "./firebase";

const TIMEOUT_MS = 20_000;

export function ambilUrlBackend(): string | null {
  const raw = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export async function panggilBackend<T>(
  jalur: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const baseUrl = ambilUrlBackend();
  if (!baseUrl) {
    throw new Error(
      "Layanan server belum dikonfigurasi (EXPO_PUBLIC_BACKEND_URL kosong). Hubungi PM.",
    );
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("Silakan masuk terlebih dahulu.");
  }

  const idToken = await user.getIdToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${jalur}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const teks = await response.text();
    let json: Record<string, unknown> = {};
    if (teks) {
      try {
        json = JSON.parse(teks) as Record<string, unknown>;
      } catch {
        json = {};
      }
    }

    if (!response.ok) {
      const pesan =
        typeof json.error === "string" && json.error.trim()
          ? json.error.trim()
          : typeof json.message === "string" && json.message.trim()
            ? json.message.trim()
            : `Permintaan server gagal (HTTP ${response.status}).`;
      const err = new Error(pesan) as Error & { code?: string };
      if (typeof json.code === "string") err.code = json.code;
      throw err;
    }

    return json as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Koneksi ke server melewati batas waktu. Coba lagi.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
