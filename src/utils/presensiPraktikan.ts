// Utilitas fitur praktikan — milik Fauzan.
import type { StatusLokasi } from "../hooks/useLokasiPerangkat";
import type { CatatanPresensi, Koordinat, Lab, Sesi } from "../types";

export const BATAS_CATATAN_PRESENSI = 500;
export const CATATAN_PRESENSI_DEFAULT = "Hadir";
export const BATAS_AKURASI_LOKASI_METER = 250;
export const BATAS_TUNGGU_LOKASI_MS = 15_000;

export function validasiCatatanPresensi(nilai: string): string {
  const catatan = nilai.trim();
  if (catatan.length > BATAS_CATATAN_PRESENSI) {
    throw new Error(`Catatan maksimal ${BATAS_CATATAN_PRESENSI} karakter.`);
  }
  return catatan;
}

/** Menyiapkan catatan untuk Cloud Function (tetap opsional di UI, default "Hadir"). */
export function siapkanCatatanPresensi(nilai: string): string {
  const catatan = validasiCatatanPresensi(nilai);
  return catatan || CATATAN_PRESENSI_DEFAULT;
}

export function formatWaktuPresensiPraktikan(nilai: unknown): string {
  const kosong = "Waktu server belum tersedia";
  try {
    let tanggal: Date;
    if (nilai && typeof nilai === "object" && "toDate" in nilai && typeof nilai.toDate === "function") {
      tanggal = nilai.toDate();
    } else if (typeof nilai === "string") {
      if (/^([01]\d|2[0-3])[:.][0-5]\d(?:[:.][0-5]\d)?(?:\s+(?:WIB|WITA|WIT))?$/i.test(nilai.trim())) {
        return nilai.trim();
      }
      if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(nilai)) return kosong;
      tanggal = new Date(nilai);
    } else {
      return kosong;
    }
    if (!(tanggal instanceof Date) || !Number.isFinite(tanggal.getTime())) return kosong;
    return tanggal.toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: "Asia/Jakarta",
    }) + " WIB";
  } catch {
    return kosong;
  }
}

export function formatJarakMeter(
  jarakMeter: number | null | undefined,
  batasMaksimal?: number | null,
): string {
  if (jarakMeter == null || !Number.isFinite(jarakMeter) || jarakMeter < 0) {
    return "Belum tersedia";
  }
  if (jarakMeter >= 1000) {
    return `${(jarakMeter / 1000).toFixed(2).replace(".", ",")} km`;
  }
  let dibulatkan = Math.round(jarakMeter * 10) / 10;
  if (
    batasMaksimal != null &&
    Number.isFinite(batasMaksimal) &&
    jarakMeter > batasMaksimal &&
    dibulatkan <= batasMaksimal
  ) {
    dibulatkan = Math.ceil(jarakMeter * 10) / 10;
  }
  return `${Number.isInteger(dibulatkan) ? String(dibulatkan) : dibulatkan.toFixed(1).replace(".", ",")} m`;
}

/** Membaca rujukan `labId` dari dokumen sesi tanpa mengubah kontrak global `Sesi`. */
export function ambilLabIdSesi(sesi: Sesi | null | undefined): string | undefined {
  if (!sesi || typeof sesi !== "object") return undefined;
  const raw = (sesi as Sesi & { labId?: unknown }).labId;
  if (typeof raw !== "string") return undefined;
  const bersih = raw.trim();
  return bersih && !bersih.includes("/") ? bersih : undefined;
}

export type KodeStatusLokasiPresensi =
  | "sesi_tidak_valid"
  | "presensi_memuat"
  | "presensi_error"
  | "sudah_presensi"
  | "sesi_belum_dibuka"
  | "sesi_ditutup"
  | "lab_belum_diatur"
  | "lab_memuat"
  | "lab_error"
  | "lab_tidak_ditemukan"
  | "lab_tidak_valid"
  | "izin_ditolak"
  | "layanan_mati"
  | "lokasi_memuat"
  | "lokasi_timeout"
  | "lokasi_tidak_tersedia"
  | "akurasi_rendah"
  | "di_luar_radius"
  | "offline"
  | "dalam_radius";

