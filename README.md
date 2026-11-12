# Absensi Praktikum (HadirLab)

**TL;DR** — Aplikasi mobile (React Native + Expo) untuk presensi praktikum dengan 2 peran: **Asisten** (kelola kelas & sesi → buka sesi → pantau rekap → tutup sesi → periksa izin) dan **Praktikan** (lihat jadwal → presensi → ajukan izin → pantau status).

| Sprint | Fokus | Status |
|---|---|---|
| Sprint 1 | UI saja: data dummy lokal, state React | Selesai (arsip di bagian bawah) |
| **Sprint 2** | **Data dinamis: Firebase Auth + Cloud Firestore + klasifikasi izin oleh AI** | **Berjalan** |

---

# SPRINT 2 — Data Dinamis dengan Firebase

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
