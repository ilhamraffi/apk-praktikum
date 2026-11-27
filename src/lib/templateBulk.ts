// src/lib/templateBulk.ts
// Kontrak PM Sprint 4 (SRS-18): generator template CSV unduhan dan parser baris
// untuk 3 fitur bulk insert TERPISAH (lab per matkul, praktikan ke lab, asprak ke lab).
// Hasil parse dirancang agar siap ditampilkan pada ScrollView interaktif (accept/deny/edit).
import type { JenisBulkInsert } from "../types";
import {
  GRACE_PERIOD_DEFAULT_MENIT,
  GRACE_PERIOD_MAKS_MENIT,
  NOMINAL_DENDA_DEFAULT,
  NOMINAL_DENDA_MAKS,
} from "./denda";

export interface TemplateCsvInfo {
  jenis: JenisBulkInsert;
  namaFile: string;
  header: readonly string[];
  konten: string;
}

export interface DataBarisLabBulk {
  nama: string;
  gedung: string;
  latitude: string;
  longitude: string;
  radiusMeter: string;
  gracePeriodMenit: string;
  nominalDenda: string;
}

export interface DataBarisPenggunaBulk {
  nim: string;
  nama: string;
  email: string;
}

export type DataBarisBulk = DataBarisLabBulk | DataBarisPenggunaBulk;

export interface BarisBulkItem<T extends DataBarisBulk = DataBarisBulk> {
  id: string;
  nomorBaris: number;
  data: T;
  diterima: boolean;
  masalah: string[];
}

const DEFINISI_TEMPLATE: Record<
  JenisBulkInsert,
  { namaFile: string; header: readonly string[]; contoh: readonly string[][] }
> = {
  lab: {
    namaFile: "template-bulk-lab.csv",
    header: [
      "nama",
      "gedung",
      "latitude",
      "longitude",
      "radiusMeter",
      "gracePeriodMenit",
      "nominalDenda",
    ],
    contoh: [
      ["Lab Komputasi Dasar E301", "Gedung E FSM UNDIP", "-7.048688", "110.441063", "100", "15", "5000"],
      ["Lab Jaringan E302", "Gedung E FSM UNDIP", "-7.048720", "110.441100", "100", "15", "5000"],
    ],
  },
  praktikan: {
    namaFile: "template-bulk-praktikan.csv",
    header: ["nim", "nama", "email"],
    contoh: [
      ["24060124140001", "Budi Santoso", "budi.santoso@students.undip.ac.id"],
      ["24060124140002", "Siti Aminah", "siti.aminah@students.undip.ac.id"],
    ],
  },
  asprak: {
    namaFile: "template-bulk-asprak.csv",
    header: ["nim", "nama", "email"],
    contoh: [
      ["24060122120001", "Andi Pratama", "andi.pratama@students.undip.ac.id"],
      ["24060122120002", "Dewi Lestari", "dewi.lestari@students.undip.ac.id"],
    ],
  },
};

