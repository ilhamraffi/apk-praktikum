// src/types/index.ts
// Kontrak data bersama (dibekukan di Fase 0). Satu-satunya sumber tipe & nama
// koleksi Firestore. Jangan mengubah tanpa lewat PM.
//
// Skema Firestore (lihat README §7):
//   users/{uid}                           -> ProfilUser
//   labs/{labId}                          -> Lab
//   classes/{classId}                     -> Kelas
//   sessions/{sessionId}                  -> Sesi
//   sessions/{sessionId}/attendance/{uid} -> CatatanPresensi
//   permissions/{izinId}                  -> PengajuanIzin
//   fines/{fineId}                        -> TagihanDenda
//   payments/{orderId}                    -> TransaksiPembayaran

import type { Timestamp } from "@react-native-firebase/firestore";

/** ASLAB = Asisten Lab (role baru Sprint 4), ASISTEN = Asprak, PRAKTIKAN = Praktikan. */
export type Role = "ASLAB" | "ASISTEN" | "PRAKTIKAN";
export type SessionStatus = "BELUM_DIBUKA" | "DIBUKA" | "DITUTUP";
export type StatusKehadiran = "Hadir" | "Izin";
export type StatusIzin = "pending" | "approved" | "rejected";
export type StatusKetepatan = "TEPAT_WAKTU" | "TERLAMBAT";
export type StatusPembayaran = "pending" | "success" | "failed";
export type JenisBulkInsert = "lab" | "praktikan" | "asprak";

export interface Koordinat {
  latitude: number;
  longitude: number;
  akurasiMeter?: number | null;
}

/** Dokumen `labs/{labId}` — lokasi, radius, distribusi peserta/asprak, dan kebijakan denda. */
export interface Lab {
  id?: string;
  nama: string;
  gedung?: string;
  mataKuliah?: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
  gracePeriodMenit?: number;
  nominalDenda?: number;
  aslabUids?: string[];
  asprakUids?: string[];
  praktikanUids?: string[];
  dibuatPada?: Timestamp | string | null;
  diubahPada?: Timestamp | string | null;
}

/** Dokumen `users/{uid}` — profil pengguna (Auth + peran). */
export interface ProfilUser {
  uid?: string;
  nama: string;
  nim: string;
  email: string;
  role: Role;
  labIds?: string[];
}

/** Dokumen `classes/{classId}`. */
export interface Kelas {
  id?: string;
  nama: string;
  kode: string;
  pesertaUids: string[];
  asistenUid?: string | null;
}

/** Dokumen `sessions/{sessionId}`. */
export interface Sesi {
  id?: string;
  classId: string;
  asistenUid?: string | null;
  namaPraktikum: string;        // disalin dari nama kelas saat sesi dibuat
  modul: string;
  mulai?: Timestamp | null;     // baru
  selesai?: Timestamp | null;   // baru
  waktu?: string;               // lama: hanya untuk sesi lama, jangan dipakai lagi
  ruangan: string;              // keterangan tampilan (diisi nama laboratorium)
  labId?: string;               // rujukan `labs/{labId}` untuk validasi lokasi
  status: SessionStatus;
  kodePresensi?: string | null; // kode acak ruangan saat sesi DIBUKA
  batasOtomatisTutup?: Timestamp | null; // batas perpanjangan saat sesi dibuka kembali setelah jam selesai
  seriId?: string | null;       // baru: penanda sesi berulang
  pertemuanKe?: number | null;  // baru
}

/** Dokumen `sessions/{sessionId}/attendance/{uid}`. */
export interface CatatanPresensi {
  uid?: string; // id dokumen = uid praktikan
  nama: string;
  nim: string;
  statusKehadiran: StatusKehadiran;
  catatan: string;
  waktu?: Timestamp | string | null; // serverTimestamp -> Timestamp saat dibaca
  labId?: string;
  lokasi?: Koordinat | null;
  jarakMeter?: number | null;
  statusKetepatan?: StatusKetepatan;
  terlambatMenit?: number | null;
  fineId?: string | null;
}

/** Dokumen `permissions/{izinId}`. */
export interface PengajuanIzin {
  id?: string;
  uid: string;
  sessionId: string;
  alasan: string;
  kategoriAI?: string | null;
  statusAI?: string | null;
  status: StatusIzin;
  diputuskanOleh?: string | null;
  dibuatPada?: Timestamp | string | null;
  diputuskanPada?: Timestamp | string | null;
}

/** Dokumen `fines/{fineId}` — 1 tagihan denda per kejadian keterlambatan (ID = `${sessionId}_${uid}`). */
export interface TagihanDenda {
  id?: string;
  uid: string;
  sessionId: string;
  classId: string;
  labId: string;
  attendancePath: string;
  namaPraktikan: string;
  nim: string;
  namaPraktikum: string;
  modul: string;
  nominal: number;
  terlambatMenit: number;
  status: StatusPembayaran;
  orderIdTerakhir?: string | null;
  dibuatPada?: Timestamp | string | null;
  diperbaruiPada?: Timestamp | string | null;
  dibayarPada?: Timestamp | string | null;
}

/** Dokumen `payments/{orderId}` — jejak transaksi pembayaran Midtrans Sandbox. */
export interface TransaksiPembayaran {
  orderId: string;
  fineId: string;
  uid: string;
  sessionId: string;
  namaPraktikum?: string;
  modul?: string;
  nominal: number;
  status: StatusPembayaran;
  metodePembayaran?: string | null;
  snapToken?: string | null;
  redirectUrl?: string | null;
  midtransTransactionId?: string | null;
  midtransStatus?: string | null;
  dibuatPada?: Timestamp | string | null;
  diperbaruiPada?: Timestamp | string | null;
  waktuTransaksi?: Timestamp | string | null;
}
