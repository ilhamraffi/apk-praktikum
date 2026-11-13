// src/types/index.ts
// Kontrak data bersama (dibekukan di Fase 0). Satu-satunya sumber tipe & nama
// koleksi Firestore. Jangan mengubah tanpa lewat PM.
//
// Skema Firestore (lihat README §7):
//   users/{uid}                         -> ProfilUser
//   classes/{classId}                   -> Kelas
//   sessions/{sessionId}                -> Sesi
//   sessions/{sessionId}/attendance/{uid} -> CatatanPresensi
//   permissions/{izinId}                -> PengajuanIzin

import type { Timestamp } from "@react-native-firebase/firestore";

export type Role = "ASISTEN" | "PRAKTIKAN";
export type SessionStatus = "BELUM_DIBUKA" | "DIBUKA" | "DITUTUP";
export type StatusKehadiran = "Hadir" | "Izin";
export type StatusIzin = "pending" | "approved" | "rejected";

/** Dokumen `users/{uid}` — profil pengguna (Auth + peran). */
export interface ProfilUser {
  uid?: string;
  nama: string;
  nim: string;
  email: string;
  role: Role;
}

/** Dokumen `classes/{classId}`. */
export interface Kelas {
  id?: string;
  nama: string;
  kode: string;
  pesertaUids: string[];
}

/** Dokumen `sessions/{sessionId}`. */
export interface Sesi {
  id?: string;
  classId: string;
  namaPraktikum: string;
  modul: string;
  waktu: string;
  ruangan: string;
  status: SessionStatus;
}

/** Dokumen `sessions/{sessionId}/attendance/{uid}`. */
export interface CatatanPresensi {
  uid?: string; // id dokumen = uid praktikan
  nama: string;
  nim: string;
  statusKehadiran: StatusKehadiran;
  catatan: string;
  waktu?: Timestamp | string | null; // serverTimestamp -> Timestamp saat dibaca
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
