// src/lib/pembayaran.ts
// Kontrak PM Sprint 4 (SRS-22 & SRS-23): satu-satunya pintu client untuk membuat
// transaksi pembayaran Midtrans Sandbox melalui backend Vercel.
import type { StatusPembayaran } from "../types";
import { panggilBackend } from "./backend";

export interface HasilTransaksiDenda {
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  status: StatusPembayaran;
}

export type JenisNotifikasiKegiatan =
  | "sesi_dibuka"
  | "jadwal_berubah"
  | "izin_diputuskan";

export interface PayloadNotifikasiKegiatan {
  jenis: JenisNotifikasiKegiatan;
  sessionId?: string;
  izinId?: string;
}

/** Membuat transaksi Midtrans Snap Sandbox di backend (tanpa secret key di client). */
export async function buatTransaksiDenda(
  fineId: string,
): Promise<HasilTransaksiDenda> {
  const id = fineId.trim();
  if (!id || id.includes("/")) {
    throw new Error("Identitas tagihan tidak valid.");
  }
  const hasil = await panggilBackend<HasilTransaksiDenda>(
    "/api/pembayaran/buat",
    { fineId: id },
  );
  if (!hasil.redirectUrl || !hasil.orderId) {
    throw new Error("Respons pembayaran dari server tidak lengkap.");
  }
  return hasil;
}

/** Opsional: memicu pengiriman push notification kegiatan via backend Vercel. */
export async function kirimNotifikasiKegiatan(
  payload: PayloadNotifikasiKegiatan,
): Promise<void> {
  await panggilBackend("/api/notifikasi/kirim", { ...payload });
}
