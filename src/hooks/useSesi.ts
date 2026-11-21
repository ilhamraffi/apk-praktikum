// src/hooks/useSesi.ts
// Sesi/jadwal (CRUD) + buka/tutup sesi — milik Ilham (SRS-02, 03, 04).
import { useEffect, useState } from "react";
import {
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
import { tambahMinggu, urutkanSesi } from "../utils/waktuSesi";

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
        setSesi(
          snap.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Sesi)
            .sort(urutkanSesi),
        );
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
          sesi: snap.exists() ? ({ ...snap.data(), id: snap.id } as Sesi) : null,
          loaded: true,
          error: null,
        })),
      (err) =>
        setState((prev) => ({ ...prev, loaded: true, error: pesanError(err) })),
    );
  }, [sesiId]);

  useEffect(() => {
    const classId = state.sesi?.classId;
    if (!classId || classId.includes("/")) return;
    return onSnapshot(
      doc(db, "classes", classId),
      (snap) =>
        setState((prev) => ({
          ...prev,
          kelas: snap.exists() ? ({ ...snap.data(), id: snap.id } as Kelas) : null,
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

/** Input form sesi. `mulai`/`selesai` berupa Date (disimpan Firestore sebagai Timestamp). */
export interface InputSesi {
  classId: string;
  namaPraktikum: string; // disalin dari nama kelas
  modul: string;
  mulai: Date;
  selesai: Date;
  ruangan: string;
}

/** Batas jumlah pertemuan berulang (kira-kira satu semester). */
export const MAKS_PERTEMUAN = 20;

/**
 * Buat satu sesi, atau sesi berulang tiap minggu (`jumlahPertemuan` > 1).
 * Setiap pertemuan menjadi dokumen sesi sendiri (status & presensi terpisah),
 * dan semuanya ditulis dalam satu batch: berhasil semua atau gagal semua.
 */
export async function buatSesi(
  input: InputSesi,
  jumlahPertemuan = 1,
): Promise<string[]> {
  const n = Math.max(1, Math.min(MAKS_PERTEMUAN, Math.floor(jumlahPertemuan)));
  const seriId = n > 1 ? doc(collection(db, "sessions")).id : null;
  const batch = writeBatch(db);
  const ids: string[] = [];

  for (let i = 0; i < n; i++) {
    const ref = doc(collection(db, "sessions"));
    ids.push(ref.id);
    batch.set(ref, {
      classId: input.classId,
      namaPraktikum: input.namaPraktikum.trim(),
      modul: n > 1 ? `Pertemuan ${i + 1}` : input.modul.trim(),
      mulai: tambahMinggu(input.mulai, i),
      selesai: tambahMinggu(input.selesai, i),
      ruangan: input.ruangan.trim(),
      status: "BELUM_DIBUKA",
      seriId,
      pertemuanKe: n > 1 ? i + 1 : null,
    });
  }

  await batch.commit();
  return ids;
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
