// SRS-03/04 praktikan — milik Fauzan. Kontrak attendance mengikuti src/types.
import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot } from "@react-native-firebase/firestore";
import { db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import { catatPresensi } from "../lib/presensi";
import type { CatatanPresensi, Koordinat } from "../types";
import { siapkanCatatanPresensi } from "../utils/presensiPraktikan";

interface InputPresensi {
  uid: string;
  sesiId: string;
  catatan: string;
  koordinat: Koordinat;
  kodePresensi?: string;
}

/** Presensi Sprint 3 selalu divalidasi dan ditulis oleh Cloud Function. */
export async function catatPresensiPraktikan(input: InputPresensi): Promise<void> {
  const { uid, sesiId, koordinat, kodePresensi } = input;
  if (!uid || !sesiId || uid.includes("/") || sesiId.includes("/")) {
    throw new Error("Identitas akun atau sesi tidak valid.");
  }
  const catatan = siapkanCatatanPresensi(input.catatan);
  if (
    !koordinat ||
    !Number.isFinite(koordinat.latitude) ||
    !Number.isFinite(koordinat.longitude) ||
    koordinat.akurasiMeter == null ||
    !Number.isFinite(koordinat.akurasiMeter)
  ) {
    throw new Error("Lokasi perangkat belum tersedia.");
  }
  const kodeBersih = kodePresensi?.trim().toUpperCase();
  await catatPresensi(
    kodeBersih
      ? { sessionId: sesiId, catatan, koordinat, kodePresensi: kodeBersih }
      : { sessionId: sesiId, catatan, koordinat },
  );
}

interface DataPresensiPraktikan {
  catatan: Map<string, CatatanPresensi>;
  tertunda: Set<string>;
  loading: boolean;
  error: string | null;
  dariCache: boolean;
}

function dataKosong(loading = false): DataPresensiPraktikan {
  return { catatan: new Map(), tertunda: new Set(), loading, error: null, dariCache: false };
}

interface HasilSesi {
  loaded: boolean;
  presensi: CatatanPresensi | null;
  tertunda: boolean;
  dariCache: boolean;
}

/** Satu listener dokumen milik pengguna per sesi. Tidak membaca seluruh
 * attendance dan tidak menambah field uid/index collectionGroup ke kontrak. */
export function langgananPresensiPraktikan(
  uid: string | undefined,
  sesiIds: readonly string[],
  terima: (data: DataPresensiPraktikan) => void,
): () => void {
  const ids = [...new Set(sesiIds)].sort();
  terima(dataKosong(Boolean(uid && ids.length)));
  if (!uid || !ids.length) return () => {};

  let aktif = true;
  const berhentiListener: (() => void)[] = [];
  const hasil = new Map<string, HasilSesi>(ids.map((id) => [id, {
    loaded: false, presensi: null, tertunda: false, dariCache: true,
  }]));
  const berhenti = () => {
    aktif = false;
    berhentiListener.splice(0).forEach((unsubscribe) => unsubscribe());
  };
  const gagal = (error: unknown) => {
    if (!aktif) return;
    berhenti();
    terima({ ...dataKosong(), error: pesanError(error) });
  };
  const kirim = () => {
    if (!aktif) return;
    const catatan = new Map<string, CatatanPresensi>();
    const tertunda = new Set<string>();
    hasil.forEach((item, id) => {
      if (item.presensi) catatan.set(id, item.presensi);
      if (item.tertunda) tertunda.add(id);
    });
    const semua = [...hasil.values()];
    terima({
      catatan, tertunda,
      loading: semua.some((item) => !item.loaded),
      error: null,
      dariCache: semua.some((item) => item.dariCache),
    });
  };

  for (const id of ids) {
    if (!aktif) break;
    try {
      const unsubscribe = onSnapshot(
        doc(db, "sessions", id, "attendance", uid),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!aktif) return;
          hasil.set(id, {
            loaded: true,
            presensi: snapshot.exists() ? { ...snapshot.data(), uid } as CatatanPresensi : null,
            tertunda: snapshot.metadata.hasPendingWrites,
            dariCache: snapshot.metadata.fromCache,
          });
          kirim();
        },
        gagal,
      );
      if (aktif) berhentiListener.push(unsubscribe);
      else unsubscribe();
    } catch (error) {
      gagal(error);
    }
  }
  return berhenti;
}

export function usePresensiPraktikan(uid: string | undefined, sesiIds: readonly string[]) {
  const [percobaan, setPercobaan] = useState(0);
  const idsKey = JSON.stringify([...new Set(sesiIds)].sort());
  const key = JSON.stringify([uid ?? null, idsKey, percobaan]);
  const [state, setState] = useState(() => ({ key, data: dataKosong(Boolean(uid && sesiIds.length)) }));

  useEffect(() => langgananPresensiPraktikan(uid, JSON.parse(idsKey) as string[], (data) => {
    setState({ key, data });
  }), [uid, idsKey, key]);

  const data = state.key === key ? state.data : dataKosong(Boolean(uid && sesiIds.length));
  const cobaLagi = useCallback(() => setPercobaan((nilai) => nilai + 1), []);
  return { ...data, cobaLagi };
}
