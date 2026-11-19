# Absensi Praktikum (HadirLab)

**TL;DR** — Aplikasi mobile (React Native + Expo) untuk presensi praktikum dengan 2 peran: **Asisten** (kelola kelas & sesi → buka sesi → pantau rekap → tutup sesi → periksa izin) dan **Praktikan** (lihat jadwal → presensi → ajukan izin → pantau status).

| Sprint | Fokus | Status |
|---|---|---|
| Sprint 1 | UI saja: data dummy lokal, state React | Selesai (arsip di bagian bawah) |
| Sprint 2 | Data dinamis: Firebase Auth + Cloud Firestore + klasifikasi izin oleh AI | Selesai (arsip di bagian bawah) |
| **Sprint 3** | **Location-Based Attendance, Maps, and Push Notification** | **Berjalan** |

# Konfigurasi Setup Project
Anggota :
```bash
git clone https://github.com/ilhamraffi/apk-praktikum.git
cd apk-praktikum
git checkout main && git pull
npm install
```

1. **Pasang APK development build** dari PM (file `.apk`, dikirim lewat grup/Drive) di HP Android. Izinkan "install dari sumber tidak dikenal"; jika Play Protect memperingatkan, pilih *Install anyway*.
2. Jalankan Metro dalam mode development build:
   ```bash
   npx expo start --dev-client
   ```
   Pastikan terminal menampilkan `Using development build` (jika `Using Expo Go`, tekan `s`).
3. Buka aplikasi **my-app** di HP, scan QR dari terminal, atau ketik `http://<IP-laptop>:8081`.
4. Jika HP tidak bisa menjangkau laptop (Wi-Fi kampus sering memblokir antar perangkat): pakai `npx expo start --dev-client --tunnel`, atau kabel USB dengan `adb reverse tcp:8081 tcp:8081` lalu isi `http://localhost:8081`.

Project Manager (Rebuild Dev jika ada paket native baru atau perubahan `app.json`) :
```bash
# Build development (hanya PM / anggota yang diberi akses team Expo)
eas build --profile development --platform android
firebase deploy --only functions
```

# SPRINT 3 - Location-Based Attendance, Maps, and Push Notification

Dokumen sprint · apk-praktikum · melanjutkan Sprint 2 (Auth + Firestore + klasifikasi izin)

## 1. Tujuan

Menambahkan konteks lokasi dan pemberitahuan pada aplikasi multi-pengguna dari Sprint 2. Presensi kini memeriksa keberadaan fisik praktikan: sah hanya bila sesi dibuka **dan** perangkat berada dalam radius laboratorium. Pengguna dapat melihat sebaran laboratorium Informatika beserta aktivitas praktikumnya di peta, dan menerima push notification ketika sesi dibuka, jadwal berubah, atau keputusan izin keluar, tanpa harus membuka aplikasi lebih dulu.

## 2. Alur demo (acceptance Sprint 3)

**Alur A — Presensi berbasis lokasi**

1. Asisten login → membuka sesi (laboratorium sesi tersebut sudah memiliki koordinat dan radius).
2. Praktikan login (perangkat lain) → membuka halaman presensi untuk sesi tersebut.
3. Aplikasi meminta izin lokasi, mengambil koordinat perangkat, lalu menampilkan hasil pemeriksaan (jarak ke laboratorium, di dalam atau di luar radius).
4. Di dalam radius → presensi tersimpan di Firestore bersama koordinat dan jarak. Di luar radius atau lokasi tidak tersedia → ditolak dengan pesan jelas dan tidak ada data kehadiran yang tercatat.
5. Praktikan mencoba presensi lagi → ditolak.
6. Rekap asisten bertambah otomatis (tanpa muat ulang).

**Alur B — Peta dan informasi laboratorium**

1. Pengguna (asisten atau praktikan) membuka halaman Maps.
2. Peta menampilkan marker lokasi pengguna dan marker tiap laboratorium; marker pengguna bergerak mengikuti perubahan lokasi perangkat.
3. Pengguna memilih satu marker laboratorium.
4. Aplikasi menampilkan praktikum yang sedang berlangsung (nama praktikum, kelas, waktu, status sesi).
5. Aplikasi menampilkan praktikum berikutnya di laboratorium itu berdasarkan data Firestore.
6. Asisten mengubah jadwal atau status sesi → informasi pada peta berubah otomatis.

**Alur C — Notifikasi kegiatan**

1. Praktikan login di perangkat lain dan mengizinkan notifikasi; token perangkat tersimpan di Firestore.
2. Asisten membuka sesi, mengubah jadwal, atau menerima/menolak izin.
3. Sistem mendeteksi perubahan tersebut dan mengirim push notification kepada pengguna yang berkepentingan.
4. Praktikan menerima notifikasi (aplikasi di latar belakang atau tertutup); mengetuknya membuka layar terkait.

## 3. Requirement (acceptance criteria)

Penomoran melanjutkan Sprint 2 (SRS-01 s.d. SRS-08).

