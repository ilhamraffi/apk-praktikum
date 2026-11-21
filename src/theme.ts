// src/theme.ts
// Token warna bersama HadirLab. Palet inti: #FEFAF6 (latar), #EADBC8 (permukaan),
// #DAC0A3 (aksen), #102C57 (biru tua). Warna lain diturunkan dari keempatnya
// (campuran dengan latar) atau berupa warna status yang dibuat redup agar serasi.
// Jangan menulis kode warna langsung di layar; tambahkan token di sini.
export const warna = {
  // --- palet inti ---
  latar: "#FEFAF6",
  permukaan: "#EADBC8",
  aksen: "#DAC0A3",
  utama: "#102C57",

  // --- turunan palet ---
  kartu: "#FFFFFF",
  kartuKaca: "rgba(255, 255, 255, 0.72)", // kartu semi-transparan bergaya kaca
  permukaanLembut: "#F2E7DA", // #EADBC8 60% di atas latar
  inputLatar: "#F2E7DA",
  garis: "#E8D7C4", // #DAC0A3 60% di atas latar
  garisKuat: "#DAC0A3",
  utamaTeks: "#FEFAF6", // teks di atas warna utama/gelap
  tautan: "#102C57",

  // --- teks ---
  teks: "#102C57",
  teksIsi: "#2D4468",
  teksRedup: "#4A5E7E",
  placeholder: "#64748F",

  // --- status (satu-satunya di luar palet) ---
  error: "#A63D3D",
  errorLatar: "#F6E3E1",
  errorGaris: "#E4B5B5",
  errorTeks: "#8A2E2E",
  suksesTeks: "#1F4D38",
  suksesLatar: "#DCEBE3",
  peringatanTeks: "#7A4F0C",
  peringatanLatar: "#F5E6C8",

  // --- lain-lain ---
  overlay: "rgba(16, 44, 87, 0.45)",
} as const;

/** Radius sudut bersama: kartu 24, tombol dan lencana berbentuk pil. */
export const radius = {
  kecil: 14,
  kartu: 24,
  pil: 999,
} as const;