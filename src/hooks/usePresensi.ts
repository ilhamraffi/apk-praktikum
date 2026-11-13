// src/hooks/usePresensi.ts
// Presensi sesi (real-time) — dipakai Ilham untuk rekap kehadiran.
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "@react-native-firebase/firestore";
import { db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import type { CatatanPresensi } from "../types";

interface PresensiState {
  id: string | undefined;
  catatan: CatatanPresensi[];
  loaded: boolean;
  error: string | null;
}

/** Presensi sebuah sesi, real-time (onSnapshot). */
export function usePresensiSesi(sesiId?: string) {
  const [state, setState] = useState<PresensiState>({
    id: sesiId,
    catatan: [],
    loaded: false,
    error: null,
  });

  // Reset saat id berganti (menyesuaikan state selama render).
  if (state.id !== sesiId) {
    setState({ id: sesiId, catatan: [], loaded: false, error: null });
  }

  useEffect(() => {
    if (!sesiId) return;
    return onSnapshot(
      collection(db, "sessions", sesiId, "attendance"),
      (snap) =>
        setState((prev) => ({
          ...prev,
          catatan: snap.docs.map(
            (d) => ({ uid: d.id, ...d.data() }) as CatatanPresensi,
          ),
          loaded: true,
          error: null,
        })),
      (err) =>
        setState((prev) => ({ ...prev, loaded: true, error: pesanError(err) })),
    );
  }, [sesiId]);

  return {
    catatan: state.catatan,
    loading: Boolean(sesiId) && !state.loaded,
    error: state.error,
  };
}