| ID | Requirement | Kriteria selesai | Owner |
| --- | --- | --- | --- |
| SRS-09 | Halaman presensi | Halaman presensi terpisah dari detail sesi; menampilkan informasi sesi, status sesi, dan tombol presensi. *Opsional:* presensi QR (asisten menampilkan kode, praktikan memindai) | Fauzan (praktikan), Ilham (QR asisten, opsional) |
| SRS-10 | Validasi lokasi presensi | Presensi tercatat hanya bila sesi `DIBUKA` dan jarak perangkat ke laboratorium ≤ radius; hasil pemeriksaan (jarak, di dalam/di luar radius) ditampilkan; pemeriksaan lokasi adalah bagian dari proses penyimpanan, bukan hanya tampilan; presensi ganda tetap ditolak; presensi yang gagal tidak menghasilkan dokumen kehadiran | Fauzan (alur layar), PM (jalur validasi & rules) |
| SRS-11 | Pengelolaan lokasi laboratorium | Asisten menambah, mengubah, dan menghapus laboratorium (nama, koordinat, radius presensi) serta memilih laboratorium untuk tiap sesi; tersimpan di Firestore dan terbaca pengguna terkait | Ilham |
| SRS-12 | Peta laboratorium interaktif | Halaman Maps dengan marker tiap laboratorium dan marker pengguna yang diperbarui mengikuti lokasi selama halaman digunakan; marker laboratorium dapat dipilih untuk melihat informasinya | Farhan |
| SRS-13 | Aktivitas laboratorium | Tiap laboratorium menampilkan praktikum yang sedang berlangsung dan berikutnya (nama praktikum, kelas, waktu, status sesi) dari `sessions` dan `classes`; berubah otomatis mengikuti perubahan jadwal/status (`onSnapshot`) | Farhan (tampilan), Ilham (data jadwal/sesi terhubung ke laboratorium) |
| SRS-14 | Push notification | Notifikasi terkirim saat sesi dibuka, jadwal berubah, izin diterima, dan izin ditolak; hanya ke pengguna yang berkepentingan; token perangkat tersimpan per pengguna; mengetuk notifikasi membuka layar terkait | PM (pengirim), Farhan (izin notifikasi, token, penanganan di aplikasi) |
| SRS-15 | Izin & kondisi perangkat | Izin lokasi dan notifikasi diminta sesuai kebutuhan; semua kondisi pada tabel di bawah ditangani dengan pesan jelas dan jalan keluar (coba lagi / buka pengaturan) | PM (komponen & hook bersama), semua (pemakaian di layar masing-masing) |
| SRS-16 | Integrasi & keamanan | Fitur Sprint 1–2 tetap berfungsi; data konsisten antar pengguna; Security Rules diperbarui: laboratorium hanya ditulis asisten, praktikan hanya menulis token miliknya, dan kehadiran tidak dapat dicatat di luar jalur validasi | PM |

Kondisi yang wajib ditangani (tambahan dari kondisi Sprint 2: belum login, memuat, kosong, koneksi terganggu):

| Kondisi | Perilaku yang diharapkan |
| --- | --- |
| Izin lokasi ditolak | Pesan alasan lokasi dibutuhkan + tombol minta ulang / buka pengaturan; presensi tidak dapat diproses; peta tetap tampil tanpa marker pengguna |
| Layanan lokasi perangkat nonaktif | Pesan agar mengaktifkan lokasi; presensi tidak aktif sampai lokasi menyala |
| Koordinat belum tersedia | Status *mencari lokasi* dengan indikator; tombol presensi tidak aktif; bila melewati batas waktu, tampil pesan dan tombol coba lagi |
| Di luar radius | Tampilkan jarak ke laboratorium dan radius yang berlaku; presensi ditolak dan tidak tercatat |
| Koneksi jaringan terganggu | Pesan jelas; tidak ada kehadiran yang tersimpan setengah jalan; tombol coba lagi |
| Izin notifikasi ditolak | Aplikasi tetap dapat dipakai; banner informasi bahwa pemberitahuan nonaktif + tombol buka pengaturan |
| Notifikasi tidak dapat diterima (token gagal terdaftar, dll.) | Pengguna diberi informasi status; perubahan tetap terlihat real-time saat aplikasi dibuka |

## 4. Teknologi

- Melanjutkan Sprint 2: Expo SDK 58, React Native, Expo Router, TypeScript, Firebase Auth, Cloud Firestore, EAS Build (development build Android).
- **Geolocation:** `expo-location` (izin lokasi, posisi saat ini, pemantauan posisi selama halaman aktif).
- **Maps:** `react-native-maps` dengan Google Maps di Android (butuh API key Maps SDK for Android).
- **Push notification:** FCM lewat `@react-native-firebase/messaging` (satu keluarga dengan paket Firebase yang sudah dipakai); Android 13+ membutuhkan izin `POST_NOTIFICATIONS`.
- **Pengirim notifikasi:** Cloud Functions for Firebase (trigger Firestore) dengan Firebase Admin SDK.
- Semua di atas adalah paket native/konfigurasi → **wajib build ulang** development build; APK Sprint 2 tidak cukup.
- `plugins/withFirebaseBom.js` tetap dipertahankan; uji build setelah `@react-native-firebase/messaging` ditambahkan.

## 5. Konfigurasi Lanjutan :  lokasi, Maps, dan notifikasi

**Lokasi.** Jarak dihitung dengan rumus haversine (`hitungJarakMeter` di `src/lib/geo.ts`). Presensi sah bila jarak ≤ `radiusMeter` laboratorium sesi. Koordinat dengan akurasi lebih buruk dari batas yang ditetapkan PM diperlakukan sebagai *koordinat belum tersedia*, supaya presensi tidak ditolak atau lolos karena pembacaan GPS yang meleset.

**Peta.** Marker laboratorium dibaca dari `labs`. Pemantauan posisi pengguna hanya aktif selama halaman Maps terbuka dan dihentikan saat halaman ditinggalkan.

**Notifikasi.** Setelah login dan izin diberikan, token FCM disimpan di `users/{uid}/fcmTokens/{token}` dan dihapus saat logout. Cloud Functions mendengarkan perubahan data berikut dan mengirim notifikasi:

| Peristiwa | Terdeteksi dari | Penerima | Contoh isi |
| --- | --- | --- | --- |
| Sesi dibuka | `sessions/{id}`: `status` berubah menjadi `DIBUKA` | Peserta kelas sesi tersebut (`classes.pesertaUids`) | *Sesi dibuka: {namaPraktikum} - {modul}. Silakan presensi.* |
| Jadwal berubah | `sessions/{id}`: `waktu`, `labId`, atau `ruangan` berubah | Peserta kelas sesi tersebut | *Jadwal berubah: {namaPraktikum} - {waktu baru}, {laboratorium}.* |
| Izin diterima | `permissions/{id}`: `status` menjadi `approved` | Praktikan pemohon (`uid`) | *Izin untuk sesi {namaPraktikum} diterima.* |
| Izin ditolak | `permissions/{id}`: `status` menjadi `rejected` | Praktikan pemohon (`uid`) | *Izin untuk sesi {namaPraktikum} ditolak.* |

