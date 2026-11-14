# Integrasi Fauzan — SRS-02 praktikan, SRS-03, SRS-04

Branch: `feat/praktikan-presensi`. Dokumen ini adalah catatan serah fitur Fauzan,
bukan perubahan kontrak data atau pembagian kerja pada README.

## Implementasi

- Jadwal hanya membaca `classes` dengan `pesertaUids array-contains user.uid`,
  lalu `sessions` dengan `classId == idKelas`. Detail URL asing tidak ditampilkan.
- Presensi Hadir menggunakan transaksi: baca sesi, profil pengguna, kelas,
  dan dokumen presensi; periksa akun masih sama, role PRAKTIKAN, keanggotaan,
  sesi DIBUKA, serta dokumen belum ada sebelum menulis.
- Lokasi: `sessions/{sessionId}/attendance/{uid}`. Field yang ditulis:
  `nama`, `nim`, `statusKehadiran: "Hadir"`, `catatan`, `waktu: serverTimestamp()`.
  Nama/NIM diambil dari profil Firestore, bukan dari input praktikan.
- Tidak mengubah array presensi/sesi, tidak menambah koleksi/field, dan tidak
  mengubah hook rekap milik Ilham. Format penulis diuji terhadap pembaca rekap.
- Form menunggu penyimpanan terkonfirmasi, menolak ketukan berulang, menampilkan
  error dan mempertahankan catatan saat gagal. Transaksi memerlukan internet;
  tidak mengantre presensi offline yang mungkin terkirim setelah sesi ditutup.
- Listener membaca dokumen attendance pengguna sendiri. Status sesi, kehadiran,
  cache, dan write tertunda dibedakan. Listener lama dihentikan saat akun berubah.
- Route baru `/praktikan/riwayat`, dengan tautan dari jadwal dan detail.
- Tidak ada dependensi native baru atau perubahan konfigurasi build.

## Pesan untuk Rajib (siap disalin)

> Bagian jadwal praktikan, transaksi presensi, dan riwayat sudah dibuat pada
> branch `feat/praktikan-presensi`. Tetap gunakan kontrak
> `useAuth() -> { user, role, loading, signUp, signIn, signOut }`.
> Pastikan `user.uid` adalah UID Firebase Auth, serta `nama`, `nim`, `email`,
> dan `role` sesuai profil `users/{uid}`. Role tetap PRAKTIKAN atau ASISTEN;
> registrasi default PRAKTIKAN dan peran asisten mengikuti keputusan PM.
> Saat logout/akun berganti, jangan tampilkan profil akun sebelumnya dan tunggu
> profil selesai dimuat sebelum `loading` menjadi false. Penjaga rute praktikan
> perlu mencakup `/praktikan`, `/praktikan/[sesiId]`, dan `/praktikan/riwayat`.
> Presensi langsung hanya Hadir; pengajuan izin tetap melalui fitur kamu.
> Setelah Auth siap, kita uji login/logout, pergantian akun, dan alur dua HP
> bersama Ilham. Pengujian Node saat ini memakai layanan tiruan, belum Firebase asli.

Tautan dashboard lama `/praktikan/index` tetap ditangani sebagai alias ke
`/praktikan`, sehingga Fauzan tidak perlu mengedit dashboard milik Rajib.

## Koordinasi dengan Ilham

- Gunakan UID akun praktikan yang sama di `classes/{classId}.pesertaUids`.
- Buka/tutup sesi tetap melalui fitur Ilham. Transaksi presensi membaca status
  sesi dan akan diperiksa ulang Firestore bila sesi berubah saat commit.
- Rekap tetap membaca subkoleksi attendance. UID adalah ID dokumen, tidak
  memerlukan tambahan field uid pada data yang disimpan.
- Uji dua HP: buka sesi -> hadir -> rekap bertambah -> percobaan kedua ditolak
  -> tutup sesi -> tombol praktikan nonaktif tanpa restart.

## Kebutuhan Security Rules dari PM

Validasi layar/transaksi bukan pengganti Security Rules. Sebelum demo, PM perlu
mengizinkan query sesuai keanggotaan, membaca profil sendiri, dan membaca dokumen
attendance sendiri **termasuk ketika dokumennya belum ada**. Praktikan tidak
membaca seluruh subkoleksi attendance atau attendance pengguna lain.

Untuk create attendance, aturan harus memverifikasi UID pada path sama dengan
Firebase Auth, role PRAKTIKAN, peserta kelas, sesi DIBUKA, field sesuai kontrak,
nama/NIM sesuai profil, status Hadir, catatan maksimal 500 karakter, serta waktu
server. Tolak update/delete presensi oleh praktikan agar dokumen lama tidak
bisa ditimpa lewat SDK langsung. Hak baca rekap asisten tetap diperlukan.

## Batas dan keputusan yang masih perlu disepakati

- Riwayat saat ini mencakup sesi kelas yang masih dapat diakses praktikan.
  Riwayat lintas kelas yang sudah dihapus/keanggotaannya dicabut memerlukan
  kebijakan akses dan retensi dari PM; jangan menambah field/skema sepihak.
- Izin tidak bisa dipilih lewat form presensi. Hubungan izin disetujui dengan
  attendance berstatus Izin perlu diputuskan PM bersama Rajib/Ilham.
- SRS-07 tersedia sebagai paket terpisah; lihat
  [handoff pemeriksaan izin](HANDOFF_FAUZAN_SRS_07.md) untuk integrasi Rajib,
  tautan menu Ilham, dan kebutuhan Rules dari PM.
- APK di HP perlu cocok dengan versi React Native Firebase proyek. Error
  `NativeRNFBTurboApp is not registered` memerlukan development build yang sesuai.

## Verifikasi dan uji integrasi

```sh
npx expo lint
npx tsc --noEmit
node --test tests/*.test.mjs
npx expo export --platform android --no-bytecode --max-workers 2 --output-dir .expo/fauzan-presensi-check
```

Tes Node memuat kode produksi dengan batas Firebase/React Native tiruan.
Simulasi transaksi tidak menggantikan pengujian contention dan Security Rules
di Firebase Emulator/perangkat asli. Export di atas hanya memeriksa bundling JS,
bukan menghasilkan APK atau membuktikan integrasi native berhasil.

Pengujian akhir bersama: tidak login/role salah, peserta tidak terdaftar,
profil tidak lengkap, dua ketukan/perangkat untuk akun sama, sesi ditutup atau
keanggotaan dicabut saat submit, koneksi terputus, pergantian akun, serta data
tetap tersedia setelah app ditutup/dibuka. Verifikasi akses terlarang melalui
SDK juga harus ditolak oleh Rules, bukan hanya tersembunyi dari tampilan.
