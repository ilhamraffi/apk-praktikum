# Integrasi model kategori alasan izin

Dokumen ini menggantikan pemakaian sentimen EDOM sebagai keluaran utama
`kategoriAI`. Riwayat integrasi sentimen tetap disimpan di
[INTEGRASI_EDOM.md](INTEGRASI_EDOM.md) sebagai arsip.

## Model dan kontrak

- Model: `src/ai/kategori/model-kategori.json`, inferensi
  `src/ai/kategori/classifier.js`.
- Pelatihan: `ml/train_kategori.py` + `ml/data/alasan_izin.csv`. Lihat
  `ml/README.md` dan model card `src/ai/kategori/README.md`.
- Label keluaran: `sakit`, `keluarga`, `keperluan`.
- `src/lib/ai.ts` mempertahankan fungsi
  `klasifikasikanAlasan(alasan): Promise<string>` sehingga pemanggil tidak
  berubah. Classifier tetap lazy singleton dan tidak memakai HTTP.
- Tidak ada dependency baru, perubahan modul native, atau kebutuhan
  `EXPO_PUBLIC_AI_API_URL`. Pelatihan memakai Python di luar aplikasi; APK hanya
  membawa JSON + JavaScript.
- Kontrak `PengajuanIzin.kategoriAI` tetap `string | null`, jadi tidak ada
  perubahan `src/types/index.ts`.

## Status data latih

Dataset bawaan adalah **contoh sintetis** untuk menguji alur, dengan
`status: "contoh_sintetis_belum_divalidasi"`. Hasil pada aplikasi belum boleh
diklaim sebagai model tervalidasi. Ganti dataset dengan alasan izin nyata yang
dianonimkan, latih ulang, lalu uji pada kalimat baru sebelum menaikkan status.

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
| success | sakit/keluarga/keperluan | Kategori berhasil diprediksi dan disimpan. |
| unknown_vocabulary | null | Kosakata tidak dikenali atau teks tidak dapat dianalisis. |
| failed | null | Model gagal melakukan inferensi. |

Kegagalan menyimpan pengajuan tetap ditampilkan sebagai error. Jika pengajuan
sudah tersimpan tetapi sinkronisasi hasil analisis gagal, pengajuan dipertahankan
dan tombol analisis ulang dapat dipakai. Tombol retry menampilkan error database
jika penyimpanan hasilnya gagal; tidak mengklaim hasil tersimpan sebelum commit.
Inferensi sendiri offline, tetapi transaksi Firestore membutuhkan internet.

## Tampilan

- Praktikan dan asisten memakai komponen hasil yang sama. Kategori alasan diberi
  judul Kategori AI, dengan penjelasan bahwa model lokal hanya menebak jenis
  alasan, tidak memverifikasi kebenaran alasan, dan keputusan tetap oleh asisten.
- Dokumen izin lama yang masih berisi label EDOM `positif`/`netral`/`negatif`
  tetap tampil sebagai Sentimen AI (EDOM), bukan dianggap kategori alasan.
- Nilai kategori lama lain tetap ditampilkan apa adanya sebagai Kategori AI.
- Pengajuan lama pending yang failed/tidak punya kategori dapat dianalisis
  menggunakan tombol Analisis ulang alasan. Tidak membuat pengajuan baru.
- Retry hanya untuk pemilik izin pending. Data cache membuat tombol nonaktif;
  request terkunci terhadap ketukan berulang dan mengabaikan hasil setelah unmount.
- Error jadwal sekarang terlihat di halaman izin, bukan dianggap daftar sesi
  kosong. Penanganan ini ditambahkan karena ditemukan saat pengujian pengguna.

## Pengujian

```sh
python ml/train_kategori.py
node --test tests/*.test.mjs
npx tsc --noEmit
npx expo lint
npx expo export --platform android --no-bytecode --max-workers 2 --output-dir .expo/kategori-check
```

Tes model memakai JSON dan inferensi asli, termasuk pemeriksaan bentuk bobot dan
contoh kalimat per kategori. Tes juga memastikan paket EDOM asli tidak berubah
(SHA-256) selama dipakai sebagai arsip. Tes penyimpanan dan UI memakai batas
Firestore/React Native tiruan, sehingga tidak menggantikan Rules/perangkat asli.

Uji manual pada development build yang sudah memuat Firestore:

1. Jalankan Metro `npx expo start --dev-client --clear`, buka ulang proyek di HP.
2. Login praktikan terdaftar di kelas, pilih sesi, ajukan alasan sakit,
   keluarga, dan keperluan. Pastikan kategori yang muncul masuk akal.
3. Pengajuan tetap Menunggu; kategori muncul pada detail/daftar asisten tanpa
   restart. Label tidak menerima/menolak izin.
4. Buka izin lama yang masih Menunggu dan hasilnya Tidak tersedia, lalu ketuk
   Analisis ulang alasan; hasil tersimpan pada dokumen yang sama.
5. Gunakan teks tak dikenal, misalnya `qzxvkjwpp xyzxyzqq`; harus tampil belum
   dapat dianalisis dengan kategori null, tanpa menghilangkan pengajuan.
6. Coba kalimat ambigu seperti "ada acara" dan catat kesalahannya; ini batasan
   model, bukan alasan untuk mengubah keputusan otomatis.
7. Coba saat koneksi terputus, setelah logout, dan ketika asisten bersamaan
   memutuskan. Keputusan final tidak boleh berubah oleh analisis.
8. Terima/tolak manual dan pastikan status praktikan berubah real-time serta
   bertahan setelah aplikasi dibuka ulang. Izin final tidak memiliki tombol retry.

JSON/JS ini tidak menambah modul native, jadi APK development yang sudah
kompatibel dengan Firebase proyek dapat digunakan tanpa build ulang.