Notifikasi dikirim berdasarkan perubahan data, bukan dipanggil dari layar asisten, sehingga layar yang sudah ada dari Sprint 2 tidak perlu diubah untuk memicunya.

## 6. Struktur & kepemilikan (usulan, dibekukan PM di Fase 0)

Menambah di atas struktur Sprint 2; yang tidak disebut tetap seperti semula. Satu folder/file = satu pemilik.

```
src/app/praktikan/presensi/[sessionId].tsx   [Fauzan] halaman presensi khusus
src/app/praktikan/presensi/scan.tsx          [Fauzan] opsional: pindai QR
src/app/asisten/lab/                         [Ilham] daftar & form laboratorium (koordinat, radius)
src/app/asisten/sesi/qr.tsx                  [Ilham] opsional: tampilkan QR sesi
src/app/peta/                                [Farhan] halaman Maps (asisten & praktikan)
src/app/_layout.tsx                          [Farhan] penjaga rute: izinkan rute peta untuk kedua peran
src/context/AuthContext.tsx                  [Farhan] + daftar/hapus token FCM saat login/logout
src/hooks/useLokasiPerangkat.ts              [PM] izin, layanan lokasi, koordinat, status kondisi
src/lib/geo.ts                               [PM] hitungJarakMeter, cekDalamRadius
src/lib/presensi.ts                          [PM] catatPresensi (satu-satunya pintu tulis kehadiran)
src/lib/notifikasi.ts                        [PM] izin notifikasi, token, penanganan ketuk
src/components/shared/                       [PM] + PeringatanLokasi, PeringatanNotifikasi
src/types/index.ts                           [PM] + tipe Lab, bidang baru sessions/attendance
functions/                                   [PM] Cloud Functions (validasi presensi, kirim FCM)
firestore.rules                              [PM]
app.json, plugins/                           [PM] paket native, Maps key, FCM
```

## 7. Skema Firestore (usulan awal; perubahan hanya lewat PM)

| Koleksi / dokumen | Isi utama |
| --- | --- |
| `labs/{labId}` (baru) | nama, gedung (keterangan lokasi), latitude, longitude, radiusMeter, dibuat/diubah pada |
| `sessions/{sessionId}` (diubah) | tambah `labId` (rujukan ke `labs`); `ruangan` tetap sebagai keterangan tampilan, sedangkan koordinat dan radius selalu dibaca dari `labs/{labId}` |
| `sessions/{sessionId}/attendance/{uid}` (diubah) | tambah `labId`, `lokasi` (latitude, longitude, akurasiMeter), `jarakMeter` |
| `users/{uid}/fcmTokens/{token}` (baru) | platform, diperbarui pada |
| `classes`, `permissions`, `users` | tidak berubah |

Alasan desain:

- Lokasi laboratorium dipisah ke `labs` agar satu laboratorium dipakai banyak sesi: radius diubah sekali dan berlaku untuk semua sesi, sementara peta dan presensi membaca sumber data yang sama sehingga konsisten antar pengguna.
- Koordinat dan jarak disimpan pada kehadiran supaya asisten dapat menelusuri hasil validasi.
- Token memakai ID dokumen = token di subkoleksi pengguna: tidak ada duplikat dan tidak ada tabrakan tulis antar perangkat.
- Aktivitas laboratorium tidak disimpan sebagai data baru; diturunkan dari query `sessions` per `labId` (nama kelas dari `classes`). Definisi *berlangsung* dan *berikutnya* ditetapkan PM di Fase 0 (usulan: berlangsung = status `DIBUKA`; berikutnya = sesi `BELUM_DIBUKA` dengan waktu terdekat dari sekarang).
- Semua waktu tetap memakai `serverTimestamp()`.

## 8. Pembagian kerja

**PM** — Fondasi & kualitas: paket native dan konfigurasi (Maps API key, FCM, izin Android di `app.json`) beserta build ulang dan APK baru; tipe `Lab` dan bidang baru; `geo.ts`, `useLokasiPerangkat`, `notifikasi.ts`, komponen peringatan bersama; data awal (2–3 laboratorium dengan koordinat, sesi terhubung laboratorium, akun uji); jalur validasi presensi (`catatPresensi`) dan Cloud Functions notifikasi; Security Rules dan pengujiannya; aturan Git & review PR; QA tiga alur demo; README & APK akhir. PM tidak menulis kode fitur layar.

**Farhan — Peta & notifikasi (sisi aplikasi)** · SRS-12, 13 (tampilan), 14 (aplikasi) Halaman Maps (marker laboratorium, marker pengguna real-time, panel informasi laboratorium), tampilan praktikum berlangsung dan berikutnya, pendaftaran dan penghapusan token FCM di `AuthContext`, penanganan notifikasi saat aplikasi terbuka dan saat diketuk, penjaga rute untuk `peta`.

**Ilham — Sisi asisten** · SRS-11, 13 (data), 09 (QR asisten, opsional) CRUD laboratorium (nama, koordinat melalui input manual atau lokasi perangkat saat ini, radius; validasi form dan konfirmasi hapus, termasuk bila laboratorium masih dipakai sesi); pilih laboratorium pada form sesi menggantikan isian ruangan; buka/tutup sesi tetap; rekap kehadiran real-time menampilkan data lokasi; tampilan QR sesi bila fitur opsional dikerjakan.

**Fauzan — Presensi praktikan** · SRS-09, 10 (layar) Halaman presensi khusus (informasi sesi, status sesi, hasil pemeriksaan lokasi), pemanggilan `catatPresensi`, penanganan semua kondisi lokasi, penolakan presensi ganda, pemindaian QR bila fitur opsional dikerjakan. Layar pemeriksaan izin dari Sprint 2 tetap; notifikasi ke praktikan muncul otomatis dari perubahan status izin.

### Kontrak antar-slice (dibekukan di Fase 0)

