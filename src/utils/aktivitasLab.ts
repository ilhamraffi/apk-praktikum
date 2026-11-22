// src/utils/aktivitasLab.ts
// Utilitas murni untuk SRS-12, SRS-13, SRS-14, dan SRS-15 (Peta, Aktivitas Lab, & Notifikasi).
import type { Kelas, Lab, Sesi } from "../types";
import { keDate, teksWaktuSesi, urutkanSesi } from "./waktuSesi";

export interface SesiDenganKelas {
  sesi: Sesi;
  kelasLabel: string;
}

export interface RingkasanAktivitasLab {
  berlangsung: SesiDenganKelas[];
  berikutnya: SesiDenganKelas | null;
  totalSesi: number;
}

/** Apakah sesi terhubung ke laboratorium tertentu (`labId` cocok, atau fallback nama ruangan untuk sesi lama). */
export function sesiCocokDenganLab(sesi: Sesi, lab: Lab): boolean {
  const labIdSesi = typeof sesi.labId === "string" ? sesi.labId.trim() : "";
  const idLab = typeof lab.id === "string" ? lab.id.trim() : "";
  if (idLab && labIdSesi) {
    return labIdSesi === idLab;
  }
  if (!labIdSesi && lab.nama?.trim() && sesi.ruangan?.trim()) {
    return sesi.ruangan.trim().toLowerCase() === lab.nama.trim().toLowerCase();
  }
  return false;
}

export function formatLabelKelas(
  classId: string,
  mapKelas: ReadonlyMap<string, Kelas>,
  fallbackNama?: string,
): string {
  const kelas = mapKelas.get(classId);
  if (kelas) {
    return kelas.kode ? `${kelas.nama} (${kelas.kode})` : kelas.nama;
  }
  return fallbackNama?.trim() || "Kelas praktikum";
}

/**
 * SRS-13: Menentukan praktikum yang sedang berlangsung (`status === "DIBUKA"`)
 * dan praktikum berikutnya (`status === "BELUM_DIBUKA"` dengan waktu terdekat).
 */
export function ringkasAktivitasLab(
  lab: Lab | null | undefined,
  daftarSesi: readonly Sesi[],
  mapKelas: ReadonlyMap<string, Kelas>,
  sekarang: Date = new Date(),
): RingkasanAktivitasLab {
  if (!lab) {
    return { berlangsung: [], berikutnya: null, totalSesi: 0 };
  }

  const sesiLab = daftarSesi
    .filter((item) => sesiCocokDenganLab(item, lab))
    .slice()
    .sort(urutkanSesi);

  const bungkus = (sesi: Sesi): SesiDenganKelas => ({
    sesi,
    kelasLabel: formatLabelKelas(sesi.classId, mapKelas, sesi.namaPraktikum),
  });

  const berlangsung = sesiLab
    .filter((item) => item.status === "DIBUKA")
    .map(bungkus);

  const calonBerikutnya = sesiLab.filter((item) => item.status === "BELUM_DIBUKA");
  const waktuSekarang = sekarang.getTime();

  // Prioritaskan sesi BELUM_DIBUKA yang waktunya >= sekarang (atau sesi terdekat jika sudah lewat/tanpa timestamp).
  const akanDatang = calonBerikutnya.filter((item) => {
    const selesai = keDate(item.selesai) ?? keDate(item.mulai);
    return !selesai || selesai.getTime() >= waktuSekarang;
  });

  const terpilih = (akanDatang[0] ?? calonBerikutnya[0]) || null;

  return {
    berlangsung,
    berikutnya: terpilih ? bungkus(terpilih) : null,
    totalSesi: sesiLab.length,
  };
}

export function formatRingkasanSesiLab(item: SesiDenganKelas): {
  namaPraktikum: string;
  modul: string;
  kelasLabel: string;
  waktu: string;
  status: Sesi["status"];
} {
  return {
    namaPraktikum: item.sesi.namaPraktikum?.trim() || "Praktikum",
    modul: item.sesi.modul?.trim() || "-",
    kelasLabel: item.kelasLabel,
    waktu: teksWaktuSesi(item.sesi),
    status: item.sesi.status,
  };
}

const RUTE_NOTIFIKASI_VALID = [
  /^\/praktikan\/[A-Za-z0-9_-]+$/,
  /^\/praktikan\/presensi\/[A-Za-z0-9_-]+$/,
  /^\/praktikan\/izin$/,
  /^\/praktikan\/riwayat$/,
  /^\/praktikan$/,
  /^\/asisten\/[A-Za-z0-9_-]+$/,
  /^\/asisten\/izin\/[A-Za-z0-9_-]+$/,
  /^\/asisten\/izin$/,
  /^\/asisten\/lab$/,
  /^\/asisten\/kelas$/,
  /^\/asisten$/,
  /^\/peta$/,
];

export interface ProyeksiTitikPeta {
  xPersen: number;
  yPersen: number;
}