export type AksiLokasiPresensi =
  | "none"
  | "minta_izin_dan_pengaturan"
  | "pengaturan_dan_coba_lagi"
  | "coba_lagi_lokasi"
  | "coba_lagi_lab";

export interface EvaluasiPresensiLokasiInput {
  sesi: Sesi | null | undefined;
  presensi?: CatatanPresensi | null;
  presensiLoading: boolean;
  presensiError?: string | null;
  dariCache: boolean;
  lab: Lab | null;
  labLoading: boolean;
  labError?: string | null;
  lokasi: {
    koordinat: Koordinat | null;
    akurasiMeter: number | null;
    status: StatusLokasi;
  };
  lokasiTimeout?: boolean;
  cekDalamRadius: (
    koordinat: Koordinat,
    lab: Lab,
    batasAkurasiMeter?: number,
  ) => { dalamRadius: boolean; jarakMeter: number };
}

export interface HasilEvaluasiPresensiLokasi {
  kode: KodeStatusLokasiPresensi;
  bisaPresensi: boolean;
  pesanNonaktif?: string;
  judulStatus: string;
  deskripsiStatus: string;
  labelLencana: string;
  nada: "sukses" | "peringatan" | "error" | "netral";
  jarakMeter: number | null;
  radiusMeter: number | null;
  akurasiMeter: number | null;
  dalamRadius: boolean | null;
  aksiLokasi: AksiLokasiPresensi;
}

function angkaDalamRentang(nilai: unknown, min: number, maks: number): nilai is number {
  return typeof nilai === "number" && Number.isFinite(nilai) && nilai >= min && nilai <= maks;
}

function labValid(lab: Lab): boolean {
  return (
    angkaDalamRentang(lab.latitude, -90, 90) &&
    angkaDalamRentang(lab.longitude, -180, 180) &&
    angkaDalamRentang(lab.radiusMeter, 1, 250)
  );
}

