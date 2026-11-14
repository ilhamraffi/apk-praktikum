// SRS-07 — milik Fauzan. Semua asisten mengikuti kewenangan role pada skema PM.
import { useCallback, useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where } from "@react-native-firebase/firestore";
import { auth, db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import type { PengajuanIzin, StatusIzin } from "../types";
import { bacaPengajuanIzin, idIzinValid, isiIzinSama, urutkanIzin, type KeputusanIzin } from "../utils/izinAsisten";

interface InputKeputusan {
  asistenUid: string;
  pengajuan: PengajuanIzin;
  keputusan: KeputusanIzin;
}

/** Hanya tiga field keputusan di-update. Tidak menulis attendance atau hasil AI.
 * Transaksi memeriksa ulang status/role saat retry dan gagal bila offline. */
export async function putuskanPengajuanIzin(input: InputKeputusan): Promise<void> {
  const { asistenUid, keputusan } = input;
  if (!idIzinValid(asistenUid) || (keputusan !== "approved" && keputusan !== "rejected")) {
    throw new Error("Identitas asisten atau keputusan tidak valid.");
  }
  const ditinjau = bacaPengajuanIzin(input.pengajuan.id ?? "", input.pengajuan);
  if (ditinjau.status !== "pending") throw new Error("Pengajuan ini sudah diputuskan.");
  const cekAkun = () => {
    if (auth.currentUser?.uid !== asistenUid) {
      throw new Error("Sesi akun berubah. Silakan masuk ulang sebelum memeriksa izin.");
    }
  };
  cekAkun();
  const izinRef = doc(db, "permissions", ditinjau.id);
  await runTransaction(db, async (transaksi) => {
    cekAkun();
    const profil = await transaksi.get(doc(db, "users", asistenUid));
    if (!profil.exists() || profil.data()?.role !== "ASISTEN") {
      throw new Error("Hanya asisten yang dapat memutuskan pengajuan izin.");
    }
    const snapshot = await transaksi.get(izinRef);
    if (!snapshot.exists()) throw new Error("Pengajuan izin sudah dihapus atau tidak ditemukan.");
    const terbaru = bacaPengajuanIzin(ditinjau.id, snapshot.data());
    if (terbaru.status !== "pending") {
      throw new Error("Pengajuan ini sudah diputuskan. Periksa status terbarunya.");
    }
    if (!isiIzinSama(ditinjau, terbaru)) {
      throw new Error("Isi pengajuan berubah. Periksa kembali sebelum memberikan keputusan.");
    }
    cekAkun();
    transaksi.update(izinRef, {
      status: keputusan,
      diputuskanOleh: asistenUid,
      diputuskanPada: serverTimestamp(),
    });
  });
}

type TargetIzin = { jenis: "daftar"; status: StatusIzin } | { jenis: "detail"; id: string };
interface DataIzinAsisten {
  izin: PengajuanIzin[];
  loading: boolean;
  error: string | null;
  dariCache: boolean;
  tertunda: boolean;
}
const dataKosong = (loading = false): DataIzinAsisten => ({ izin: [], loading, error: null, dariCache: false, tertunda: false });

/** Query per status memakai satu field; tidak membutuhkan indeks gabungan.
 * Urutan lokal menjaga pengajuan tanpa timestamp server tetap terlihat. */
export function langgananIzinAsisten(
  asistenUid: string | undefined,
  target: TargetIzin,
  terima: (data: DataIzinAsisten) => void,
): () => void {
  terima(dataKosong(Boolean(asistenUid)));
  if (!asistenUid) return () => {};
  let aktif = true;
  let unsubscribe: (() => void) | undefined;
  const berhenti = () => {
    aktif = false;
    const stop = unsubscribe;
    unsubscribe = undefined;
    stop?.();
  };
  const gagal = (error: unknown) => {
    if (!aktif) return;
    berhenti();
    terima({ ...dataKosong(), error: pesanError(error) });
  };
  const kirim = (izin: PengajuanIzin[], metadata: { fromCache: boolean; hasPendingWrites: boolean }) => {
    if (aktif) terima({ izin: urutkanIzin(izin), loading: false, error: null, dariCache: metadata.fromCache, tertunda: metadata.hasPendingWrites });
  };
  try {
    if (auth.currentUser?.uid !== asistenUid) throw new Error("Sesi akun berubah. Silakan masuk ulang.");
    if (target.jenis === "daftar") {
      if (!["pending", "approved", "rejected"].includes(target.status)) throw new Error("Filter izin tidak valid.");
      unsubscribe = onSnapshot(
        query(collection(db, "permissions"), where("status", "==", target.status)),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!aktif) return;
          try { kirim(snapshot.docs.map((item) => bacaPengajuanIzin(item.id, item.data())), snapshot.metadata); }
          catch (error) { gagal(error); }
        }, gagal,
      );
    } else {
      if (!idIzinValid(target.id)) throw new Error("Identitas pengajuan izin tidak valid.");
      unsubscribe = onSnapshot(
        doc(db, "permissions", target.id), { includeMetadataChanges: true },
        (snapshot) => {
          if (!aktif) return;
          try { kirim(snapshot.exists() ? [bacaPengajuanIzin(snapshot.id, snapshot.data())] : [], snapshot.metadata); }
          catch (error) { gagal(error); }
        }, gagal,
      );
    }
    if (!aktif) berhenti();
  } catch (error) { gagal(error); }
  return berhenti;
}

function useDataIzinAsisten(asistenUid: string | undefined, target: TargetIzin) {
  const [percobaan, setPercobaan] = useState(0);
  const targetKey = JSON.stringify(target);
  const key = JSON.stringify([asistenUid ?? null, targetKey, percobaan]);
  const [state, setState] = useState(() => ({ key, data: dataKosong(Boolean(asistenUid)) }));
  useEffect(() => langgananIzinAsisten(asistenUid, JSON.parse(targetKey) as TargetIzin, (data) => {
    setState({ key, data });
  }), [asistenUid, targetKey, key]);
  const data = state.key === key ? state.data : dataKosong(Boolean(asistenUid));
  const cobaLagi = useCallback(() => setPercobaan((nilai) => nilai + 1), []);
  return { ...data, cobaLagi };
}

export function useDaftarIzinAsisten(asistenUid: string | undefined, status: StatusIzin) {
  return useDataIzinAsisten(asistenUid, { jenis: "daftar", status });
}

export function useDetailIzinAsisten(asistenUid: string | undefined, id: string) {
  const hasil = useDataIzinAsisten(asistenUid, { jenis: "detail", id });
  return { ...hasil, pengajuan: hasil.izin[0] ?? null };
}
