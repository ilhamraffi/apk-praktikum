// src/hooks/useLabSesi.ts
// Langganan real-time dokumen `labs/{labId}` untuk validasi radius presensi (SRS-10).
import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot } from "@react-native-firebase/firestore";
import { db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import type { Lab } from "../types";

export interface DataLabSesi {
  lab: Lab | null;
  loading: boolean;
  error: string | null;
  dariCache: boolean;
}

function dataKosong(loading = false): DataLabSesi {
  return { lab: null, loading, error: null, dariCache: false };
}

function labIdValid(labId: string | undefined): labId is string {
  return typeof labId === "string" && Boolean(labId.trim()) && !labId.includes("/");
}

/** Mendengarkan perubahan koordinat & radius laboratorium secara real-time. */
export function langgananLabSesi(
  labId: string | undefined,
  terima: (data: DataLabSesi) => void,
): () => void {
  const valid = labIdValid(labId);
  const id = valid ? labId.trim() : undefined;
  terima(dataKosong(Boolean(id)));
  if (!id) return () => {};

  let aktif = true;
  let unsubscribe: (() => void) | null = null;
  const berhenti = () => {
    aktif = false;
    const stop = unsubscribe;
    unsubscribe = null;
    stop?.();
  };
  const gagal = (error: unknown) => {
    if (!aktif) return;
    berhenti();
    terima({ ...dataKosong(), error: pesanError(error) });
  };

  try {
    const stop = onSnapshot(
      doc(db, "labs", id),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!aktif) return;
        terima({
          lab: snapshot.exists() ? ({ id, ...snapshot.data() } as Lab) : null,
          loading: false,
          error: null,
          dariCache: snapshot.metadata.fromCache,
        });
      },
      gagal,
    );
    if (aktif) unsubscribe = stop;
    else stop();
  } catch (error) {
    gagal(error);
  }

  return berhenti;
}

export function useLabSesi(labId: string | undefined) {
  const [percobaan, setPercobaan] = useState(0);
  const idBersih = labIdValid(labId) ? labId.trim() : undefined;
  const key = JSON.stringify([idBersih ?? null, percobaan]);
  const [state, setState] = useState(() => ({ key, data: dataKosong(Boolean(idBersih)) }));

  useEffect(
    () => langgananLabSesi(idBersih, (data) => {
      setState({ key, data });
    }),
    [idBersih, key],
  );

  const data = state.key === key ? state.data : dataKosong(Boolean(idBersih));
  const cobaLagi = useCallback(() => setPercobaan((nilai) => nilai + 1), []);
  return { ...data, cobaLagi };
}