- `useAuth()` tidak berubah bentuknya.
- `useLokasiPerangkat()` → `{ koordinat, akurasiMeter, status, mintaIzin, muatUlang }`, dengan `status` salah satu dari `memuat`, `siap`, `izin_ditolak`, `layanan_mati`, `tidak_tersedia`.
- `cekDalamRadius(koordinat, lab)` → `{ dalamRadius, jarakMeter }` (hanya untuk tampilan; keputusan sah/tidaknya presensi tetap di jalur validasi PM).
- `catatPresensi(sessionId, koordinat)` adalah satu-satunya jalur penulisan kehadiran; layar tidak menulis ke `attendance` secara langsung.
- Tipe dan nama koleksi hanya dari `src/types/index.ts`; pesan error lewat helper bersama dari PM.
- Butuh komponen/aksi baru? Buat issue ke PM; sementara itu buat versi lokal di dalam file layar sendiri, jangan mengedit `components/shared/`.

## 9. Urutan kerja

| Fase | PM | Farhan | Ilham | Fauzan |
| --- | --- | --- | --- | --- |
| 0 | Paket native + konfigurasi, build ulang & APK baru, tipe `Lab`, `geo.ts`, stub hook lokasi, data awal laboratorium, rules sementara | Pasang APK baru, coba jalan, cek izin lokasi dan notifikasi di HP | idem | idem |
| 1 (paralel) | Jalur validasi presensi, Cloud Functions notifikasi (sesi dibuka, jadwal, izin) | Halaman Maps: marker laboratorium + lokasi pengguna | CRUD laboratorium, pilih laboratorium di form sesi | Halaman presensi + pemeriksaan lokasi (memakai stub/`geo.ts`) |
| 2 | Hubungkan validasi ke Rules, perketat Rules (`labs`, token, `attendance`) | Informasi aktivitas laboratorium, token FCM, penanganan ketuk notifikasi | Rekap menampilkan jarak/lokasi, bantu integrasi, QR asisten (opsional) | Hubungkan presensi ke `catatPresensi`, semua kondisi lokasi, scan QR (opsional) |
| 3 | QA tiga alur, uji Rules dan notifikasi di perangkat nyata, perbaikan akhir | Bugfix | Bugfix | Bugfix |

Integrasi ke `main` dilakukan **berkala (beberapa hari sekali)**, bukan menumpuk di akhir. Fase 0 harus merge lebih dulu karena anggota lain membutuhkan APK baru dan kontrak data.

## 10. Aturan Git

- Satu fitur satu branch: `feat/presensi-lokasi` (Fauzan), `feat/lab-asisten` (Ilham), `feat/peta-lab` (Farhan), `feat/notifikasi-app` (Farhan), `feat/notifikasi-server` (PM).
- `git pull --rebase origin main` sebelum push; jangan push langsung ke `main`; PR wajib direview minimal 1 orang dan disetujui PM.
- Jangan commit `.env`, keystore, atau kunci service account. Maps API key harus dibatasi (nama paket + SHA-1) bila ditaruh di konfigurasi; `functions/` tidak boleh menyimpan kredensial di repo. Repo tetap **private**.
- Detail: `docs/GIT_WORKFLOW.md`.

## 11. Skenario uji (PM)

Tiga alur demo (§2) dengan **dua HP**, ditambah kasus tepi:

- **Presensi:** sesi belum dibuka/sudah ditutup; di dalam dan di luar radius; izin lokasi ditolak; layanan lokasi mati; koordinat belum tersedia (GPS baru dinyalakan); presensi ganda; dua praktikan presensi bersamaan; koneksi diputus saat menyimpan; praktikan menulis kehadiran langsung ke Firestore tanpa lewat validasi (harus ditolak Rules).
- **Laboratorium:** asisten mengubah radius → hasil pemeriksaan presensi mengikuti; praktikan mencoba mengubah `labs` (harus ditolak Rules).
- **Peta:** izin lokasi ditolak (peta tetap tampil); marker pengguna bergerak saat HP berpindah; marker laboratorium tanpa sesi, dengan sesi berlangsung, dan dengan sesi berikutnya; asisten mengubah status/jadwal → panel berubah tanpa muat ulang.
- **Notifikasi:** keempat peristiwa; aplikasi di foreground, background, dan tertutup; izin notifikasi ditolak; praktikan di luar kelas tidak menerima; setelah logout perangkat tidak menerima notifikasi pengguna sebelumnya.
- Layar kecil (≈360 px) dan lebar (≥768 px), termasuk peta dan panel informasi.
- Uji di lokasi nyata dengan lebih dari satu perangkat; GPS di dalam gedung bisa kurang akurat.

## 12. Definition of Done

Memenuhi acceptance criteria • tiga alur demo berjalan di perangkat nyata • fitur Sprint 1–2 tetap berfungsi • tidak ada crash • semua kondisi (loading/kosong/error/lokasi/notifikasi) tertangani • lolos review 1 orang lain • merge ke `main` via PR • diuji PM di perangkat nyata.

## 13. Catatan teknis & keputusan terbuka