export interface TileOsmInfo {
  key: string;
  url: string;
  leftPx: number;
  topPx: number;
  sizePx: number;
}

const UKURAN_TILE_PX = 256;
const SUBDOMAIN_OSM = ["a", "b", "c"] as const;

export function spanMeterKeZoomOsm(spanMeter: number): number {
  if (spanMeter <= 130) return 18;
  if (spanMeter <= 300) return 17;
  if (spanMeter <= 650) return 16;
  if (spanMeter <= 1500) return 15;
  return 14;
}

export function latLngKePikselDunia(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const latAman = Math.max(-85.0511, Math.min(85.0511, lat));
  const latRad = (latAman * Math.PI) / 180;
  const x = ((lng + 180) / 360) * n * UKURAN_TILE_PX;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    n *
    UKURAN_TILE_PX;
  return { x, y };
}

/**
 * Menghitung daftar tile peta jalanan OpenStreetMap (grid 3x3) agar berpusat
 * persis pada koordinat `pusat` di dalam kanvas berukuran `lebarKanvas x tinggiKanvas`.
 */
export function hitungTileOsmKanvas(
  pusat: { latitude: number; longitude: number },
  spanMeter: number,
  lebarKanvas = 360,
  tinggiKanvas = 310,
): { tiles: TileOsmInfo[]; meterPerPiksel: number; zoom: number } {
  const zoom = spanMeterKeZoomOsm(spanMeter);
  const n = Math.pow(2, zoom);
  const pusatDunia = latLngKePikselDunia(pusat.latitude, pusat.longitude, zoom);
  const tilePusatX = Math.floor(pusatDunia.x / UKURAN_TILE_PX);
  const tilePusatY = Math.floor(pusatDunia.y / UKURAN_TILE_PX);

  const tiles: TileOsmInfo[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = tilePusatX + dx;
      const ty = tilePusatY + dy;
      if (ty < 0 || ty >= n) continue;
      const txNorm = ((tx % n) + n) % n;
      const sub = SUBDOMAIN_OSM[Math.abs(txNorm + ty) % SUBDOMAIN_OSM.length];
      const leftPx = Math.round(
        lebarKanvas / 2 + (tx * UKURAN_TILE_PX - pusatDunia.x),
      );
      const topPx = Math.round(
        tinggiKanvas / 2 + (ty * UKURAN_TILE_PX - pusatDunia.y),
      );
      tiles.push({
        key: `${zoom}-${txNorm}-${ty}`,
        url: `https://${sub}.tile.openstreetmap.org/${zoom}/${txNorm}/${ty}.png`,
        leftPx,
        topPx,
        sizePx: UKURAN_TILE_PX,
      });
    }
  }

  const radLat = (pusat.latitude * Math.PI) / 180;
  const meterPerPiksel =
    (156543.03392 * Math.cos(radLat)) / Math.pow(2, zoom);

  return { tiles, meterPerPiksel, zoom };
}

/**
 * SRS-12: Memproyeksikan koordinat (latitude, longitude) ke posisi kanvas peta
 * dalam persen (0..100) selaras dengan Web Mercator OpenStreetMap tiles.
 */
export function proyeksikanTitikKeKanvas(
  titik: { latitude: number; longitude: number },
  pusat: { latitude: number; longitude: number },
  spanMeter: number,
  lebarKanvas = 360,
  tinggiKanvas = 310,
): ProyeksiTitikPeta {
  const zoom = spanMeterKeZoomOsm(spanMeter);
  const pusatDunia = latLngKePikselDunia(pusat.latitude, pusat.longitude, zoom);
  const titikDunia = latLngKePikselDunia(titik.latitude, titik.longitude, zoom);

  const dxPx = titikDunia.x - pusatDunia.x;
  const dyPx = titikDunia.y - pusatDunia.y;

  const xRaw = 50 + (dxPx / Math.max(120, lebarKanvas)) * 100;
  const yRaw = 50 + (dyPx / Math.max(120, tinggiKanvas)) * 100;

  return {
    xPersen: Math.max(8, Math.min(92, Math.round(xRaw * 100) / 100)),
    yPersen: Math.max(10, Math.min(90, Math.round(yRaw * 100) / 100)),
  };
}

/**
 * SRS-14: Mengekstrak dan memvalidasi route dari payload `data.route` FCM
 * yang dikirim oleh `functions/src/index.ts`.
 */
export function ambilRuteNotifikasi(pesan: unknown): string | null {
  if (!pesan || typeof pesan !== "object") return null;
  const data = (pesan as { data?: Record<string, unknown> }).data;
  if (!data || typeof data !== "object") return null;
  const rawRoute = data.route;
  if (typeof rawRoute !== "string") return null;
  const bersih = rawRoute.trim();
  if (!bersih.startsWith("/") || bersih.includes("..")) return null;
  const cocok = RUTE_NOTIFIKASI_VALID.some((pola) => pola.test(bersih));
  return cocok ? bersih : null;
}
