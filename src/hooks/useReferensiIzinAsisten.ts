// Hanya membaca profil/sesi yang dirujuk kartu izin yang sedang dirender.
import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot } from "@react-native-firebase/firestore";
import { auth, db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import { idIzinValid } from "../utils/izinAsisten";

interface DataReferensi {
  data: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
}
const dataKosong = (loading: boolean): DataReferensi => ({ data: null, loading, error: null });

export function useReferensiIzinAsisten(asistenUid: string | undefined, koleksi: "users" | "sessions", id: string) {
  const [percobaan, setPercobaan] = useState(0);
  const key = JSON.stringify([asistenUid ?? null, koleksi, id, percobaan]);
  const [state, setState] = useState(() => ({ key, ...dataKosong(Boolean(asistenUid)) }));
  useEffect(() => {
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
      setState({ key, ...dataKosong(false), error: pesanError(error) });
    };
    if (!asistenUid) return berhenti;
    try {
      if (auth.currentUser?.uid !== asistenUid) throw new Error("Sesi akun berubah. Silakan masuk ulang.");
      if (!idIzinValid(id)) throw new Error("Referensi pengajuan tidak valid.");
      unsubscribe = onSnapshot(doc(db, koleksi, id), (snapshot) => {
        if (aktif) setState({ key, data: snapshot.exists() ? snapshot.data() ?? null : null, loading: false, error: null });
      }, gagal);
      if (!aktif) berhenti();
    } catch (error) { gagal(error); }
    return berhenti;
  }, [asistenUid, koleksi, id, key]);
  const data = state.key === key ? state : dataKosong(Boolean(asistenUid));
  const cobaLagi = useCallback(() => setPercobaan((nilai) => nilai + 1), []);
  return { data: data.data, loading: data.loading, error: data.error, cobaLagi };
}
