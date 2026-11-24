// src/hooks/useSesi.ts
// Sesi/jadwal (CRUD) + buka/tutup sesi — milik Ilham (SRS-02, 03, 04).
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";
import { auth, db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import type { Kelas, Sesi } from "../types";
import {
  formatJamInput,
  formatTanggalPanjang,
  keDate,
  tambahMinggu,
  urutkanSesi,
} from "../utils/waktuSesi";

export function sesiSamaLab(
  a: { labId?: string | null; ruangan?: string | null },
  b: { labId?: string | null; ruangan?: string | null },
): boolean {
  const labIdA = typeof a.labId === "string" ? a.labId.trim() : "";
  const labIdB = typeof b.labId === "string" ? b.labId.trim() : "";
  if (labIdA && labIdB) {
    return labIdA === labIdB;
  }
  const ruangA = typeof a.ruangan === "string" ? a.ruangan.trim().toLowerCase() : "";
  const ruangB = typeof b.ruangan === "string" ? b.ruangan.trim().toLowerCase() : "";
  return Boolean(ruangA && ruangB && ruangA === ruangB);
}

export function cekJadwalLabBentrok(
  kandidatList: {
    mulai: Date;
    selesai: Date;
    labId?: string | null;
    ruangan: string;
    modul: string;
  }[],
  daftarSesiAda: readonly Sesi[],
  abaikanSesiId?: string,
): string | null {
  for (const kandidat of kandidatList) {
    const mulaiBaru = kandidat.mulai.getTime();
    const selesaiBaru = kandidat.selesai.getTime();
    if (!Number.isFinite(mulaiBaru) || !Number.isFinite(selesaiBaru)) continue;

    for (const sesiAda of daftarSesiAda) {
      if (abaikanSesiId && sesiAda.id === abaikanSesiId) continue;
      if (sesiAda.status === "DITUTUP") continue;
      if (!sesiSamaLab(kandidat, sesiAda)) continue;

      const mulaiLama = keDate(sesiAda.mulai)?.getTime() ?? null;
      const selesaiLama = keDate(sesiAda.selesai)?.getTime() ?? null;
      if (mulaiLama == null || selesaiLama == null) continue;

      // Dua rentang waktu beririsan apabila mulaiBaru < selesaiLama dan selesaiBaru > mulaiLama
      if (mulaiBaru < selesaiLama && selesaiBaru > mulaiLama) {
        const tglLama = keDate(sesiAda.mulai)!;
        const tglSelesaiLama = keDate(sesiAda.selesai)!;
        const namaLab =
          kandidat.ruangan?.trim() || sesiAda.ruangan?.trim() || "laboratorium ini";
        const namaSesiLama =
          sesiAda.namaPraktikum?.trim() || "Praktikum lain";
        const modulLama = sesiAda.modul?.trim() ? ` (${sesiAda.modul.trim()})` : "";
        return `Jadwal bentrok di ${namaLab} dengan ${namaSesiLama}${modulLama} pada ${formatTanggalPanjang(tglLama)} pukul ${formatJamInput(tglLama)}–${formatJamInput(tglSelesaiLama)}.`;
      }
    }
  }
  return null;
}

/**
 * Daftar sesi real-time (opsional difilter per kelas).
 * Jika `opsi.semua === false` (default), hanya menampilkan sesi yang dimiliki
 * oleh asisten yang sedang login (`asistenUid === uidAktif`).
 * Jika `opsi.semua === true` (mis. untuk Peta Laboratorium), seluruh sesi ditampilkan.
 */
export function useDaftarSesi(kelasId?: string, opsi?: { semua?: boolean }) {
  const semua = opsi?.semua ?? false;
  const uidAktif = auth.currentUser?.uid ?? null;
  const [sesiRaw, setSesiRaw] = useState<Sesi[]>([]);
  const [milikKelasIds, setMilikKelasIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dariCache, setDariCache] = useState(false);

  useEffect(() => {
    if (semua || !uidAktif) return;
    const unsubKelas = onSnapshot(
      query(collection(db, "classes")),
      (snap) => {
        const ids = new Set<string>();
        for (const d of snap.docs) {
          const data = d.data() as Kelas;
          if (data.asistenUid === uidAktif) {
            ids.add(d.id);
          }
        }
        setMilikKelasIds(ids);
      },
      () => {},
    );
    return unsubKelas;
  }, [semua, uidAktif]);

  useEffect(() => {
    const q = kelasId
      ? query(collection(db, "sessions"), where("classId", "==", kelasId))
      : query(collection(db, "sessions"));
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        setSesiRaw(
          snap.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Sesi)
            .sort(urutkanSesi),
        );
        setDariCache(snap.metadata.fromCache);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(pesanError(err));
        setLoading(false);
      },
    );
    return unsub;
  }, [kelasId]);

  const sesi = useMemo(() => {
    if (semua || !uidAktif) return sesiRaw;
    return sesiRaw.filter(
      (s) =>
        s.asistenUid === uidAktif ||
        (s.classId && milikKelasIds.has(s.classId)),
    );
  }, [milikKelasIds, semua, sesiRaw, uidAktif]);

  // Tutup otomatis sesi DIBUKA yang telah melewati jam selesai (atau batas perpanjangan buka ulang).
  useEffect(() => {
    if (!uidAktif || sesiRaw.length === 0) return;

    const periksaAutoClose = () => {
      const sekarangMs = Date.now();
      for (const s of sesiRaw) {
        if (s.status !== "DIBUKA" || !s.id) continue;
        // Hanya asisten pemilik (atau bila sesi lama tanpa asistenUid) yang melakukan auto-close
        if (s.asistenUid && s.asistenUid !== uidAktif && !milikKelasIds.has(s.classId)) {
          continue;
        }
        const selesaiMs = keDate(s.selesai)?.getTime() ?? null;
        const perpanjanganMs = keDate(s.batasOtomatisTutup)?.getTime() ?? null;
        const batasAkhirMs =
          selesaiMs != null && perpanjanganMs != null
            ? Math.max(selesaiMs, perpanjanganMs)
            : (perpanjanganMs ?? selesaiMs);

        if (batasAkhirMs != null && sekarangMs >= batasAkhirMs) {
          void updateDoc(doc(db, "sessions", s.id), {
            status: "DITUTUP",
            kodePresensi: null,
            batasOtomatisTutup: null,
          }).catch(() => {
            void updateDoc(doc(db, "sessions", s.id!), { status: "DITUTUP" }).catch(() => {});
          });
        }
      }
    };

    periksaAutoClose();
    const timer = setInterval(periksaAutoClose, 30_000);
    return () => clearInterval(timer);
  }, [milikKelasIds, sesiRaw, uidAktif]);

  return { sesi, loading, error, dariCache };
}