function escapeCsvCell(nilai: string): string {
  if (/[",\r\n]/.test(nilai)) {
    return `"${nilai.replace(/"/g, '""')}"`;
  }
  return nilai;
}

/** Menghasilkan isi & nama file template CSV untuk masing-masing bulk insert terpisah. */
export function buatTemplateCsv(jenis: JenisBulkInsert): TemplateCsvInfo {
  const def = DEFINISI_TEMPLATE[jenis];
  const baris = [
    def.header.join(","),
    ...def.contoh.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return {
    jenis,
    namaFile: def.namaFile,
    header: def.header,
    konten: `${baris.join("\n")}\n`,
  };
}

function deteksiPemisah(barisPertama: string): "," | ";" {
  let koma = 0;
  let titikKoma = 0;
  let dalamKutip = false;
  for (const ch of barisPertama) {
    if (ch === '"') dalamKutip = !dalamKutip;
    else if (!dalamKutip && ch === ",") koma += 1;
    else if (!dalamKutip && ch === ";") titikKoma += 1;
  }
  return titikKoma > koma ? ";" : ",";
}

function pecahBarisCsv(teks: string, pemisah: "," | ";"): string[][] {
  const hasil: string[][] = [];
  let baris: string[] = [];
  let sel = "";
  let dalamKutip = false;

  const bersih = teks.replace(/^\uFEFF/, "");
  for (let i = 0; i < bersih.length; i += 1) {
    const ch = bersih[i];
    const berikut = bersih[i + 1];

    if (dalamKutip) {
      if (ch === '"' && berikut === '"') {
        sel += '"';
        i += 1;
      } else if (ch === '"') {
        dalamKutip = false;
      } else {
        sel += ch;
      }
      continue;
    }

    if (ch === '"') {
      dalamKutip = true;
    } else if (ch === pemisah) {
      baris.push(sel.trim());
      sel = "";
    } else if (ch === "\r" && berikut === "\n") {
      baris.push(sel.trim());
      hasil.push(baris);
      baris = [];
      sel = "";
      i += 1;
    } else if (ch === "\n" || ch === "\r") {
      baris.push(sel.trim());
      hasil.push(baris);
      baris = [];
      sel = "";
    } else {
      sel += ch;
    }
  }

  if (sel.length > 0 || baris.length > 0) {
    baris.push(sel.trim());
    hasil.push(baris);
  }

  return hasil.filter((row) => row.some((nilai) => nilai.length > 0));
}

function parseAngka(teks: string): number | null {
  const bersih = teks.trim().replace(",", ".");
  if (!bersih || !/^-?\d+(\.\d+)?$/.test(bersih)) return null;
  const angka = Number(bersih);
  return Number.isFinite(angka) ? angka : null;
}

/** Memvalidasi satu baris bulk setelah di-parse atau diedit Aslab di ScrollView. */
export function validasiBarisBulk(
  jenis: JenisBulkInsert,
  data: DataBarisBulk,
): string[] {
  const masalah: string[] = [];

  if (jenis === "lab") {
    const d = data as DataBarisLabBulk;
    if (!d.nama.trim()) masalah.push("Nama lab masih kosong.");
    const lat = parseAngka(d.latitude);
    const lng = parseAngka(d.longitude);
    const radius = parseAngka(d.radiusMeter);
    const grace = parseAngka(d.gracePeriodMenit || String(GRACE_PERIOD_DEFAULT_MENIT));
    const denda = parseAngka(d.nominalDenda || String(NOMINAL_DENDA_DEFAULT));

    if (lat == null || lat < -90 || lat > 90) masalah.push("Latitude harus antara -90 dan 90.");
    if (lng == null || lng < -180 || lng > 180) masalah.push("Longitude harus antara -180 dan 180.");
    if (radius == null || radius < 1 || radius > 250) {
      masalah.push("Radius presensi harus antara 1–250 meter.");
    }
    if (grace == null || grace < 0 || grace > GRACE_PERIOD_MAKS_MENIT) {
      masalah.push(`Batas keterlambatan harus 0–${GRACE_PERIOD_MAKS_MENIT} menit.`);
    }
    if (denda == null || denda < 0 || denda > NOMINAL_DENDA_MAKS) {
      masalah.push("Nominal denda tidak valid.");
    }
    return masalah;
  }

  const u = data as DataBarisPenggunaBulk;
  if (!u.nim.trim()) masalah.push("NIM masih kosong.");
  if (!u.nama.trim()) masalah.push("Nama masih kosong.");
  const email = u.email.trim();
  if (!email) {
    masalah.push("Email masih kosong.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    masalah.push("Format email tidak valid.");
  }
  return masalah;
}

/**
 * Mem-parse isi file CSV menjadi list item siap tampil di ScrollView preview Aslab.
 * Baris bermasalah tetap dimasukkan (dengan `masalah` terisi) agar Aslab bisa mengedit
 * dan melengkapi data kosong atau menolaknya (deny).
 */
export function parseCsvBulk(
  jenis: JenisBulkInsert,
  teksCsv: string,
): BarisBulkItem[] {
  const trimmed = teksCsv.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return [];

  const barisPertama = trimmed.split(/\r?\n/, 1)[0] ?? "";
  const pemisah = deteksiPemisah(barisPertama);
  const semuaBaris = pecahBarisCsv(trimmed, pemisah);
  if (semuaBaris.length === 0) return [];

  const headerLower = semuaBaris[0].map((kolom) => kolom.toLowerCase());
  const punyaHeader =
    jenis === "lab"
      ? headerLower.includes("nama") || headerLower.includes("latitude")
      : headerLower.includes("nim") || headerLower.includes("email");

  const indeksKolom = (namaKolom: string, fallbackIdx: number): number => {
    if (!punyaHeader) return fallbackIdx;
    const idx = headerLower.indexOf(namaKolom.toLowerCase());
    return idx >= 0 ? idx : fallbackIdx;
  };

  const mulaiBaris = punyaHeader ? 1 : 0;
  const hasil: BarisBulkItem[] = [];

  for (let i = mulaiBaris; i < semuaBaris.length; i += 1) {
    const row = semuaBaris[i];
    const nomorBaris = i + 1;

    if (jenis === "lab") {
      const data: DataBarisLabBulk = {
        nama: row[indeksKolom("nama", 0)] ?? "",
        gedung: row[indeksKolom("gedung", 1)] ?? "",
        latitude: row[indeksKolom("latitude", 2)] ?? "",
        longitude: row[indeksKolom("longitude", 3)] ?? "",
        radiusMeter: row[indeksKolom("radiusMeter", 4)] ?? "",
        gracePeriodMenit:
          row[indeksKolom("gracePeriodMenit", 5)] || String(GRACE_PERIOD_DEFAULT_MENIT),
        nominalDenda:
          row[indeksKolom("nominalDenda", 6)] || String(NOMINAL_DENDA_DEFAULT),
      };
      const masalah = validasiBarisBulk("lab", data);
      hasil.push({
        id: `lab-${nomorBaris}`,
        nomorBaris,
        data,
        diterima: masalah.length === 0,
        masalah,
      });
    } else {
      const data: DataBarisPenggunaBulk = {
        nim: row[indeksKolom("nim", 0)] ?? "",
        nama: row[indeksKolom("nama", 1)] ?? "",
        email: row[indeksKolom("email", 2)] ?? "",
      };
      const masalah = validasiBarisBulk(jenis, data);
      hasil.push({
        id: `${jenis}-${nomorBaris}`,
        nomorBaris,
        data,
        diterima: masalah.length === 0,
        masalah,
      });
    }
  }

  return hasil;
}
