// src/utils/validasiAkun.ts
// Validator form akun. Mengembalikan pesan error, atau "" bila valid.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function errWajib(nilai: string, namaKolom: string): string {
  return nilai.trim() ? "" : `${namaKolom} wajib diisi.`;
}

export function errEmail(nilai: string): string {
  if (!nilai.trim()) return "Email wajib diisi.";
  if (!EMAIL_RE.test(nilai.trim())) return "Format email tidak valid.";
  return "";
}

export function errSandi(nilai: string, minimal = 0): string {
  if (!nilai) return "Kata sandi wajib diisi.";
  if (minimal > 0 && nilai.length < minimal) {
    return `Kata sandi minimal ${minimal} karakter.`;
  }
  return "";
}

export function errNim(nilai: string): string {
  if (!nilai.trim()) return "NIM wajib diisi.";
  if (!/^\d+$/.test(nilai.trim())) return "NIM hanya boleh berisi angka.";
  return "";
}