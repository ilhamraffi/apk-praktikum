# Integrasi EDOM pada pengajuan izin

Branch `feat/praktikan-presensi` diperbarui dengan fast-forward dari `main`
`e2ca59e` (termasuk Auth/izin Rajib dan perbaikan PM) sebelum implementasi ini.
Paket model diberikan pengguna dan dikonfirmasi sebagai materi tugas saat ini.

## Model dan kontrak

- Sumber: https://github.com/Doctor3131/ppk-rn-expo-58/blob/main/docs/Pertemuan%202/Model%20EDOM.md
- Model dan `sentiment.js` disalin tanpa perubahan ke `src/ai/edom/`.
  Lihat `SOURCE.md`, lisensi upstream/dataset, dan README asli dalam folder itu.
- `src/lib/ai.ts` mempertahankan fungsi `klasifikasikanAlasan(alasan): Promise<string>`.
  Classifier dibuat sekali saat pertama dipakai dan dipakai ulang. Tidak ada
  request HTTP atau kebutuhan variabel `EXPO_PUBLIC_AI_API_URL` pada mode ini.
- Label asli `positif`, `netral`, `negatif` dipertahankan. Model tidak menghasilkan
  label Sakit/Keluarga, probabilitas terkalibrasi, atau keputusan izin.
- Model bertanda `research_baseline_edom_not_practicum_validated`, dengan data
  latih komentar evaluasi dosen/perkuliahan. Teks tidak dikenal menghasilkan
  label null, tidak diubah menjadi netral.
- `requirements.txt` adalah dependensi pelatihan, tidak dipasang untuk aplikasi.
  Tidak ada perubahan dependency, konfigurasi native, Auth, skema tipe bersama,
  Security Rules, atau build EAS dalam paket ini.

Ketentuan Sprint 2 yang lama menyebut klasifikasi melalui API, sedangkan paket
EDOM yang dipilih menjalankan inferensi lokal. Implementasi ini mengikuti pilihan
paket tersebut; tidak mengklaim endpoint API terpisah sudah diintegrasikan.

## Alur penyimpanan

1. Pengajuan disimpan dahulu di `permissions/{izinId}` dengan status pending.
2. Transaksi analisis membaca profil praktikan dan pengajuan tersimpan.
3. Pastikan UID Auth sama, role PRAKTIKAN, izin milik sendiri, dan masih pending.
4. Model membaca alasan terbaru dari dokumen pengajuan. Semua read dilakukan
   sebelum write; callback transaksi hanya melakukan inferensi lokal tanpa UI.
5. Update hanya `kategoriAI` dan `statusAI`. UID, sesi, alasan, waktu pengajuan,
   status keputusan, pemutus dan waktu keputusan tetap utuh.
6. Jika asisten lebih dulu memutuskan, retry transaksi memeriksa ulang status dan
   tidak menimpa keputusan. Logout/pergantian akun juga diperiksa sebelum write.

Status AI:

| statusAI | kategoriAI | Arti |
|---|---|---|
| not_requested | null | Pengajuan sudah ada, hasil analisis belum tersimpan; dapat dicoba ulang. |
| success | positif/netral/negatif | Sentimen berhasil dianalisis dan disimpan. |
| unknown_vocabulary | null | Kosakata tidak dikenali atau teks tidak dapat dianalisis. |
| failed | null | Model gagal melakukan inferensi. |

Kegagalan menyimpan pengajuan tetap ditampilkan sebagai error. Jika pengajuan
sudah tersimpan tetapi sinkronisasi hasil analisis gagal, pengajuan dipertahankan
dan tombol analisis ulang dapat dipakai. Tombol retry menampilkan error database
jika penyimpanan hasilnya gagal; tidak mengklaim hasil tersimpan sebelum commit.
Inferensi sendiri offline, tetapi transaksi Firestore membutuhkan internet.

## Tampilan

- Praktikan dan asisten memakai komponen hasil yang sama. Label sentimen diberi
  judul Sentimen AI (EDOM), dengan penjelasan bahwa hasil tidak memverifikasi
  kebenaran alasan dan keputusan tetap oleh asisten.
- Kategori lama selain label sentimen tetap ditampilkan sebagai Kategori AI.
- Pengajuan lama pending yang failed/tidak punya kategori dapat dianalisis
  menggunakan tombol Analisis ulang dengan EDOM. Tidak membuat pengajuan baru.
- Retry hanya untuk pemilik izin pending. Data cache membuat tombol nonaktif;
  request terkunci terhadap ketukan berulang dan mengabaikan hasil setelah unmount.
- Error jadwal sekarang terlihat di halaman izin, bukan dianggap daftar sesi
  kosong. Penanganan ini ditambahkan karena ditemukan saat pengujian pengguna.

## Pengujian

```sh
npx expo lint
npx tsc --noEmit
node --test tests/*.test.mjs
npx expo export --platform android --no-bytecode --max-workers 2 --output-dir .expo/edom-check
```

Tes model memakai JSON dan inferensi asli; SHA-256 diperiksa terhadap paket
asli. Tes penyimpanan dan UI memakai batas Firestore/React Native tiruan, sehingga
tidak menggantikan Rules/perangkat asli. Tes presensi lama disesuaikan dengan
field `uid` yang sudah ditambahkan pada kontrak di `main`; penulis presensi tidak
diubah oleh implementasi EDOM ini.

Uji manual pada development build yang sudah memuat Firestore:

1. Jalankan Metro `npx expo start --dev-client --clear`, buka ulang proyek di HP.
2. Login praktikan terdaftar di kelas, pilih sesi, ajukan alasan izin.
3. Pengajuan tetap Menunggu; hasil EDOM ditampilkan sebagai sentimen dan muncul
   pada detail/daftar asisten tanpa restart. Label tidak menerima/menolak izin.
4. Buka izin lama yang masih Menunggu dan hasilnya Tidak tersedia, lalu ketuk
   Analisis ulang dengan EDOM; hasil tersimpan pada dokumen yang sama.
5. Gunakan teks tak dikenal, misalnya `qzxvkjwpp xyzxyzqq`; harus tampil belum
   dapat dianalisis dengan kategori null, tanpa menghilangkan pengajuan.
6. Coba saat koneksi terputus, setelah logout, dan ketika asisten bersamaan
   memutuskan. Keputusan final tidak boleh berubah oleh analisis.
7. Terima/tolak manual dan pastikan status praktikan berubah real-time serta
   bertahan setelah aplikasi dibuka ulang. Izin final tidak memiliki tombol retry.

JSON/JS ini tidak menambah modul native. APK development yang sudah kompatibel
dengan Firebase proyek dapat digunakan; tidak perlu build ulang hanya untuk EDOM.