interface SesiDetailState {
  id: string | undefined;
  sesi: Sesi | null;
  kelas: Kelas | null;
  loaded: boolean;
  error: string | null;
}

/** Detail satu sesi + kelas terkait, real-time. */
export function useSesiDetail(sesiId?: string) {
  const [state, setState] = useState<SesiDetailState>({
    id: sesiId,
    sesi: null,
    kelas: null,
    loaded: false,
    error: null,
  });

  // Reset saat id berganti (menyesuaikan state selama render).
  if (state.id !== sesiId) {
    setState({ id: sesiId, sesi: null, kelas: null, loaded: false, error: null });
  }

  useEffect(() => {
    if (!sesiId) return;
    return onSnapshot(
      doc(db, "sessions", sesiId),
      (snap) =>
        setState((prev) => ({
          ...prev,
          sesi: snap.exists() ? ({ ...snap.data(), id: snap.id } as Sesi) : null,
          loaded: true,
          error: null,
        })),
      (err) =>
        setState((prev) => ({ ...prev, loaded: true, error: pesanError(err) })),
    );
  }, [sesiId]);

  useEffect(() => {
    const classId = state.sesi?.classId;
    if (!classId || classId.includes("/")) return;
    return onSnapshot(
      doc(db, "classes", classId),
      (snap) =>
        setState((prev) => ({
          ...prev,
          kelas: snap.exists() ? ({ ...snap.data(), id: snap.id } as Kelas) : null,
        })),
      () => setState((prev) => ({ ...prev, kelas: null })),
    );
  }, [state.sesi?.classId]);

  return {
    sesi: state.sesi,
    kelas: state.kelas,
    totalPraktikan: state.kelas?.pesertaUids?.length ?? 0,
    loading: Boolean(sesiId) && !state.loaded,
    error: state.error,
  };
}

/** Input form sesi. `mulai`/`selesai` berupa Date (disimpan Firestore sebagai Timestamp). */
export interface InputSesi {
  classId: string;
  namaPraktikum: string; // disalin dari nama kelas
  modul: string;
  mulai: Date;
  selesai: Date;
  ruangan: string; // keterangan tampilan (nama laboratorium)
  labId?: string; // rujukan `labs/{labId}` untuk validasi lokasi
}

/** Batas jumlah pertemuan berulang (kira-kira satu semester). */
export const MAKS_PERTEMUAN = 20;

