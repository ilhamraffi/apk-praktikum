# HadirLab Backend (Vercel Serverless)

Backend gratis untuk Sprint 4 tanpa memerlukan upgrade Firebase Blaze. Menangani:
- `POST /api/presensi/catat` — validasi lokasi/radius, hitung keterlambatan (*grace period*), buat tagihan denda idempoten (`fines/{sessionId}_{uid}`), kirim FCM tagihan baru.
- `POST /api/pembayaran/buat` — buat transaksi **Midtrans Snap Sandbox** (secret key hanya di env Vercel) dan catat `payments/{orderId}`.
- `POST /api/midtrans/webhook` — verifikasi `signature_key` SHA-512 Midtrans, update atomik `payments` & `fines` (tanpa mengubah status kehadiran), kirim FCM hasil pembayaran.
- `POST /api/notifikasi/kirim` — pengirim FCM kegiatan praktikum untuk Aslab/Asprak.

## Cara Deploy ke Vercel (PM)

1. Login ke **https://vercel.com** (pakai akun GitHub).
2. Klik **Add New → Project** → pilih repo `apk-praktikum`.
3. **Penting:** pada bagian **Root Directory**, klik **Edit** dan pilih folder **`backend`**.
4. Tambahkan 3 **Environment Variables**:
   - `MIDTRANS_SERVER_KEY` = `SB-Mid-server-...` *(dari Midtrans Dashboard Sandbox → Settings → Access Keys)*
   - `MIDTRANS_IS_PRODUCTION` = `false`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = isi file JSON dari *Firebase Console → Project Settings → Service accounts → Generate new private key* *(boleh ditempel sebagai JSON 1 baris atau hasil Base64; **jangan pernah** commit file JSON tersebut ke Git)*
5. Klik **Deploy**. Setelah sukses, salin URL domain Vercel (misal `https://hadirlab-backend.vercel.app`).
6. Atur Webhook di **Midtrans Dashboard (Sandbox)**:
   - Masuk ke **Settings → Configuration → Payment Notification URL**.
   - Isi: `https://<domain-vercel-kamu>/api/midtrans/webhook` → klik **Update**.
7. Di aplikasi Expo (setiap anggota tim):
   - Buat file `.env.local` di root proyek (tidak ikut ter-commit) berisi:
     ```
     EXPO_PUBLIC_BACKEND_URL=https://<domain-vercel-kamu>
     ```
   - Restart `npx expo start --dev-client`.