- **Perubahan dari Sprint 2:** presensi dipindah ke halaman sendiri, terpisah dari detail sesi; kehadiran hanya ditulis lewat jalur validasi lokasi; `ruangan` teks digantikan rujukan `labId`; Rules presensi diperketat.
- **Validasi lokasi di sisi penyimpanan** (ketentuan sprint: bukan sekadar informasi visual). *Keputusan terbuka (PM):* (a) Cloud Function callable yang menghitung jarak lalu menulis dokumen kehadiran, dengan Rules melarang tulis langsung dari klien; atau (b) pembatasan di Security Rules dengan perkiraan kotak di sekitar laboratorium, karena haversine sulit dihitung di Rules. Rekomendasi: (a), karena Cloud Functions sudah dibutuhkan untuk push notification. Cloud Functions umumnya membutuhkan paket Blaze pada project Firebase. *Diisi setelah dikonfirmasi:* `____`.
- **Push notification** membutuhkan pengirim di sisi server; tidak aman dikirim langsung dari HP asisten.
- **Maps API key:** dibuat dan dibatasi oleh PM. *Diisi setelah dibuat:* `____`.
- **Nilai yang ditetapkan di Fase 0:** radius default laboratorium, batas akurasi koordinat, dan definisi *berlangsung/berikutnya*: `____`.
- **Keaslian lokasi:** GPS bisa dipalsukan (mock location). Bila terdeteksi di Android, hasilnya dicatat atau ditolak. *Keputusan terbuka:* di luar kebutuhan wajib sprint.
- **QR opsional:** dikerjakan hanya setelah fitur wajib selesai. Paket kamera/pemindai adalah paket native; bila dipakai, masukkan ke build ulang Fase 0 agar tidak perlu build ulang kedua.
- **Tampilan notifikasi saat aplikasi terbuka (foreground):** *keputusan terbuka* (banner dalam aplikasi atau pustaka notifikasi tambahan).
- **Security Rules sementara dari Sprint 2** wajib diganti dengan rules per peran, termasuk `labs`, token, dan `attendance`, sebelum demo.
- **Build development bersifat bersama:** satu APK baru dipakai semua anggota. Simpan salinan APK di Drive karena artefak EAS kedaluwarsa dalam beberapa hari.

## 14. Referensi materi

- Push notification: https://medium.com/@silverskytechnology/rich-push-notifications-in-react-native-a-complete-guide-797dd9747366
- Maps: https://medium.com/@silverskytechnology/implementing-google-maps-and-routes-tracking-in-react-native-a-starter-guide-9768282594b8

---

# (ARSIP) SPRINT 2 - Data dinamis: Firebase Auth + Cloud Firestore + klasifikasi izin oleh AI

## 1. Tujuan
Mengubah aplikasi dari data dummy menjadi aplikasi multi-pengguna: tiap orang punya akun, data tersimpan permanen di Firestore, dan perubahan terlihat oleh pengguna terkait secara real-time. Praktikan yang berhalangan dapat mengajukan izin; alasan izin diklasifikasikan oleh model AI (API dari pengajar) sebagai **informasi pendukung**, sedangkan keputusan tetap di tangan asisten.

## 2. Alur demo (acceptance Sprint 2)
**Alur A — Presensi**
1. Asisten login → membuka sesi.
2. Praktikan login (perangkat lain) → melihat status sesi berubah menjadi dibuka → presensi.
3. Data tersimpan di Firestore → rekap asisten bertambah otomatis (tanpa muat ulang).
4. Praktikan mencoba presensi lagi → ditolak.
5. Asisten menutup sesi → status berubah di perangkat praktikan.

**Alur B — Izin**
1. Praktikan login → mengajukan izin untuk sesi tertentu dengan alasan.
2. Alasan dikirim ke API AI → kategori ditampilkan dan disimpan bersama pengajuan (jika AI gagal/timeout, pengajuan tetap tersimpan tanpa kategori).
3. Asisten melihat daftar izin beserta alasan dan kategori AI → menerima atau menolak.
4. Praktikan melihat status pengajuannya berubah.

## 3. Requirement (acceptance criteria)
| ID | Requirement | Kriteria selesai | Owner |
|---|---|---|---|
| SRS-01 | Autentikasi & peran | Register, login, logout via Firebase Auth; peran (asisten/praktikan) tersimpan di profil; menu & rute sesuai peran; belum login diarahkan ke halaman login; sesi login bertahan setelah app ditutup | Rajib |
| SRS-02 | Data praktikum | CRUD kelas, peserta, jadwal, sesi oleh asisten; praktikan hanya melihat data yang berkaitan dengannya | Ilham (asisten), Fauzan (praktikan) |
| SRS-03 | Presensi terintegrasi | Presensi hanya saat sesi dibuka; tersimpan per praktikan per sesi; presensi ganda ditolak | Fauzan (praktikan), Ilham (buka/tutup sesi) |
| SRS-04 | Real-time | Status sesi, presensi, dan rekap berubah otomatis (`onSnapshot`); data tetap ada setelah app dibuka ulang | Ilham, Fauzan |
| SRS-05 | Pengajuan izin | Praktikan mengisi alasan untuk sesi tertentu; pengajuan tersimpan dengan status yang bisa dipantau | Rajib |
| SRS-06 | Integrasi AI | Alasan dikirim ke API AI dengan timeout; kategori ditampilkan & disimpan; AI **tidak** menentukan terima/tolak; AI gagal tidak menghalangi pengajuan | PM (layanan), Rajib (tampilan di form) |
| SRS-07 | Pemeriksaan izin | Asisten melihat daftar izin + alasan + kategori AI, lalu menerima/menolak; keputusan tersimpan dan terlihat praktikan | Fauzan |
| SRS-08 | Validasi & keamanan | Input tidak valid, gagal login, gagal Firestore, dan gagal AI ditangani dengan pesan jelas; akses dibatasi per peran lewat Firestore Security Rules | PM (+ semua untuk validasi di layar masing-masing) |

Kondisi yang wajib ditangani di semua layar: belum login, data sedang dimuat, daftar kosong, koneksi terganggu, layanan AI tidak merespons.

## 4. Teknologi
- Expo SDK 58, React Native, Expo Router (file-based), TypeScript
- `@react-native-firebase/app` dan `@react-native-firebase/auth` (butuh **development build**, tidak bisa Expo Go)
- Cloud Firestore (real-time listener)
- Firebase BoM dipin ke `34.19.0` lewat `plugins/withFirebaseBom.js` (jangan dihapus; lihat Catatan Teknis)
- EAS Build untuk development build Android

## 5. Menjalankan (setup anggota tim)
Anggota **tidak perlu** membuat project Firebase atau EAS sendiri.

```bash
git clone https://github.com/ilhamraffi/apk-praktikum.git
cd apk-praktikum
git checkout main && git pull
npm install
```

