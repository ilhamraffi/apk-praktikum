// SRS-03/04 praktikan — milik Fauzan. Kontrak attendance mengikuti src/types.
import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, runTransaction, serverTimestamp } from "@react-native-firebase/firestore";
import { auth, db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import type { CatatanPresensi, Kelas, ProfilUser, Sesi } from "../types";
import { validasiCatatanPresensi } from "../utils/presensiPraktikan";

interface InputPresensi {
  uid: string;
  sesiId: string;
  catatan: string;
}

/** Transaksi gagal saat offline; tidak mengantre presensi untuk sesi yang bisa
 * sudah ditutup saat koneksi pulih. Tidak ada efek UI di callback transaksi. */
export async function catatPresensiPraktikan(input: InputPresensi): Promise<void> {
  const { uid, sesiId } = input;
  if (!uid || !sesiId || uid.includes("/") || sesiId.includes("/")) {
    throw new Error("Identitas akun atau sesi tidak valid.");
  }
  const catatan = validasiCatatanPresensi(input.catatan);
  const cekAkun = () => {
    if (auth.currentUser?.uid !== uid) {
      throw new Error("Sesi akun berubah. Silakan masuk ulang sebelum melakukan presensi.");
    }
  };
  cekAkun();
  const sesiRef = doc(db, "sessions", sesiId);
  const presensiRef = doc(db, "sessions", sesiId, "attendance", uid);

  await runTransaction(db, async (transaksi) => {
    cekAkun();
    const sesiSnap = await transaksi.get(sesiRef);
    if (!sesiSnap.exists()) throw new Error("Sesi praktikum tidak ditemukan.");
    const sesi = sesiSnap.data() as Sesi;
    if (typeof sesi.classId !== "string" || !sesi.classId || sesi.classId.includes("/")) {
      throw new Error("Data kelas sesi tidak valid. Hubungi asisten.");
    }
    const [profilSnap, kelasSnap, presensiSnap] = await Promise.all([
      transaksi.get(doc(db, "users", uid)),
      transaksi.get(doc(db, "classes", sesi.classId)),
      transaksi.get(presensiRef),
    ]);
    const profil = profilSnap.data() as ProfilUser | undefined;
    const kelas = kelasSnap.data() as Kelas | undefined;
    if (!profilSnap.exists() || profil?.role !== "PRAKTIKAN") {
      throw new Error("Presensi hanya dapat dilakukan oleh akun praktikan.");
    }
    if (!kelasSnap.exists() || !Array.isArray(kelas?.pesertaUids) || !kelas.pesertaUids.includes(uid)) {
      throw new Error("Kamu tidak terdaftar sebagai peserta kelas ini.");
    }
    if (presensiSnap.exists()) throw new Error("Presensi untuk sesi ini sudah tercatat.");
    if (sesi.status !== "DIBUKA") {
      throw new Error(sesi.status === "DITUTUP" ? "Sesi sudah ditutup oleh asisten." : "Sesi belum dibuka oleh asisten.");
    }
    if (typeof profil.nama !== "string" || !profil.nama.trim() || typeof profil.nim !== "string" || !profil.nim.trim()) {
      throw new Error("Nama atau NIM pada profil belum lengkap. Hubungi asisten.");
    }
    cekAkun();
    transaksi.set(presensiRef, {
      nama: profil.nama.trim(),
      nim: profil.nim.trim(),
      statusKehadiran: "Hadir",
      catatan,
      waktu: serverTimestamp(),
    });
  });
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
