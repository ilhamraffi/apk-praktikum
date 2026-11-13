// src/hooks/useKelas.ts
// Kelas (CRUD) + pengelolaan peserta — milik Ilham (SRS-02).
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";
import { db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import type { Kelas } from "../types";

/** Daftar kelas real-time. */
export function useDaftarKelas() {
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "classes"), orderBy("kode", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setKelas(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Kelas),
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
  }, []);

  const mapKelas = useMemo(() => {
    const map = new Map<string, Kelas>();
    for (const k of kelas) if (k.id) map.set(k.id, k);
    return map;
  }, [kelas]);

  return { kelas, mapKelas, loading, error };
}

export async function buatKelas(input: {
  nama: string;
  kode: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "classes"), {
    nama: input.nama.trim(),
    kode: input.kode.trim(),
    pesertaUids: [],
  });
  return ref.id;
}

export async function perbaruiKelas(
  id: string,
  input: { nama: string; kode: string },
): Promise<void> {
  await updateDoc(doc(db, "classes", id), {
    nama: input.nama.trim(),
    kode: input.kode.trim(),
  });
}

/** Hapus kelas beserta semua sesinya (dan presensi sesi). */
export async function hapusKelas(id: string): Promise<void> {
  const sesiSnap = await getDocs(
    query(collection(db, "sessions"), where("classId", "==", id)),
  );
  for (const s of sesiSnap.docs) {
    await hapusSesiDalam(s.id);
  }
  await deleteDoc(doc(db, "classes", id));
}

// helper internal: hapus sesi + subkoleksi attendance (dipanggil hapusKelas)
async function hapusSesiDalam(sesiId: string): Promise<void> {
  const attSnap = await getDocs(
    collection(db, "sessions", sesiId, "attendance"),
  );
  const batch = writeBatch(db);
  attSnap.docs.forEach((d) => batch.delete(d.ref));
  if (!attSnap.empty) await batch.commit();
  await deleteDoc(doc(db, "sessions", sesiId));
}

export async function tambahPeserta(
  kelasId: string,
  uid: string,
): Promise<void> {
  await updateDoc(doc(db, "classes", kelasId), {
    pesertaUids: arrayUnion(uid),
  });
}

export async function hapusPeserta(
  kelasId: string,
  uid: string,
): Promise<void> {
  await updateDoc(doc(db, "classes", kelasId), {
    pesertaUids: arrayRemove(uid),
  });
}
