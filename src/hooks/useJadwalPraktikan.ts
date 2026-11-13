// SRS-02 praktikan — milik Fauzan. Tidak mengubah hook CRUD milik Ilham.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "@react-native-firebase/firestore";
import { pesanError } from "../lib/errors";
import { db } from "../lib/firebase";
import type { Kelas, Sesi } from "../types";

interface JadwalPraktikan {
  kelas: Kelas[];
  sesi: Sesi[];
  loading: boolean;
  error: string | null;
  dariCache: boolean;
}

function jadwalKosong(loading = false): JadwalPraktikan {
  return { kelas: [], sesi: [], loading, error: null, dariCache: false };
}

interface LanggananKelas {
  sesi: Sesi[];
  loading: boolean;
  dariCache: boolean;
  berhenti: () => void;
}

/** Listener dipisahkan dari hook agar siklus akses data bisa diuji tanpa HP. */
export function langgananJadwalPraktikan(
  uid: string | undefined,
  terima: (jadwal: JadwalPraktikan) => void,
): () => void {
  terima(jadwalKosong(Boolean(uid)));
  if (!uid) return () => {};

  let aktif = true;
  let kelas: Kelas[] = [];
  let kelasDariCache = true;
  let berhentiKelas = () => {};
  const langganan = new Map<string, LanggananKelas>();

  const berhenti = () => {
    aktif = false;
    berhentiKelas();
    berhentiKelas = () => {};
    langganan.forEach((item) => item.berhenti());
    langganan.clear();
  };

  const kirim = () => {
    if (!aktif) return;
    const daftar = [...langganan.values()];
    terima({
      kelas,
      sesi: daftar.flatMap((item) => item.sesi).sort((a, b) =>
        a.namaPraktikum.localeCompare(b.namaPraktikum) ||
        a.modul.localeCompare(b.modul) ||
        (a.id ?? "").localeCompare(b.id ?? ""),
      ),
      loading: daftar.some((item) => item.loading),
      error: null,
      dariCache: kelasDariCache || daftar.some((item) => item.dariCache),
    });
  };

  const gagal = (error: unknown) => {
    if (!aktif) return;
    // Jangan biarkan data lama tetap tampil ketika akses ditolak.
    berhenti();
    terima({ ...jadwalKosong(), error: pesanError(error) });
  };

  try {
    berhentiKelas = onSnapshot(
      query(collection(db, "classes"), where("pesertaUids", "array-contains", uid)),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!aktif) return;
        kelas = snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as Kelas)
          .filter((item) => Array.isArray(item.pesertaUids) && item.pesertaUids.includes(uid))
          .sort((a, b) => a.kode.localeCompare(b.kode));
        kelasDariCache = snapshot.metadata.fromCache;

        const ids = new Set(kelas.map((item) => item.id));
        for (const [id, item] of langganan) {
          if (!ids.has(id)) {
            // Hapus sebelum unsubscribe agar callback lama diabaikan.
            langganan.delete(id);
            item.berhenti();
          }
        }

        for (const item of kelas) {
          const classId = item.id;
          if (!classId || langganan.has(classId)) continue;
          const listener: LanggananKelas = {
            sesi: [], loading: true, dariCache: true, berhenti: () => {},
          };
          langganan.set(classId, listener);
          try {
            // Query per kelas: tidak membaca seluruh koleksi sessions dan
            // tetap bisa dipakai meskipun praktikan mengikuti banyak kelas.
            listener.berhenti = onSnapshot(
              query(collection(db, "sessions"), where("classId", "==", classId)),
              { includeMetadataChanges: true },
              (sesiSnapshot) => {
                if (!aktif || langganan.get(classId) !== listener) return;
                listener.sesi = sesiSnapshot.docs
                  .map((sesi) => ({ ...sesi.data(), id: sesi.id }) as Sesi)
                  .filter((sesi) => sesi.classId === classId);
                listener.loading = false;
                listener.dariCache = sesiSnapshot.metadata.fromCache;
                kirim();
              },
              (error) => {
                if (langganan.get(classId) === listener) gagal(error);
              },
            );
          } catch (error) {
            gagal(error);
            return;
          }
        }
        kirim();
      },
      gagal,
    );
  } catch (error) {
    gagal(error);
  }

  return berhenti;
}

/** Panggil dengan uid hanya setelah Auth selesai dan role adalah PRAKTIKAN. */
export function useJadwalPraktikan(uid?: string) {
  const [percobaan, setPercobaan] = useState(0);
  const [state, setState] = useState(() => ({
    uid,
    percobaan,
    data: jadwalKosong(Boolean(uid)),
  }));

  useEffect(() => langgananJadwalPraktikan(uid, (data) => {
    setState({ uid, percobaan, data });
  }), [uid, percobaan]);

  // Sembunyikan data akun sebelumnya sejak render pertama, sebelum cleanup
  // effect berjalan. Callback setelah unsubscribe juga ditolak oleh listener.
  const data = state.uid === uid && state.percobaan === percobaan
    ? state.data
    : jadwalKosong(Boolean(uid));
  const mapKelas = useMemo(
    () => new Map(data.kelas.map((item) => [item.id, item])),
    [data.kelas],
  );
  const cobaLagi = useCallback(() => setPercobaan((nilai) => nilai + 1), []);

  return { ...data, mapKelas, cobaLagi };
}