/**
 * Buat satu sesi, atau sesi berulang tiap minggu (`jumlahPertemuan` > 1).
 * Setiap pertemuan menjadi dokumen sesi sendiri (status & presensi terpisah),
 * dan semuanya ditulis dalam satu batch: berhasil semua atau gagal semua.
 */
export async function buatSesi(
  input: InputSesi,
  jumlahPertemuan = 1,
): Promise<string[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Silakan masuk sebagai asisten terlebih dahulu.");
  }

  // Pastikan kelas yang dipilih adalah milik asisten yang sedang login
  const kelasSnap = await getDoc(doc(db, "classes", input.classId));
  const kelasData = kelasSnap.data() as Kelas | undefined;
  if (kelasData?.asistenUid && kelasData.asistenUid !== uid) {
    throw new Error("Anda hanya dapat membuat sesi pada kelas yang Anda buat sendiri.");
  }

  const n = Math.max(1, Math.min(MAKS_PERTEMUAN, Math.floor(jumlahPertemuan)));
  const kandidatList = Array.from({ length: n }, (_, i) => ({
    mulai: tambahMinggu(input.mulai, i),
    selesai: tambahMinggu(input.selesai, i),
    labId: input.labId ?? null,
    ruangan: input.ruangan.trim(),
    modul: n > 1 ? `Pertemuan ${i + 1}` : input.modul.trim(),
  }));

  // Validasi anti-bentrok terhadap seluruh sesi di laboratorium yang sama
  const semuaSesiSnap = await getDocs(collection(db, "sessions"));
  const daftarSesiAda = semuaSesiSnap.docs.map(
    (d) => ({ ...d.data(), id: d.id }) as Sesi,
  );
  const pesanBentrok = cekJadwalLabBentrok(kandidatList, daftarSesiAda);
  if (pesanBentrok) {
    throw new Error(pesanBentrok);
  }

  const seriId = n > 1 ? doc(collection(db, "sessions")).id : null;
  const batch = writeBatch(db);
  const ids: string[] = [];

  for (let i = 0; i < n; i++) {
    const ref = doc(collection(db, "sessions"));
    const kandidat = kandidatList[i]!;
    ids.push(ref.id);
    batch.set(ref, {
      classId: input.classId,
      asistenUid: uid,
      namaPraktikum: input.namaPraktikum.trim(),
      modul: kandidat.modul,
      mulai: kandidat.mulai,
      selesai: kandidat.selesai,
      ruangan: kandidat.ruangan,
      labId: kandidat.labId,
      status: "BELUM_DIBUKA",
      seriId,
      pertemuanKe: n > 1 ? i + 1 : null,
    });
  }

  await batch.commit();
  return ids;
}

export async function perbaruiSesi(
  id: string,
  input: Partial<InputSesi>,
): Promise<void> {
  const uid = auth.currentUser?.uid;
  const sesiRef = doc(db, "sessions", id);
  const sesiSnap = await getDoc(sesiRef);
  if (!sesiSnap.exists()) {
    throw new Error("Sesi tidak ditemukan.");
  }
  const sesiSekarang = { ...sesiSnap.data(), id: sesiSnap.id } as Sesi;
  if (sesiSekarang.asistenUid && sesiSekarang.asistenUid !== uid) {
    throw new Error("Anda hanya dapat mengubah sesi dari kelas yang Anda kelola sendiri.");
  }

  const mulaiBaru = input.mulai ?? keDate(sesiSekarang.mulai);
  const selesaiBaru = input.selesai ?? keDate(sesiSekarang.selesai);
  const labIdBaru = input.labId !== undefined ? input.labId : sesiSekarang.labId;
  const ruanganBaru =
    input.ruangan !== undefined ? input.ruangan.trim() : sesiSekarang.ruangan;
  const modulBaru =
    input.modul !== undefined ? input.modul.trim() : sesiSekarang.modul;

  if (mulaiBaru && selesaiBaru) {
    const semuaSesiSnap = await getDocs(collection(db, "sessions"));
    const daftarSesiAda = semuaSesiSnap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as Sesi,
    );
    const pesanBentrok = cekJadwalLabBentrok(
      [
        {
          mulai: mulaiBaru,
          selesai: selesaiBaru,
          labId: labIdBaru ?? null,
          ruangan: ruanganBaru,
          modul: modulBaru,
        },
      ],
      daftarSesiAda,
      id,
    );
    if (pesanBentrok) {
      throw new Error(pesanBentrok);
    }
  }

  await updateDoc(sesiRef, {
    ...input,
    asistenUid: sesiSekarang.asistenUid ?? uid ?? null,
  });
}