1. **Pasang APK development build** dari PM (file `.apk`, dikirim lewat grup/Drive) di HP Android. Izinkan "install dari sumber tidak dikenal"; jika Play Protect memperingatkan, pilih *Install anyway*.
2. Jalankan Metro dalam mode development build:
   ```bash
   npx expo start --dev-client
   ```
   Pastikan terminal menampilkan `Using development build` (jika `Using Expo Go`, tekan `s`).
3. Buka aplikasi **my-app** di HP, scan QR dari terminal, atau ketik `http://<IP-laptop>:8081`.
4. Jika HP tidak bisa menjangkau laptop (Wi-Fi kampus sering memblokir antar perangkat): pakai `npx expo start --dev-client --tunnel`, atau kabel USB dengan `adb reverse tcp:8081 tcp:8081` lalu isi `http://localhost:8081`.

Perubahan **JavaScript/TypeScript** langsung terbaca tanpa build ulang. **Build ulang** hanya diperlukan jika ada paket native baru atau perubahan `app.json` — beri tahu PM.

```bash
# Build development (hanya PM / anggota yang diberi akses team Expo)
eas build --profile development --platform android
```

### Konfigurasi klasifikasi AI

Pengajuan izin disimpan terlebih dahulu sebagai `pending`, kemudian teks alasan
dikategorikan oleh **model lokal** menjadi `sakit`, `keluarga`, atau `keperluan`.
Hasilnya disimpan pada `kategoriAI` dengan `statusAI: "success"`. Teks yang tidak
dikenali disimpan tanpa kategori dengan `statusAI: "unknown_vocabulary"`;
kegagalan model memakai `statusAI: "failed"`. Keputusan izin tetap dilakukan
secara manual oleh asisten.

Model kategori dilatih dari `ml/data/alasan_izin.csv` memakai TF-IDF + LinearSVC,
lalu diekspor ke `src/ai/kategori/model-kategori.json`. Inferensi berjalan di
perangkat tanpa `EXPO_PUBLIC_AI_API_URL`, panggilan HTTP, atau modul native
tambahan. Firestore tetap memerlukan koneksi untuk menyimpan pengajuan dan
hasilnya. Tombol **Analisis ulang alasan** tersedia pada pengajuan milik sendiri
yang masih menunggu, termasuk pengajuan lama yang sebelumnya tidak memiliki
kategori. Analisis ulang hanya mengubah dua field AI.

Dataset bawaan masih berupa **contoh sintetis**; angka evaluasinya bukan klaim
akurasi aplikasi. Ganti dengan alasan nyata yang dianonimkan lalu latih ulang
sesuai [panduan pelatihan](ml/README.md). Model lama EDOM disimpan sebagai arsip
dan label sentimen lama tetap tampil pada dokumen izin lama. Rincian implementasi
ada di [Integrasi kategori](docs/INTEGRASI_KATEGORI.md).

## 6. Struktur & kepemilikan (usulan, dibekukan PM di Fase 0)
Satu folder/file = satu pemilik. Perubahan di area orang lain lewat PM atau issue.

```
src/app/_layout.tsx                    [Rajib] provider + penjaga rute
src/app/(auth)/login.tsx, register.tsx [Rajib]
src/app/praktikan/izin/                [Rajib] form & status izin
src/app/asisten/ (kelas, jadwal, sesi) [Ilham]
src/app/praktikan/ (jadwal, presensi)  [Fauzan]
src/app/asisten/izin/                  [Fauzan] pemeriksaan izin
src/context/AuthContext.tsx            [Rajib]
src/hooks/                             [pemilik fitur masing-masing]
src/types/index.ts                     [PM] kontrak data
src/lib/firebase.ts, src/lib/ai.ts     [PM]
src/components/shared/                 [PM] loading, empty, error, StatusSesi, InformasiSesi
firestore.rules                        [PM]
app.json, plugins/                     [PM]
```

## 7. Skema Firestore (usulan awal; perubahan hanya lewat PM)
| Koleksi / dokumen | Isi utama |
|---|---|
| `users/{uid}` | nama, nim, email, role (`ASISTEN` \| `PRAKTIKAN`) |
| `classes/{classId}` | nama, kode, `pesertaUids[]` |
| `sessions/{sessionId}` | classId, namaPraktikum, modul, waktu, ruangan, status (`BELUM_DIBUKA` \| `DIBUKA` \| `DITUTUP`) |
| `sessions/{sessionId}/attendance/{uid}` | nama, nim, waktu (`serverTimestamp`), catatan |
| `permissions/{izinId}` | uid, sessionId, alasan, kategoriAI (nullable), statusAI, status (`pending` \| `approved` \| `rejected`), diputuskanOleh, dibuat/diputuskan pada |

Alasan desain:
- Presensi memakai `uid` sebagai ID dokumen di subkoleksi → presensi ganda otomatis tertolak dan tidak ada tabrakan tulis antar praktikan (berbeda dari Sprint 1 yang memakai array di dalam sesi).
- Semua waktu memakai `serverTimestamp()`, bukan jam perangkat.

## 8. Pembagian kerja
**PM** — Fondasi & kualitas: setup Firebase (Auth Email/Password, Firestore) dan undangan anggota; kontrak data + stub `useAuth()`; data awal (akun uji, satu kelas, satu sesi); komponen bersama (loading/empty/error + pemetaan kode error Firebase ke pesan jelas); layanan AI (timeout + fallback); **Security Rules** dan pengujiannya dengan akun praktikan; aturan Git & review PR; development build; QA skenario demo; README & APK akhir. PM tidak menulis kode fitur layar.

**Rajib — Autentikasi & izin (praktikan)** · SRS-01, 05, 06 (tampilan)
`AuthContext`, layar register/login, penyimpanan peran, penjaga rute (belum login → login; praktikan tidak bisa membuka rute asisten dan sebaliknya), form pengajuan izin, daftar & status izin milik sendiri, tampilan kategori AI.

**Ilham — Sisi asisten** · SRS-02, 03 (buka/tutup), 04
CRUD kelas, peserta, jadwal, sesi (dengan validasi form & konfirmasi hapus); buka/tutup sesi (komponen `PembukaanSesi`/`PenutupanSesi` dihubungkan ke Firestore); rekap kehadiran real-time (fungsi `hitungRekapPresensi` dan `RekapPresensi` dipakai ulang).

