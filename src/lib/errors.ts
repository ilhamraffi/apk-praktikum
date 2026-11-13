// src/lib/errors.ts
// Pemetaan kode error Firebase -> pesan yang jelas bagi pengguna.
// Dipakai bersama oleh semua layar (scaffold PM).

interface FirebaseLikeError {
  code?: string;
  message?: string;
}

export function pesanError(error: unknown): string {
  if (!error) return "Terjadi kesalahan yang tidak diketahui.";

  const code = (error as FirebaseLikeError).code;
  const message = (error as FirebaseLikeError).message ?? String(error);

  if (code) {
    switch (code) {
      case "auth/email-already-in-use":
        return "Email sudah terdaftar. Gunakan email lain atau masuk.";
      case "auth/invalid-email":
        return "Format email tidak valid.";
      case "auth/weak-password":
        return "Kata sandi terlalu lemah (minimal 6 karakter).";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email atau kata sandi salah.";
      case "auth/too-many-requests":
        return "Terlalu banyak percobaan. Coba lagi nanti.";
      case "auth/network-request-failed":
        return "Koneksi terganggu. Periksa jaringan dan coba lagi.";
      case "firestore/permission-denied":
        return "Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.";
      case "firestore/unavailable":
        return "Layanan database tidak tersedia. Coba lagi nanti.";
      case "firestore/not-found":
        return "Data tidak ditemukan.";
      default:
        break;
    }
  }

  // Pesan native Firebase kadang diawali kode "[firestore/...]".
  const nativeMatch = message.match(/^\[([a-z/-]+)\]/i);
  if (nativeMatch) {
    return pesanError({ code: nativeMatch[1] });
  }

  return message || "Terjadi kesalahan yang tidak diketahui.";
}
