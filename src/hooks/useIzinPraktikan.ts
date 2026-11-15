import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";
import { auth, db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import { klasifikasikanAlasan } from "../lib/ai";
import type { PengajuanIzin } from "../types";
import { bacaPengajuanIzin, urutkanIzin } from "../utils/izinAsisten";

const BATAS_ALASAN = 1000;

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
    const kategori = await klasifikasikanAlasan(alasan);
    await updateDoc(izinRef, { kategoriAI: kategori, statusAI: "success" });
  } catch {
    // Pengajuan sudah tersimpan; kegagalan AI tidak boleh menggagalkan izin.
    try {
      await updateDoc(izinRef, { statusAI: "failed" });
    } catch {
      // Status pending tetap dapat dipantau walaupun pembaruan status AI gagal.
    }
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
