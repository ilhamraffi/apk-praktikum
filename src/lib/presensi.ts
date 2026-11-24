import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import type { Koordinat } from "../types";

interface CatatPresensiRequest {
  sessionId: string;
  catatan: string;
  koordinat: Koordinat;
  kodePresensi?: string;
}

interface CatatPresensiResponse {
  jarakMeter: number;
  radiusMeter: number;
}

const functions = getFunctions();

/** Satu-satunya jalur Sprint 3 untuk menulis attendance. */
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

  const panggil = httpsCallable<
    CatatPresensiRequest,
    CatatPresensiResponse
  >(functions, "catatPresensi");
  const hasil = await panggil(input);
  return hasil.data;
}
