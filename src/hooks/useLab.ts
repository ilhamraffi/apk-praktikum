// src/hooks/useLab.ts
// Laboratorium (CRUD) — milik Ilham (SRS-11). Satu laboratorium dipakai banyak
// sesi: koordinat & radius menjadi sumber kebenaran validasi lokasi presensi.
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";
import { db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import type { Lab } from "../types";

/** Batas radius laboratorium (sama dengan aturan Firestore & validasi presensi). */
export const RADIUS_MIN_METER = 1;
export const RADIUS_MAKS_METER = 250;

/** Input form laboratorium (tanpa id & timestamp). */
export interface InputLab {
  nama: string;
  gedung: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
}

/** Daftar laboratorium real-time, terurut nama. */
export function useDaftarLab() {
  const [lab, setLab] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dariCache, setDariCache] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "labs"), orderBy("nama", "asc"));
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        setLab(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Lab));
        setDariCache(snap.metadata.fromCache);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(pesanError(err));
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const mapLab = useMemo(() => {
    const map = new Map<string, Lab>();
    for (const item of lab) if (item.id) map.set(item.id, item);
    return map;
  }, [lab]);

  return { lab, mapLab, loading, error, dariCache };
}

function sanitasiInput(input: InputLab) {
  return {
    nama: input.nama.trim(),
    gedung: input.gedung.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMeter: input.radiusMeter,
  };
}

export async function buatLab(input: InputLab): Promise<string> {
  const data = sanitasiInput(input);
  const ref = await addDoc(collection(db, "labs"), {
    ...data,
    dibuatPada: serverTimestamp(),
    diubahPada: serverTimestamp(),
  });
  return ref.id;
}

export async function perbaruiLab(id: string, input: InputLab): Promise<void> {
  const data = sanitasiInput(input);
  await updateDoc(doc(db, "labs", id), {
    ...data,
    diubahPada: serverTimestamp(),
  });
}

/**
 * Hapus laboratorium. Ditolak bila masih dirujuk oleh satu sesi atau lebih,
 * supaya presensi sesi tersebut tidak kehilangan sumber validasi lokasinya.
 */
export async function hapusLab(id: string): Promise<void> {
  const sesiSnap = await getDocs(
    query(collection(db, "sessions"), where("labId", "==", id)),
  );
  if (!sesiSnap.empty) {
    throw new Error(
      "Laboratorium ini masih dipakai oleh sesi praktikum. Pindahkan sesi ke laboratorium lain atau hapus sesinya terlebih dahulu.",
    );
  }
  await deleteDoc(doc(db, "labs", id));
}