**Fauzan — Sisi praktikan & pemeriksaan izin** · SRS-02 (praktikan), 03, 04, 07
Jadwal praktikan (difilter menurut kelas), status sesi real-time, presensi sekali per sesi, riwayat kehadiran, layar asisten untuk memeriksa izin (daftar, alasan, kategori AI, terima/tolak).

### Kontrak antar-slice (dibekukan di Fase 0)
- `useAuth()` → `{ user, role, loading, signUp, signIn, signOut }` (stub dari PM, diganti implementasi asli oleh Rajib tanpa mengubah bentuknya)
- Tipe & nama koleksi hanya dari `src/types/index.ts`
- Pesan error ke pengguna lewat helper bersama dari PM
- Butuh komponen/aksi baru? Buat issue ke PM. Sementara itu buat versi lokal **di dalam file layar sendiri**, jangan mengedit `components/shared/`.

## 9. Urutan kerja
| Fase | PM | Rajib | Ilham | Fauzan |
|---|---|---|---|---|
| 0 | Merge setup Firebase ke `main`, kontrak data, stub `useAuth`, komponen bersama, data awal, rules sementara | `npm install`, pasang APK, coba jalan | idem | idem |
| 1 (paralel) | Layanan AI, Security Rules per peran | Auth + penjaga rute | CRUD kelas/jadwal/sesi, buka/tutup | Jadwal & presensi (memakai user palsu dari stub) |
| 2 | Hubungkan AI ke form, perketat rules izin | Form & status izin | Rekap real-time, bantu integrasi | Pemeriksaan izin asisten |
| 3 | QA dua alur demo, uji rules, perbaikan akhir | Bugfix | Bugfix | Bugfix |

Titik serah: setelah Rajib merge Auth ke `main`, Ilham dan Fauzan mengganti sumber `useAuth()` tanpa mengubah layar. Integrasi ke `main` dilakukan **berkala (beberapa hari sekali)**, bukan menumpuk di akhir.

## 10. Aturan Git
- Satu fitur satu branch: `feat/auth`, `feat/asisten-sesi`, `feat/praktikan-presensi`, `feat/izin-praktikan`, `feat/izin-asisten`.
- `git pull --rebase origin main` sebelum push; jangan push langsung ke `main`; PR wajib direview minimal 1 orang dan disetujui PM.
- Jangan commit `.env`, keystore, atau kunci service account. File `google-services.json` ada di repo (pastikan repo tetap **private**).
- Detail: `docs/GIT_WORKFLOW.md`.

## 11. Skenario uji (PM)
Dua alur demo (§2) dengan **dua HP**, ditambah kasus tepi:
- Belum login membuka rute asisten/praktikan; praktikan membuka rute asisten
- Email sudah dipakai, sandi salah, input kosong/tidak valid
- Daftar kosong, data sedang dimuat, koneksi diputus saat menyimpan
- Presensi saat sesi belum dibuka/sudah ditutup; presensi ganda; dua praktikan presensi bersamaan
- API AI timeout/gagal → pengajuan tetap tersimpan
- Praktikan mencoba mengubah sesi, kelas, atau keputusan izin (harus ditolak oleh Security Rules)
- Layar kecil (≈360 px) dan lebar (≥768 px)

## 12. Definition of Done
Memenuhi acceptance criteria • tidak ada crash • semua kondisi (loading/kosong/error) tertangani • lolos review 1 orang lain • merge ke `main` via PR • diuji PM di perangkat nyata.

## 13. Catatan teknis & keputusan terbuka
- **Perubahan dari Sprint 1:** login memakai **email + kata sandi** (Firebase Auth); NIM disimpan di profil `users`. Opsi "Izin" di form presensi **dihapus** dan dialihkan ke alur pengajuan izin. Data dummy dan `DataSistem.tsx` digantikan Auth + hook Firestore.
- **Peran asisten** tidak boleh dipilih bebas saat registrasi. *Keputusan terbuka:* ditetapkan PM lewat kode undangan atau daftar email asisten.
- **API AI:** URL, format request/respons, dan batas pemakaian disediakan pengajar. *Diisi setelah diterima:* `____`.
- **Firebase BoM 34.19.0 + Kotlin:** plugin `withFirebaseBom` mencegah build gagal akibat Firebase BoM terbaru yang membutuhkan Kotlin lebih baru. Jangan menghapus plugin ini tanpa menguji build.
- **Security Rules sementara** (hanya untuk pengembangan) membolehkan semua pengguna yang login membaca/menulis; **wajib diganti** dengan rules per peran sebelum demo.
- **Build development** bersifat bersama: satu APK dipakai semua anggota. Simpan salinan APK di Drive karena artefak EAS kedaluwarsa dalam beberapa hari.

---

# ARSIP — SPRINT 1 (UI)

> Sprint 1 sudah selesai. Bagian di bawah dipertahankan sebagai referensi. Hal yang digantikan oleh Sprint 2: state di memori, data dummy, pilihan peran tanpa autentikasi, dan cara menjalankan dengan Expo Go.

## Alur demo (acceptance Sprint 1)
1. Masuk sebagai **Asisten** → buka sesi *Pemrograman Web (A)* → konfirmasi di modal.
2. Keluar → masuk sebagai **Praktikan** (mis. Andi, kelas A) → buka sesi tsb → **Presensi Sekarang** → isi NIM di bottom sheet → berhasil.
3. Coba presensi lagi → ditolak (sudah tercatat).
4. Masuk lagi sebagai Asisten → lihat **rekap** → **tutup sesi**. Praktikan kini melihat status "Selesai".

> Catatan: state hidup di memori. Pindah peran lewat tombol **Keluar** (bukan menutup app) agar data tetap ada. Tombol "Reset data demo" ada di layar Masuk.

