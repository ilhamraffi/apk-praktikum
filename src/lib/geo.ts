import type { Koordinat, Lab } from "../types";

const RADIUS_BUMI_METER = 6_371_000;

function angkaTerbatas(nilai: number, minimum: number, maksimum: number): boolean {
  return Number.isFinite(nilai) && nilai >= minimum && nilai <= maksimum;
}

function validasiKoordinat(koordinat: Koordinat): void {
  if (
    !angkaTerbatas(koordinat.latitude, -90, 90) ||
    !angkaTerbatas(koordinat.longitude, -180, 180)
  ) {
    throw new Error("Koordinat lokasi tidak valid.");
  }
  if (
    koordinat.akurasiMeter != null &&
    !angkaTerbatas(koordinat.akurasiMeter, 0, 100_000)
  ) {
    throw new Error("Akurasi lokasi tidak valid.");
  }
}

function validasiLab(lab: Lab): void {
  validasiKoordinat(lab);
  if (!angkaTerbatas(lab.radiusMeter, 1, 250)) {
    throw new Error("Radius laboratorium tidak valid.");
  }
}

/** Menghitung jarak garis lurus terpendek antara dua koordinat GPS. */
export function hitungJarakMeter(
  pertama: Koordinat,
  kedua: Koordinat,
): number {
  validasiKoordinat(pertama);
  validasiKoordinat(kedua);

  const toRadians = (derajat: number) => derajat * (Math.PI / 180);
  const deltaLatitude = toRadians(kedua.latitude - pertama.latitude);
  const deltaLongitude = toRadians(kedua.longitude - pertama.longitude);
  const latitudePertama = toRadians(pertama.latitude);
  const latitudeKedua = toRadians(kedua.latitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudePertama) *
      Math.cos(latitudeKedua) *
      Math.sin(deltaLongitude / 2) ** 2;
  const sudut = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(RADIUS_BUMI_METER * sudut * 100) / 100;
}

export function cekDalamRadius(
  koordinat: Koordinat,
  lab: Lab,
  batasAkurasiMeter = 250,
): { dalamRadius: boolean; jarakMeter: number } {
  validasiLab(lab);
  validasiKoordinat(koordinat);
  if (!angkaTerbatas(batasAkurasiMeter, 0, 250)) {
    throw new Error("Batas akurasi lokasi tidak valid.");
  }
  if (
    koordinat.akurasiMeter == null ||
    koordinat.akurasiMeter > batasAkurasiMeter
  ) {
    return { dalamRadius: false, jarakMeter: Number.POSITIVE_INFINITY };
  }
  const jarakMeter = hitungJarakMeter(koordinat, lab);
  return { dalamRadius: jarakMeter <= lab.radiusMeter, jarakMeter };
}
