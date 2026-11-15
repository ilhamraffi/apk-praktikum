import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "@react-native-firebase/firestore";
import { auth, db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import { klasifikasikanAlasan, TeksTidakDikenaliEDOM } from "../lib/ai";
import type { PengajuanIzin } from "../types";
import { bacaPengajuanIzin, urutkanIzin } from "../utils/izinAsisten";

const BATAS_ALASAN = 1000;

/** Analisis izin milik sendiri yang masih pending. Transaksi membaca alasan
 * terbaru dan tidak mengubah keputusan, termasuk saat asisten memutuskan
 * bersamaan dengan analisis. Callback hanya menjalankan model lokal. */
export async function analisisUlangIzinPraktikan(input: { uid: string; izinId: string }): Promise<void> {
  const { uid, izinId } = input;
  if (!uid || !izinId || uid.includes("/") || izinId.includes("/")) {
    throw new Error("Identitas akun atau pengajuan tidak valid.");
  }
  const cekAkun = () => {
    if (auth.currentUser?.uid !== uid) throw new Error("Sesi akun berubah. Silakan masuk ulang.");
  };
  cekAkun();
  const izinRef = doc(db, "permissions", izinId);
  await runTransaction(db, async (transaksi) => {
    cekAkun();
    const profil = await transaksi.get(doc(db, "users", uid));
    if (!profil.exists() || profil.data()?.role !== "PRAKTIKAN") {
      throw new Error("Analisis izin hanya tersedia untuk akun praktikan.");
    }
    const snapshot = await transaksi.get(izinRef);
    if (!snapshot.exists()) throw new Error("Pengajuan izin tidak ditemukan.");
    const pengajuan = bacaPengajuanIzin(izinId, snapshot.data());
    if (pengajuan.uid !== uid) throw new Error("Pengajuan ini bukan milik akunmu.");
    if (pengajuan.status !== "pending") throw new Error("Pengajuan sudah diputuskan dan tidak dapat dianalisis ulang.");

    let kategoriAI: string | null = null;
    let statusAI = "success";
    try {
      kategoriAI = await klasifikasikanAlasan(pengajuan.alasan);
    } catch (error) {
      statusAI = error instanceof TeksTidakDikenaliEDOM ? "unknown_vocabulary" : "failed";
    }
    cekAkun();
    transaksi.update(izinRef, { kategoriAI, statusAI });
  });
}

export async function ajukanIzinPraktikan(input: {
  uid: string;
  sessionId: string;
  alasan: string;
}): Promise<void> {
  const alasan = input.alasan.trim();
  if (!input.uid || !input.sessionId || input.uid.includes("/") || input.sessionId.includes("/")) {
    throw new Error("Identitas akun atau sesi tidak valid.");
  }
  if (alasan.length < 5) throw new Error("Alasan izin minimal 5 karakter.");
  if (alasan.length > BATAS_ALASAN) throw new Error(`Alasan izin maksimal ${BATAS_ALASAN} karakter.`);
  if (auth.currentUser?.uid !== input.uid) {
    throw new Error("Sesi akun berubah. Silakan masuk ulang.");
  }

  const izinRef = doc(db, "permissions", `${input.uid}_${input.sessionId}`);
  await setDoc(izinRef, {
    uid: input.uid,
    sessionId: input.sessionId,
    alasan,
    kategoriAI: null,
    statusAI: "not_requested",
    status: "pending",
    diputuskanOleh: null,
    dibuatPada: serverTimestamp(),
    diputuskanPada: null,
  });

  try {
    await analisisUlangIzinPraktikan({ uid: input.uid, izinId: izinRef.id });
  } catch {
    // Pengajuan sudah tersimpan. Kegagalan sinkronisasi analisis atau keputusan
    // asisten yang datang lebih dulu tidak membatalkan pengajuan. Praktikan
    // dapat memakai tombol analisis ulang selama pengajuan masih pending.
  }
}

interface DataIzinPraktikan {
  izin: (PengajuanIzin & { id: string })[];
  loading: boolean;
  error: string | null;
  dariCache: boolean;
}

const dataKosong = (loading = false): DataIzinPraktikan => ({
  izin: [], loading, error: null, dariCache: false,
});

export function useDaftarIzinPraktikan(uid: string | undefined) {
  const [percobaan, setPercobaan] = useState(0);
  const [state, setState] = useState(() => ({
    uid,
    percobaan,
    data: dataKosong(Boolean(uid)),
  }));
  const cobaLagi = useCallback(() => setPercobaan((nilai) => nilai + 1), []);

  useEffect(() => {
    if (!uid) return;

    let aktif = true;
    let berhenti = () => {};
    try {
      berhenti = onSnapshot(
        query(collection(db, "permissions"), where("uid", "==", uid)),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!aktif) return;
          try {
            const izin = snapshot.docs
              .map((item) => bacaPengajuanIzin(item.id, item.data()))
              .filter((item) => item.uid === uid);
            setState({
              uid,
              percobaan,
              data: {
                izin: urutkanIzin(izin) as (PengajuanIzin & { id: string })[],
                loading: false,
                error: null,
                dariCache: snapshot.metadata.fromCache,
              },
            });
          } catch (error) {
            Promise.resolve().then(() => {
              if (aktif) setState({ uid, percobaan, data: { ...dataKosong(), error: pesanError(error) } });
            });
          }
        },
        (error) => {
          if (aktif) setState({ uid, percobaan, data: { ...dataKosong(), error: pesanError(error) } });
        },
      );
    } catch (error) {
      setState({ uid, percobaan, data: { ...dataKosong(), error: pesanError(error) } });
    }
    return () => {
      aktif = false;
      berhenti();
    };
  }, [percobaan, uid]);

  const key = JSON.stringify([uid ?? null, percobaan]);
  const stateKey = JSON.stringify([state.uid ?? null, state.percobaan]);
  return {
    ...(stateKey === key ? state.data : dataKosong(Boolean(uid))),
    cobaLagi,
  };
}

export { BATAS_ALASAN };
