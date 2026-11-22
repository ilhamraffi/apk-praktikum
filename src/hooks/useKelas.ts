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
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";
import { auth, db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import type { Kelas, ProfilUser } from "../types";

/**
 * Daftar kelas real-time.
 * Jika `semua === false` (default), maka hanya menampilkan kelas milik asisten
 * yang sedang login (`asistenUid === uidAktif`).
 * Jika `semua === true` (mis. untuk Peta Laboratorium bersama), seluruh kelas dikembalikan.
 */
export function useDaftarKelas(opsi?: { semua?: boolean }) {
  const semua = opsi?.semua ?? false;
  const uidAktif = auth.currentUser?.uid ?? null;
  const [kelasRaw, setKelasRaw] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "classes"), orderBy("kode", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setKelasRaw(
          snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Kelas),
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

  const kelas = useMemo(() => {
    if (semua || !uidAktif) return kelasRaw;
    return kelasRaw.filter((k) => k.asistenUid === uidAktif);
  }, [kelasRaw, semua, uidAktif]);

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
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Silakan masuk sebagai asisten terlebih dahulu.");
  }
  const ref = await addDoc(collection(db, "classes"), {
    nama: input.nama.trim(),
    kode: input.kode.trim(),
    pesertaUids: [],
    asistenUid: uid,
  });
  return ref.id;
}

export async function perbaruiKelas(
  id: string,
  input: { nama: string; kode: string },
): Promise<void> {
  const uid = auth.currentUser?.uid;
  const kelasSnap = await getDoc(doc(db, "classes", id));
  const kelasData = kelasSnap.data() as Kelas | undefined;
  if (kelasData?.asistenUid && kelasData.asistenUid !== uid) {
    throw new Error("Anda hanya dapat mengubah kelas yang Anda buat sendiri.");
  }
  const nama = input.nama.trim();
  await updateDoc(doc(db, "classes", id), {
    nama,
    kode: input.kode.trim(),
    asistenUid: kelasData?.asistenUid ?? uid ?? null,
  });
  const sesiSnap = await getDocs(
    query(collection(db, "sessions"), where("classId", "==", id)),
  );
  if (!sesiSnap.empty) {
    const batch = writeBatch(db);
    sesiSnap.docs.forEach((d) => batch.update(d.ref, { namaPraktikum: nama }));
    await batch.commit();
  }
}

/** Hapus kelas beserta semua sesinya (dan presensi sesi). */
export async function hapusKelas(id: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  const kelasSnap = await getDoc(doc(db, "classes", id));
  const kelasData = kelasSnap.data() as Kelas | undefined;
  if (kelasData?.asistenUid && kelasData.asistenUid !== uid) {
    throw new Error("Anda hanya dapat menghapus kelas yang Anda buat sendiri.");
  }
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
  try {
    const attSnap = await getDocs(
      collection(db, "sessions", sesiId, "attendance"),
    );
    if (!attSnap.empty) {
      const batch = writeBatch(db);
      attSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch {
    // Jika Firestore Security Rules memblokir delete subkoleksi attendance,
    // tetap lanjutkan menghapus dokumen sesi dan kelas.
  }
  await deleteDoc(doc(db, "sessions", sesiId));
}

export async function tambahPeserta(
  kelasId: string,
  uid: string,
): Promise<void> {
  if (!uid || auth.currentUser?.uid === uid) {
    throw new Error("Asisten tidak dapat masuk atau menjadi peserta di kelas yang dikelolanya.");
  }
  const userSnap = await getDoc(doc(db, "users", uid));
  const data = userSnap.data() as ProfilUser | undefined;
  if (!userSnap.exists() || data?.role === "ASISTEN") {
    throw new Error("Akun asisten tidak dapat ditambahkan sebagai peserta kelas/sesi.");
  }
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