/** Mengevaluasi seluruh kondisi SRS-10 & SRS-15 untuk layar presensi lokasi. */
export function evaluasiPresensiLokasi(
  input: EvaluasiPresensiLokasiInput,
): HasilEvaluasiPresensiLokasi {
  const {
    sesi,
    presensi,
    presensiLoading,
    presensiError,
    dariCache,
    lab,
    labLoading,
    labError,
    lokasi,
    lokasiTimeout = false,
    cekDalamRadius,
  } = input;

  const akurasiRaw = lokasi.koordinat?.akurasiMeter ?? lokasi.akurasiMeter ?? null;
  const akurasiMeter = typeof akurasiRaw === "number" && Number.isFinite(akurasiRaw) && akurasiRaw >= 0
    ? akurasiRaw
    : null;
  const radiusMeter = lab && angkaDalamRentang(lab.radiusMeter, 1, 250) ? lab.radiusMeter : null;

  const dasar = {
    bisaPresensi: false,
    jarakMeter: null as number | null,
    radiusMeter,
    akurasiMeter,
    dalamRadius: null as boolean | null,
    aksiLokasi: "none" as AksiLokasiPresensi,
  };

  if (!sesi?.id) {
    return {
      ...dasar,
      kode: "sesi_tidak_valid",
      pesanNonaktif: "Identitas sesi tidak valid.",
      judulStatus: "Sesi tidak valid",
      deskripsiStatus: "Identitas sesi tidak ditemukan atau rusak.",
      labelLencana: "Tidak valid",
      nada: "error",
    };
  }

  if (presensiLoading) {
    return {
      ...dasar,
      kode: "presensi_memuat",
      pesanNonaktif: "Sedang memeriksa kehadiranmu...",
      judulStatus: "Memeriksa status presensi",
      deskripsiStatus: "Menunggu data kehadiranmu dari server.",
      labelLencana: "Memuat",
      nada: "netral",
    };
  }

  if (presensiError) {
    return {
      ...dasar,
      kode: "presensi_error",
      pesanNonaktif: presensiError,
      judulStatus: "Gagal memeriksa kehadiran",
      deskripsiStatus: presensiError,
      labelLencana: "Gangguan",
      nada: "error",
      aksiLokasi: "coba_lagi_lab",
    };
  }

  if (presensi) {
    return {
      ...dasar,
      kode: "sudah_presensi",
      pesanNonaktif: "Presensi untuk sesi ini sudah tercatat.",
      judulStatus: "Presensi sudah tercatat",
      deskripsiStatus: "Kehadiranmu sudah tersimpan. Presensi ganda tidak diperbolehkan.",
      labelLencana: "Sudah hadir",
      nada: "sukses",
      jarakMeter: typeof presensi.jarakMeter === "number" && Number.isFinite(presensi.jarakMeter)
        ? presensi.jarakMeter
        : null,
      dalamRadius: true,
    };
  }

  if (sesi.status === "DITUTUP") {
    return {
      ...dasar,
      kode: "sesi_ditutup",
      pesanNonaktif: "Sesi sudah ditutup oleh asisten.",
      judulStatus: "Sesi sudah ditutup",
      deskripsiStatus: "Presensi tidak lagi menerima kiriman karena sesi telah ditutup asisten.",
      labelLencana: "Ditutup",
      nada: "netral",
    };
  }

  if (sesi.status !== "DIBUKA") {
    return {
      ...dasar,
      kode: "sesi_belum_dibuka",
      pesanNonaktif: "Presensi tersedia setelah sesi dibuka oleh asisten.",
      judulStatus: "Sesi belum dibuka",
      deskripsiStatus: "Pemeriksaan lokasi dan tombol presensi akan aktif otomatis begitu asisten membuka sesi.",
      labelLencana: "Menunggu sesi",
      nada: "netral",
    };
  }

  const labId = ambilLabIdSesi(sesi);
  if (!labId) {
    return {
      ...dasar,
      kode: "lab_belum_diatur",
      pesanNonaktif: "Laboratorium untuk sesi ini belum diatur oleh asisten.",
      judulStatus: "Laboratorium belum diatur",
      deskripsiStatus: "Sesi belum terhubung ke lokasi laboratorium. Hubungi asisten agar mengatur laboratorium sesi ini.",
      labelLencana: "Lab belum diatur",
      nada: "peringatan",
    };
  }

  if (labLoading) {
    return {
      ...dasar,
      kode: "lab_memuat",
      pesanNonaktif: "Memuat data laboratorium sesi...",
      judulStatus: "Memuat data laboratorium",
      deskripsiStatus: "Mengambil koordinat dan radius laboratorium dari server.",
      labelLencana: "Memuat",
      nada: "netral",
    };
  }

  if (labError) {
    return {
      ...dasar,
      kode: "lab_error",
      pesanNonaktif: labError,
      judulStatus: "Gagal memuat data laboratorium",
      deskripsiStatus: labError,
      labelLencana: "Gangguan",
      nada: "error",
      aksiLokasi: "coba_lagi_lab",
    };
  }

  if (!lab) {
    return {
      ...dasar,
      kode: "lab_tidak_ditemukan",
      pesanNonaktif: "Data laboratorium sesi tidak ditemukan.",
      judulStatus: "Laboratorium tidak ditemukan",
      deskripsiStatus: "Dokumen laboratorium tidak tersedia di server. Coba muat ulang atau hubungi asisten.",
      labelLencana: "Tidak ditemukan",
      nada: "error",
      aksiLokasi: "coba_lagi_lab",
    };
  }

  if (!labValid(lab)) {
    return {
      ...dasar,
      kode: "lab_tidak_valid",
      pesanNonaktif: "Koordinat atau radius laboratorium tidak valid.",
      judulStatus: "Konfigurasi laboratorium tidak valid",
      deskripsiStatus: "Koordinat atau radius laboratorium berada di luar batas yang diizinkan (1–250 m). Hubungi asisten.",
      labelLencana: "Tidak valid",
      nada: "error",
    };
  }

  if (lokasi.status === "izin_ditolak") {
    return {
      ...dasar,
      kode: "izin_ditolak",
      pesanNonaktif: "Izin lokasi diperlukan untuk presensi.",
      judulStatus: "Izin lokasi ditolak",
      deskripsiStatus: "HadirLab membutuhkan izin lokasi untuk memastikan perangkat berada di dalam radius laboratorium saat presensi.",
      labelLencana: "Izin ditolak",
      nada: "error",
      aksiLokasi: "minta_izin_dan_pengaturan",
    };
  }

  if (lokasi.status === "layanan_mati") {
    return {
      ...dasar,
      kode: "layanan_mati",
      pesanNonaktif: "Aktifkan layanan lokasi untuk presensi.",
      judulStatus: "Layanan lokasi (GPS) mati",
      deskripsiStatus: "Nyalakan layanan lokasi di perangkatmu, lalu tekan Coba lagi untuk memeriksa radius laboratorium.",
      labelLencana: "GPS nonaktif",
      nada: "peringatan",
      aksiLokasi: "pengaturan_dan_coba_lagi",
    };
  }

  if (lokasi.status === "tidak_tersedia") {
    return {
      ...dasar,
      kode: "lokasi_tidak_tersedia",
      pesanNonaktif: "Lokasi belum tersedia. Coba lagi.",
      judulStatus: "Lokasi belum tersedia",
      deskripsiStatus: "Koordinat GPS belum dapat dibaca. Pastikan sinyal GPS memadai lalu coba muat ulang lokasi.",
      labelLencana: "Belum tersedia",
      nada: "peringatan",
      aksiLokasi: "coba_lagi_lokasi",
    };
  }

  if (lokasi.status === "memuat" || !lokasi.koordinat) {
    if (lokasiTimeout) {
      return {
        ...dasar,
        kode: "lokasi_timeout",
        pesanNonaktif: "Pencarian lokasi melewati batas waktu. Coba lagi.",
        judulStatus: "Pencarian lokasi melewati batas waktu",
        deskripsiStatus: "Perangkat belum mendapatkan koordinat GPS. Pastikan GPS aktif atau pindah ke area dengan sinyal lebih baik, lalu coba lagi.",
        labelLencana: "Waktu habis",
        nada: "peringatan",
        aksiLokasi: "coba_lagi_lokasi",
      };
    }
    return {
      ...dasar,
      kode: "lokasi_memuat",
      pesanNonaktif: "Mencari lokasi perangkat...",
      judulStatus: "Mencari lokasi perangkat...",
      deskripsiStatus: `Menunggu koordinat GPS untuk menghitung jarak ke ${lab.nama}.`,
      labelLencana: "Mencari GPS",
      nada: "netral",
    };
  }

  if (akurasiMeter == null || akurasiMeter > BATAS_AKURASI_LOKASI_METER) {
    const infoAkurasi = akurasiMeter != null ? ` (±${formatJarakMeter(akurasiMeter)})` : "";
    return {
      ...dasar,
      kode: "akurasi_rendah",
      pesanNonaktif: "Akurasi lokasi belum cukup. Tunggu GPS lebih stabil lalu coba lagi.",
      judulStatus: "Akurasi GPS belum cukup",
      deskripsiStatus: `Akurasi GPS saat ini${infoAkurasi} melebihi batas ${BATAS_AKURASI_LOKASI_METER} m. Tunggu sebentar atau muat ulang di area yang lebih terbuka.`,
      labelLencana: "GPS kurang akurat",
      nada: "peringatan",
      aksiLokasi: "coba_lagi_lokasi",
    };
  }

  let hasilCek: { dalamRadius: boolean; jarakMeter: number };
  try {
    hasilCek = cekDalamRadius(
      {
        latitude: lokasi.koordinat.latitude,
        longitude: lokasi.koordinat.longitude,
        akurasiMeter,
      },
      lab,
      BATAS_AKURASI_LOKASI_METER,
    );
  } catch {
    return {
      ...dasar,
      kode: "lokasi_tidak_tersedia",
      pesanNonaktif: "Lokasi belum tersedia. Coba lagi.",
      judulStatus: "Koordinat lokasi tidak valid",
      deskripsiStatus: "Data koordinat perangkat tidak valid. Coba muat ulang lokasi.",
      labelLencana: "Belum tersedia",
      nada: "peringatan",
      aksiLokasi: "coba_lagi_lokasi",
    };
  }

  if (!Number.isFinite(hasilCek.jarakMeter)) {
    return {
      ...dasar,
      kode: "akurasi_rendah",
      pesanNonaktif: "Akurasi lokasi belum cukup. Tunggu GPS lebih stabil lalu coba lagi.",
      judulStatus: "Akurasi GPS belum cukup",
      deskripsiStatus: `Akurasi lokasi melebihi batas ${BATAS_AKURASI_LOKASI_METER} m. Coba muat ulang lokasi.`,
      labelLencana: "GPS kurang akurat",
      nada: "peringatan",
      aksiLokasi: "coba_lagi_lokasi",
    };
  }

  if (!hasilCek.dalamRadius) {
    const teksJarak = formatJarakMeter(hasilCek.jarakMeter, lab.radiusMeter);
    const teksRadius = formatJarakMeter(lab.radiusMeter);
    return {
      ...dasar,
      kode: "di_luar_radius",
      pesanNonaktif: `Kamu berada di luar radius laboratorium (${teksJarak} dari ${lab.nama}, maks. ${teksRadius}).`,
      judulStatus: "Di luar radius laboratorium",
      deskripsiStatus: `Jarakmu saat ini ${teksJarak} dari ${lab.nama}, melebihi radius ${teksRadius}. Mendekatlah ke laboratorium lalu perbarui lokasi.`,
      labelLencana: "Di luar radius",
      nada: "error",
      jarakMeter: hasilCek.jarakMeter,
      dalamRadius: false,
      aksiLokasi: "coba_lagi_lokasi",
    };
  }

  if (dariCache) {
    return {
      ...dasar,
      kode: "offline",
      pesanNonaktif: "Menunggu konfirmasi data dari server. Periksa koneksi internetmu.",
      judulStatus: "Koneksi internet terganggu",
      deskripsiStatus: `Lokasi sudah di dalam radius ${lab.nama} (${formatJarakMeter(hasilCek.jarakMeter)}), tetapi presensi memerlukan koneksi internet untuk validasi server.`,
      labelLencana: "Offline",
      nada: "peringatan",
      jarakMeter: hasilCek.jarakMeter,
      dalamRadius: true,
      aksiLokasi: "coba_lagi_lab",
    };
  }

  return {
    ...dasar,
    kode: "dalam_radius",
    bisaPresensi: true,
    pesanNonaktif: undefined,
    judulStatus: "Di dalam radius laboratorium",
    deskripsiStatus: `Jarakmu ${formatJarakMeter(hasilCek.jarakMeter)} dari ${lab.nama} (batas ${formatJarakMeter(lab.radiusMeter)}). Validasi akhir tetap diperiksa server saat presensi dikirim.`,
    labelLencana: "Di dalam radius",
    nada: "sukses",
    jarakMeter: hasilCek.jarakMeter,
    dalamRadius: true,
    aksiLokasi: "coba_lagi_lokasi",
  };
}