/** Hapus sesi beserta subkoleksi attendance-nya. */
export async function hapusSesi(id: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  const sesiSnap = await getDoc(doc(db, "sessions", id));
  const sesiData = sesiSnap.data() as Sesi | undefined;
  if (sesiData?.asistenUid && sesiData.asistenUid !== uid) {
    throw new Error("Anda hanya dapat menghapus sesi yang Anda buat sendiri.");
  }
  try {
    const attSnap = await getDocs(collection(db, "sessions", id, "attendance"));
    if (!attSnap.empty) {
      const batch = writeBatch(db);
      attSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch {
    // Jika Firestore Security Rules memblokir delete pada subkoleksi attendance
    // (allow update, delete: if false), tetap lanjutkan menghapus dokumen sesi induk.
  }
  await deleteDoc(doc(db, "sessions", id));
}

const KARAKTER_KODE_PRESENSI = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DURASI_BUKA_ULANG_MS = 15 * 60 * 1000; // 15 menit masa aktif tambahan saat dibuka ulang

/** Menghasilkan kode presensi acak 6 karakter yang mudah dibaca di papan tulis/proyektor. */
export function buatKodePresensiAcak(panjang = 6): string {
  let hasil = "";
  for (let i = 0; i < panjang; i++) {
    const idx = Math.floor(Math.random() * KARAKTER_KODE_PRESENSI.length);
    hasil += KARAKTER_KODE_PRESENSI[idx];
  }
  return hasil;
}

/**
 * Mengecek apakah di laboratorium yang sama masih ada sesi lain yang sedang berstatus DIBUKA.
 * Mengembalikan daftar sesi aktif di lab tersebut (selain `abaikanSesiId`).
 */
export async function cariSesiAktifDiLabSama(
  sesiTarget: Pick<Sesi, "id" | "labId" | "ruangan">,
): Promise<Sesi[]> {
  const aktifSnap = await getDocs(
    query(collection(db, "sessions"), where("status", "==", "DIBUKA")),
  );
  const hasil: Sesi[] = [];
  for (const d of aktifSnap.docs) {
    if (sesiTarget.id && d.id === sesiTarget.id) continue;
    const sesiAktif = { ...d.data(), id: d.id } as Sesi;
    if (sesiSamaLab(sesiTarget, sesiAktif)) {
      hasil.push(sesiAktif);
    }
  }
  return hasil;
}

export async function bukaSesi(
  id: string,
  opsi?: { paksaTutupSesiLain?: boolean },
): Promise<string> {
  const uid = auth.currentUser?.uid;
  const sesiRef = doc(db, "sessions", id);
  const sesiSnap = await getDoc(sesiRef);
  if (!sesiSnap.exists()) {
    throw new Error("Sesi praktikum tidak ditemukan.");
  }
  const sesiData = { ...sesiSnap.data(), id: sesiSnap.id } as Sesi;
  if (sesiData.asistenUid && sesiData.asistenUid !== uid) {
    throw new Error("Anda hanya dapat membuka sesi praktikum milik Anda sendiri.");
  }

  // Jika asisten sudah menyetujui konfirmasi peringatan, tutup sesi lain yang masih aktif di lab yang sama
  if (opsi?.paksaTutupSesiLain) {
    const sesiBentrokAktif = await cariSesiAktifDiLabSama(sesiData);
    for (const sLain of sesiBentrokAktif) {
      if (!sLain.id) continue;
      try {
        await updateDoc(doc(db, "sessions", sLain.id), {
          status: "DITUTUP",
          kodePresensi: null,
          batasOtomatisTutup: null,
        });
      } catch {
        await updateDoc(doc(db, "sessions", sLain.id), { status: "DITUTUP" });
      }
    }
  }

  const kodeBaru = buatKodePresensiAcak(6);
  const selesaiDate = keDate(sesiData.selesai);
  const sudahLewatJamSelesai =
    selesaiDate != null && Date.now() >= selesaiDate.getTime();
  const batasOtomatisTutup = sudahLewatJamSelesai
    ? new Date(Date.now() + DURASI_BUKA_ULANG_MS)
    : null;

  try {
    await updateDoc(sesiRef, {
      status: "DIBUKA",
      kodePresensi: kodeBaru,
      batasOtomatisTutup,
    });
  } catch {
    // Fallback aman apabila Firestore Security Rules di server menolak field tambahan
    await updateDoc(sesiRef, { status: "DIBUKA" });
  }
  return kodeBaru;
}

/** Mengacak ulang kode presensi saat sesi sedang DIBUKA. */
export async function acakUlangKodePresensi(id: string): Promise<string> {
  const uid = auth.currentUser?.uid;
  const sesiRef = doc(db, "sessions", id);
  const sesiSnap = await getDoc(sesiRef);
  if (!sesiSnap.exists()) {
    throw new Error("Sesi praktikum tidak ditemukan.");
  }
  const sesiData = sesiSnap.data() as Sesi;
  if (sesiData.asistenUid && sesiData.asistenUid !== uid) {
    throw new Error("Anda hanya dapat memperbarui kode sesi milik Anda sendiri.");
  }
  if (sesiData.status !== "DIBUKA") {
    throw new Error("Kode presensi hanya dapat diacak saat sesi sedang dibuka.");
  }
  const kodeBaru = buatKodePresensiAcak(6);
  await updateDoc(sesiRef, { kodePresensi: kodeBaru });
  return kodeBaru;
}

export async function tutupSesi(id: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  const sesiRef = doc(db, "sessions", id);
  const sesiSnap = await getDoc(sesiRef);
  const sesiData = sesiSnap.data() as Sesi | undefined;
  if (sesiData?.asistenUid && sesiData.asistenUid !== uid) {
    throw new Error("Anda hanya dapat menutup sesi praktikum milik Anda sendiri.");
  }
  try {
    await updateDoc(sesiRef, {
      status: "DITUTUP",
      kodePresensi: null,
      batasOtomatisTutup: null,
    });
  } catch {
    await updateDoc(sesiRef, { status: "DITUTUP" });
  }
}

/**
 * Memperbarui seluruh sesi dalam satu seri pertemuan berulang (`seriId`).
 * Menyesuaikan tanggal/jam pertemuan ke-i berdasarkan tanggal `input.mulai` dan `input.selesai`
 * (pertemuan pertama) ditambah `(i * 7 hari)`, serta memvalidasi bentrok lab terhadap sesi di luar seri ini.
 */
export async function perbaruiSeriSesi(
  seriId: string,
  input: InputSesi,
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Silakan masuk sebagai asisten terlebih dahulu.");
  }
  const seriSnap = await getDocs(
    query(collection(db, "sessions"), where("seriId", "==", seriId)),
  );
  if (seriSnap.empty) {
    throw new Error("Rangkaian sesi tidak ditemukan.");
  }
  const daftarSeri = seriSnap.docs
    .map((d) => ({ ...d.data(), id: d.id }) as Sesi)
    .sort((a, b) => (a.pertemuanKe ?? 0) - (b.pertemuanKe ?? 0));

  for (const s of daftarSeri) {
    if (s.asistenUid && s.asistenUid !== uid) {
      throw new Error("Anda hanya dapat mengubah sesi milik Anda sendiri.");
    }
  }

  const kandidatList = daftarSeri.map((s, idx) => ({
    mulai: tambahMinggu(input.mulai, idx),
    selesai: tambahMinggu(input.selesai, idx),
    labId: input.labId ?? null,
    ruangan: input.ruangan.trim(),
    modul: s.modul || `Pertemuan ${idx + 1}`,
  }));

  const seriIdSet = new Set(daftarSeri.map((s) => s.id));
  const semuaSesiSnap = await getDocs(collection(db, "sessions"));
  const sesiLuarSeri = semuaSesiSnap.docs
    .filter((d) => !seriIdSet.has(d.id))
    .map((d) => ({ ...d.data(), id: d.id }) as Sesi);

  const pesanBentrok = cekJadwalLabBentrok(kandidatList, sesiLuarSeri);
  if (pesanBentrok) {
    throw new Error(pesanBentrok);
  }

  const batch = writeBatch(db);
  daftarSeri.forEach((s, idx) => {
    const kandidat = kandidatList[idx]!;
    batch.update(doc(db, "sessions", s.id!), {
      classId: input.classId,
      namaPraktikum: input.namaPraktikum.trim(),
      mulai: kandidat.mulai,
      selesai: kandidat.selesai,
      ruangan: kandidat.ruangan,
      labId: kandidat.labId,
      asistenUid: s.asistenUid ?? uid,
    });
  });
  await batch.commit();
}

/** Menghapus seluruh sesi dalam satu rangkaian seri pertemuan (`seriId`) sekaligus. */
export async function hapusSeriSesi(seriId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  const seriSnap = await getDocs(
    query(collection(db, "sessions"), where("seriId", "==", seriId)),
  );
  if (seriSnap.empty) return;

  for (const d of seriSnap.docs) {
    const data = d.data() as Sesi;
    if (data.asistenUid && data.asistenUid !== uid) {
      throw new Error("Anda hanya dapat menghapus sesi milik Anda sendiri.");
    }
  }

  for (const d of seriSnap.docs) {
    await hapusSesi(d.id);
  }
}