## Fitur Sprint 1
Jadwal & detail sesi • buka/tutup sesi (status sinkron di kedua peran) • presensi + waktu + umpan balik • blokir presensi ganda • rekap asisten & riwayat praktikan • Form (NIM), Modal (konfirmasi), Bottom Sheet (presensi) • empty state (jadwal kosong, sesi belum dibuka, belum ada presensi, presensi sudah tercatat) • layout Flexbox responsif (maks. lebar 640 px, terpusat).

## Menjalankan (Sprint 1)
```bash
npx create-expo-app@latest absensi-praktikum --template blank
cd absensi-praktikum
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
# salin App.js, folder src/, eas.json dari repo ini (timpa App.js bawaan)
npx expo start          # scan QR dengan Expo Go / tekan 'a' untuk emulator Android
```
Build APK: `npx eas-cli build -p android --profile preview` (perlu akun Expo).

## Struktur & kepemilikan (Sprint 1)
```
App.js                      [Dev 1] navigasi root
src/theme.js, data/, state/ [Dev 1] tema, dummy, state global
src/components/ui.js        [Dev 1] komponen bersama
src/screens/RoleSelect.js   [Dev 1]
src/screens/As*.js          [Dev 2] alur Asisten
src/screens/St*.js          [Dev 3] alur Praktikan
docs/PRD.md  docs/GIT_WORKFLOW.md
```

## Review / catatan (Sprint 1)
- Presensi memakai konfirmasi NIM (simulasi verifikasi identitas); tanpa kode sesi/QR/lokasi — di luar scope Sprint 1.
- "Sesi hari ini" tidak dibatasi tanggal; asisten bebas membuka sesi mana pun (dummy).
- Data hilang saat app di-restart (sesuai ketentuan state-only). Persistensi/DB → Sprint 2.
- Sesi `selesai` tidak dapat dibuka ulang (disengaja, agar rekap final).
- Komponen bersama (`ui.js`) adalah titik rawan konflik.

## PRD — Sprint 1 (UI)

### 1. Tujuan & ruang lingkup
Mendemonstrasikan alur presensi praktikum dari 2 sudut pandang. **In scope:** UI, navigasi, state lokal, data dummy. **Out of scope:** database, API, autentikasi nyata, QR/lokasi, notifikasi, ekspor rekap.

### 2. Pengguna & kebutuhan
| Peran | Kebutuhan |
|---|---|
| Asisten | Lihat jadwal, buka sesi, pantau kehadiran, tutup sesi |
| Praktikan | Lihat jadwal & detail sesi, presensi saat sesi dibuka, lihat catatan kehadiran sendiri |

### 3. Requirement (acceptance criteria)
| ID | Requirement | Kriteria selesai | Owner |
|---|---|---|---|
| R1 | Jadwal & detail sesi | Daftar menampilkan praktikum, kelas, waktu, ruang, status; empty state jadwal kosong | Dev 2 (asisten), Dev 3 (praktikan) |
| R2 | Kelola sesi | Buka/tutup via modal konfirmasi; status langsung berubah di semua layar | Dev 2 |
| R3 | Presensi | Hanya saat sesi `dibuka`; form NIM di bottom sheet; waktu tercatat; pesan sukses; tidak bisa dua kali | Dev 3 |
| R4 | Rekap | Asisten: daftar hadir + jam + hitungan x/total; Praktikan: riwayat pribadi; empty state keduanya | Dev 2 / Dev 3 |
| R5 | Pilih peran & identitas | Pilih peran → pilih akun dummy → masuk; tombol Keluar | Dev 1 |
| R6 | State & data dummy | Satu sumber state global + API aksi | Dev 1 |
| R7 | Responsif | Flexbox, tidak patah di HP kecil & tablet/web | Semua |
| R8 | Komponen bersama | Badge, Btn, Card, Empty, Sheet, Confirm | Dev 1 |

### 4. Pembagian kerja (Sprint 1)
Pembagian per **kepemilikan file**, bukan per fitur campuran. Satu file = satu pemilik.

- **Dev 1 — Foundation & Shared:** navigasi root, state global, dummy data, komponen UI bersama, layar pilih peran, build APK.
- **Dev 2 — Alur Asisten:** jadwal asisten, detail sesi, buka/tutup + Confirm, rekap + empty state.
- **Dev 3 — Alur Praktikan:** jadwal kelas sendiri, detail sesi, form presensi di Sheet, feedback, riwayat + empty state.
- **PM:** backlog & prioritas, acceptance testing per requirement, QA skenario demo, kelola PR/jadwal review, notulen & demo sprint. PM tidak menulis kode fitur (boleh menambah/ubah file di `docs/`).

Kontrak antar-slice Sprint 1: `useApp()` dengan `user, sessions, attendance, students, login, logout, openSession(id), closeSession(id), hasAttended(sessionId, studentId), checkIn(sessionId, nim), demo.{clearSessions,reset}`; komponen `Screen, Badge, Btn, Empty, SessionCard, Sheet, Confirm, fmtTime, s`.

### 5. Timeline (contoh 2 minggu)
| Hari | Dev 1 | Dev 2 | Dev 3 | PM |
|---|---|---|---|---|
| 1–2 | Kerangka + kontrak + merge ke `develop` | Mock layar di atas kontrak | Mock layar di atas kontrak | Finalisasi PRD, setup board & repo |
| 3–7 | RoleSelect, polishing komponen | R1, R2, R4 (asisten) | R1, R3, R4 (praktikan) | Review PR, uji per fitur |
| 8–9 | Bugfix, build APK | Bugfix | Bugfix | QA end-to-end, daftar bug |
| 10 | — | — | — | Demo & retrospektif |

### 6. Skenario uji (PM)
Ikuti alur Sprint 1 + tambahan: presensi saat sesi belum dibuka (ditolak/disabled), NIM salah, presensi ganda, sesi ditutup lalu praktikan membuka, jadwal kosong, layar kecil (≈360 px) dan lebar (≥768 px).

### 7. Definition of Done
Memenuhi acceptance criteria • tidak ada crash • lolos review 1 orang lain • merge ke `develop` via PR • dicek PM.
