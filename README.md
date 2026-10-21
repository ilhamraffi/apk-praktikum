# Absensi Praktikum — Sprint 1 (UI)

**TL;DR** — Aplikasi mobile (React Native + Expo) untuk presensi praktikum dengan 2 peran: **Asisten** (buka sesi → pantau rekap → tutup sesi) dan **Praktikan** (lihat jadwal → presensi → lihat riwayat). Sprint 1 = **UI saja**: tanpa database, data dummy lokal, perubahan dikelola dengan React state.

## Alur demo (acceptance Sprint 1)
1. Masuk sebagai **Asisten** → buka sesi *Pemrograman Web (A)* → konfirmasi di modal.
2. Keluar → masuk sebagai **Praktikan** (mis. Andi, kelas A) → buka sesi tsb → **Presensi Sekarang** → isi NIM di bottom sheet → berhasil.
3. Coba presensi lagi → ditolak (sudah tercatat).
4. Masuk lagi sebagai Asisten → lihat **rekap** → **tutup sesi**. Praktikan kini melihat status "Selesai".

> Catatan: state hidup di memori. Pindah peran lewat tombol **Keluar** (bukan menutup app) agar data tetap ada. Tombol "Reset data demo" ada di layar Masuk.

## Fitur Sprint 1
Jadwal & detail sesi • buka/tutup sesi (status sinkron di kedua peran) • presensi + waktu + umpan balik • blokir presensi ganda • rekap asisten & riwayat praktikan • Form (NIM), Modal (konfirmasi), Bottom Sheet (presensi) • empty state (jadwal kosong, sesi belum dibuka, belum ada presensi, presensi sudah tercatat) • layout Flexbox responsif (maks. lebar 640 px, terpusat).

## Menjalankan
```bash
npx create-expo-app@latest absensi-praktikum --template blank
cd absensi-praktikum
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
# salin App.js, folder src/, eas.json dari repo ini (timpa App.js bawaan)
npx expo start          # scan QR dengan Expo Go / tekan 'a' untuk emulator Android
```
Build APK: `npx eas-cli build -p android --profile preview` (perlu akun Expo).

## Struktur & kepemilikan
```
App.js                      [Dev 1] navigasi root
src/theme.js, data/, state/ [Dev 1] tema, dummy, state global
src/components/ui.js        [Dev 1] komponen bersama
src/screens/RoleSelect.js   [Dev 1]
src/screens/As*.js          [Dev 2] alur Asisten
src/screens/St*.js          [Dev 3] alur Praktikan
docs/PRD.md  docs/GIT_WORKFLOW.md
```
Detail tugas: bagian **PRD** di bawah (salinan di `docs/PRD.md`). Aturan Git: `docs/GIT_WORKFLOW.md`.

## Review / catatan
- Presensi memakai konfirmasi NIM (simulasi verifikasi identitas); tanpa kode sesi/QR/lokasi — diluar scope Sprint 1.
- "Sesi hari ini" tidak dibatasi tanggal; asisten bebas membuka sesi mana pun (dummy).
- Data hilang saat app di-restart (sesuai ketentuan state-only). Persistensi/DB → Sprint 2.
- Sesi `selesai` tidak dapat dibuka ulang (disengaja, agar rekap final).
- Komponen bersama (`ui.js`) adalah titik rawan konflik — lihat aturan di PRD §4.

---

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
| R6 | State & data dummy | Satu sumber state global + API aksi (lihat §4) | Dev 1 |
| R7 | Responsif | Flexbox, tidak patah di HP kecil & tablet/web | Semua (di layar masing-masing) |
| R8 | Komponen bersama | Badge, Btn, Card, Empty, Sheet, Confirm | Dev 1 |

### 4. Pembagian kerja (tanpa tumpang tindih)
Pembagian per **kepemilikan file**, bukan per fitur campuran. Satu file = satu pemilik.

**Dev 1 — Foundation & Shared** (`App.js`, `src/theme.js`, `src/data/*`, `src/state/*`, `src/components/ui.js`, `RoleSelect.js`, `eas.json`)
Navigasi root, state global, dummy data, komponen UI bersama, layar pilih peran, build APK.

**Dev 2 — Alur Asisten** (`src/screens/AsSchedule.js`, `AsSession.js`)
Daftar jadwal asisten, detail sesi, buka/tutup + Confirm, rekap kehadiran + empty state.

**Dev 3 — Alur Praktikan** (`src/screens/StSchedule.js`, `StSession.js`, `StHistory.js`)
Jadwal kelas sendiri, detail sesi, form presensi di Sheet, feedback sukses/gagal, riwayat + empty state.

**PM** — backlog & prioritas, acceptance testing per requirement, QA skenario demo (§6), kelola PR/jadwal review, notulen & demo sprint. PM tidak menulis kode fitur (boleh menambah/ubah file di `docs/`).

#### Kontrak antar-slice (dibekukan di Hari 1)
Dev 2 & 3 hanya memakai API berikut dari `useApp()`; perubahan kontrak = lewat Dev 1 + persetujuan PM:
`user, sessions, attendance, students, login, logout, openSession(id), closeSession(id), hasAttended(sessionId, studentId), checkIn(sessionId, nim) → {ok,msg,time}, demo.{clearSessions,reset}`
Komponen: `Screen, Badge, Btn, Empty, SessionCard, Sheet, Confirm, fmtTime, s`.
Butuh komponen/aksi baru? Buat issue → Dev 1. Sementara itu, buat versi lokal **di dalam file layar sendiri**, jangan edit `ui.js`.

#### Mitigasi ketergantungan
Dev 1 merge kerangka (navigasi + state + ui.js + stub layar) **Hari 1–2**; Dev 2 & 3 bekerja paralel setelahnya.

### 5. Timeline (contoh 2 minggu)
| Hari | Dev 1 | Dev 2 | Dev 3 | PM |
|---|---|---|---|---|
| 1–2 | Kerangka + kontrak + merge ke `develop` | Mock layar di atas kontrak | Mock layar di atas kontrak | Finalisasi PRD, setup board & repo |
| 3–7 | RoleSelect, polishing komponen | R1, R2, R4 (asisten) | R1, R3, R4 (praktikan) | Review PR, uji per fitur |
| 8–9 | Bugfix, build APK | Bugfix | Bugfix | QA end-to-end, daftar bug |
| 10 | — | — | — | Demo & retrospektif |

### 6. Skenario uji (PM)
Ikuti alur di README + tambahan: presensi saat sesi belum dibuka (ditolak/disabled), NIM salah, presensi ganda, sesi ditutup lalu praktikan membuka, jadwal kosong, layar kecil (≈360 px) dan lebar (≥768 px).

### 7. Definition of Done
Memenuhi acceptance criteria • tidak ada crash • lolos review 1 orang lain • merge ke `develop` via PR • dicek PM.
