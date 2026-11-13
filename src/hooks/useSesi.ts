// src/hooks/useSesi.ts
// Sesi/jadwal (CRUD) + buka/tutup sesi — milik Ilham (SRS-02, 03, 04).
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";
import { db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import type { Kelas, Sesi } from "../types";

/** Daftar sesi real-time (opsional difilter per kelas). */
export function useDaftarSesi(kelasId?: string) {
  const [sesi, setSesi] = useState<Sesi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = kelasId
      ? query(collection(db, "sessions"), where("classId", "==", kelasId))
      : query(collection(db, "sessions"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSesi(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Sesi));
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(pesanError(err));
        setLoading(false);
      },
    );
    return unsub;
  }, [kelasId]);

  return { sesi, loading, error };
}

interface SesiDetailState {
  id: string | undefined;
  sesi: Sesi | null;
  kelas: Kelas | null;
  loaded: boolean;
  error: string | null;
}

/** Detail satu sesi + kelas terkait, real-time. */
export function useSesiDetail(sesiId?: string) {
  const [state, setState] = useState<SesiDetailState>({
    id: sesiId,
    sesi: null,
    kelas: null,
    loaded: false,
    error: null,
  });

  // Reset saat id berganti (menyesuaikan state selama render).
  if (state.id !== sesiId) {
    setState({ id: sesiId, sesi: null, kelas: null, loaded: false, error: null });
  }

  useEffect(() => {
    if (!sesiId) return;
    return onSnapshot(
      doc(db, "sessions", sesiId),
      (snap) =>
        setState((prev) => ({
          ...prev,
          sesi: snap.exists() ? ({ id: snap.id, ...snap.data() } as Sesi) : null,
          loaded: true,
          error: null,
        })),
      (err) =>
        setState((prev) => ({ ...prev, loaded: true, error: pesanError(err) })),
    );
  }, [sesiId]);

  useEffect(() => {
    const classId = state.sesi?.classId;
    if (!classId) return;
    return onSnapshot(
      doc(db, "classes", classId),
      (snap) =>
        setState((prev) => ({
          ...prev,
          kelas: snap.exists() ? ({ id: snap.id, ...snap.data() } as Kelas) : null,
        })),
      () => setState((prev) => ({ ...prev, kelas: null })),
    );
  }, [state.sesi?.classId]);

  return {
    sesi: state.sesi,
    kelas: state.kelas,
    totalPraktikan: state.kelas?.pesertaUids?.length ?? 0,
    loading: Boolean(sesiId) && !state.loaded,
    error: state.error,
  };
}

export type InputSesi = Omit<Sesi, "id" | "status">;

export async function buatSesi(input: InputSesi): Promise<string> {
  const ref = await addDoc(collection(db, "sessions"), {
    ...input,
    namaPraktikum: input.namaPraktikum.trim(),
    modul: input.modul.trim(),
    waktu: input.waktu.trim(),
    ruangan: input.ruangan.trim(),
    status: "BELUM_DIBUKA",
  });
  return ref.id;
}

export async function perbaruiSesi(
  id: string,
  input: Partial<InputSesi>,
): Promise<void> {
  await updateDoc(doc(db, "sessions", id), input);
}

/** Hapus sesi beserta subkoleksi attendance-nya. */
export async function hapusSesi(id: string): Promise<void> {
  const attSnap = await getDocs(collection(db, "sessions", id, "attendance"));
  const batch = writeBatch(db);
  attSnap.docs.forEach((d) => batch.delete(d.ref));
  if (!attSnap.empty) await batch.commit();
  await deleteDoc(doc(db, "sessions", id));
}

export async function bukaSesi(id: string): Promise<void> {
  await updateDoc(doc(db, "sessions", id), { status: "DIBUKA" });
}

export async function tutupSesi(id: string): Promise<void> {
  await updateDoc(doc(db, "sessions", id), { status: "DITUTUP" });
}
