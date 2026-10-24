// src/context/AttendanceContext.tsx
import React, { createContext, useContext, useState } from "react";

export type Role = "ASISTEN" | "PRAKTIKAN";
export type SessionStatus = "BELUM_DIBUKA" | "DIBUKA" | "DITUTUP";

export interface User {
  id: string;
  nama: string;
  nim: string;
  kelas: string;
  role: Role;
  password: string; // <-- Tambahkan baris ini
}

export interface AttendanceRecord {
  userId: string;
  nama: string;
  nim: string;
  waktu: string;
  statusKehadiran: "Hadir" | "Izin";
  catatan: string;
}

export interface Session {
  id: string;
  namaPraktikum: string;
  modul: string;
  kelas: string;
  waktu: string;
  ruangan: string;
  totalPraktikan: number;
  status: SessionStatus;
  presensi: AttendanceRecord[];
}

export const DUMMY_USERS: User[] = [

  {
    id: "A1",
    nama: "Muhammad Fauzan Akbar",
    nim: "24060124140139",
    kelas: "IF-C",
    role: "ASISTEN",
    password: "123", 
  },
  {
    id: "A2",
    nama: "Farhan Muhtaram",
    nim: "24060124140185",
    kelas: "IF-C",
    role: "ASISTEN",
    password: "123", 
  },
  {
    id: "P1",
    nama: "Muchammad Rajib Tafrichan",
    nim: "24060124140141",
    kelas: "IF-C",
    role: "PRAKTIKAN",
    password: "123", 
  },
  {
    id: "P1",
    nama: "Ilham Muhammad Raffi",
    nim: "24060124140198",
    kelas: "IF-C",
    role: "PRAKTIKAN",
    password: "123", 
  }
];


const INITIAL_SESSIONS: Session[] = [
  {
    id: "sesi-1",
    namaPraktikum: "Pengembangan Platform Khusus (PPK)",
    modul: "Modul 1: UI Responsif & State Global",
    kelas: "IF-C",
    waktu: "Kamis, 08:00 - 10:30 WIB",
    ruangan: "Lab Komputasi Dasar E301",
    totalPraktikan: 35,
    status: "BELUM_DIBUKA",
    presensi: [],
  },
  {
    id: "sesi-2",
    namaPraktikum: "Pengembangan Berbasis Platform (PBP)",
    modul: "Modul 5: Integrasi State & Form",
    kelas: "IF-C",
    waktu: "Jumat, 13:00 - 15:30 WIB",
    ruangan: "Lab RPL Gedung F",
    totalPraktikan: 35,
    status: "DIBUKA",
    presensi: [
      {
        userId: "u4",
        nama: "Alya Rahma",
        nim: "24060124120001",
        waktu: "13:04:10 WIB",
        statusKehadiran: "Hadir",
        catatan: "Meja Baris 1",
      },
    ],
  },
];

interface AttendanceContextType {
  currentUser: User | null;
  pilihPeran: (user: User) => void;
  keluarPeran: () => void;
  sessions: Session[];
  bukaSesi: (sessionId: string) => void;
  tutupSesi: (sessionId: string) => void;
  catatPresensi: (
    sessionId: string,
    statusKehadiran: "Hadir" | "Izin",
    catatan: string,
  ) => boolean;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(
  undefined,
);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);

  const pilihPeran = (user: User) => setCurrentUser(user);

  // SRS-02: Keluar/ganti peran hanya mereset currentUser, TIDAK mereset state sessions!
  const keluarPeran = () => setCurrentUser(null);

  const bukaSesi = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: "DIBUKA" } : s)),
    );
  };

  const tutupSesi = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: "DITUTUP" } : s)),
    );
  };

  const catatPresensi = (
    sessionId: string,
    statusKehadiran: "Hadir" | "Izin",
    catatan: string,
  ) => {
    if (!currentUser) return false;
    const sesi = sessions.find((s) => s.id === sessionId);
    if (!sesi || sesi.status !== "DIBUKA") return false;

    const sudahAbsen = sesi.presensi.some((p) => p.userId === currentUser.id);
    if (sudahAbsen) return false;

    const waktu =
      new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) + " WIB";

    const baru: AttendanceRecord = {
      userId: currentUser.id,
      nama: currentUser.nama,
      nim: currentUser.nim,
      waktu,
      statusKehadiran,
      catatan: catatan.trim() || "-",
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, presensi: [...s.presensi, baru] } : s,
      ),
    );
    return true;
  };

  return (
    <AttendanceContext.Provider
      value={{
        currentUser,
        pilihPeran,
        keluarPeran,
        sessions,
        bukaSesi,
        tutupSesi,
        catatPresensi,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const ctx = useContext(AttendanceContext);
  if (!ctx)
    throw new Error("useAttendance wajib dipakai di dalam AttendanceProvider");
  return ctx;
};
