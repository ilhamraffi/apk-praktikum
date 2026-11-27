// src/lib/presensi.ts
// Satu-satunya jalur Sprint 3 & 4 untuk menulis attendance.
// Jika EXPO_PUBLIC_BACKEND_URL diatur (Vercel), pemanggilan melewati endpoint HTTPS
// backend; jika kosong, tetap fallback ke Firebase Functions callable.
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import type { Koordinat, StatusKetepatan } from "../types";
import { ambilUrlBackend, panggilBackend } from "./backend";

interface CatatPresensiRequest {
  sessionId: string;
  catatan: string;
  koordinat: Koordinat;
  kodePresensi?: string;
}

export interface CatatPresensiResponse {
  jarakMeter: number;
  radiusMeter: number;
  statusKetepatan?: StatusKetepatan;
  terlambatMenit?: number;
  fineId?: string | null;
  nominalDenda?: number;
}

/** Satu-satunya jalur Sprint 3 & 4 untuk menulis attendance + hitung keterlambatan/denda. */
export async function catatPresensi(
  input: CatatPresensiRequest,
): Promise<CatatPresensiResponse> {
  if (!input.sessionId || input.sessionId.includes("/")) {
    throw new Error("Identitas sesi tidak valid.");
  }
  if (!input.catatan.trim()) {
    throw new Error("Catatan presensi wajib diisi.");
  }
  if (
    !Number.isFinite(input.koordinat.latitude) ||
    !Number.isFinite(input.koordinat.longitude) ||
    !Number.isFinite(input.koordinat.akurasiMeter ?? Number.NaN)
  ) {
    throw new Error("Lokasi perangkat belum tersedia.");
  }

  if (ambilUrlBackend()) {
    return panggilBackend<CatatPresensiResponse>("/api/presensi/catat", {
      ...input,
    });
  }

  const functions = getFunctions();
  const panggil = httpsCallable<
    CatatPresensiRequest,
    CatatPresensiResponse
  >(functions, "catatPresensi");
  const hasil = await panggil(input);
  return hasil.data;
}
