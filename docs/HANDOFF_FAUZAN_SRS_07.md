# Integrasi Fauzan — SRS-07 pemeriksaan izin

Implementasi ini mengikuti `src/types/index.ts` dan `useAuth()` yang ada.
Tidak mengubah Auth Rajib, CRUD/rekap Ilham, skema PM, dependensi atau konfigurasi native.
Perubahan masih lokal; belum di-commit, di-push, atau diuji di Firebase/HP asli.

## Fitur dan rute

- `/asisten/izin`: daftar real-time dengan filter Menunggu, Diterima, Ditolak.
- `/asisten/izin/[izinId]`: detail praktikan, sesi, alasan, kategori AI, status,
  waktu pengajuan/keputusan, serta konfirmasi terima/tolak oleh asisten.
- Pembacaan daftar memakai `permissions` dengan `where("status", "==", status)`.
  Urutan terbaru dihitung di klien, sehingga dokumen dengan `dibuatPada: null`
  tetap terlihat. Tidak menambah kebutuhan indeks gabungan.
- Profil/sesi diambil dari `users/{uid}` dan `sessions/{sessionId}` yang dirujuk
  kartu/detail. Profil/sesi hilang ditampilkan dengan UID/ID serta peringatan.
- Tidak membuat listener sebelum Auth siap/role ASISTEN. Anak layar di-key dengan
  UID agar pergantian akun melepaskan listener, konfirmasi, dan state akun lama.
- Loading, kosong, error dan retry, cache, write tertunda, pengajuan dihapus,
  serta AI tanpa kategori ditangani. AI tidak menentukan keputusan.

## Penulisan keputusan

`putuskanPengajuanIzin` menggunakan transaksi: periksa UID Firebase Auth, baca
profil asisten, baca izin terbaru, pastikan role ASISTEN dan status masih pending.
UID praktikan, ID sesi, dan alasan harus sama dengan pengajuan yang dikonfirmasi.
Jika berubah, asisten harus memeriksa ulang. Perubahan hasil AI tidak otomatis
menerima/menolak izin dan tidak menghalangi keputusan manual.

Transaksi hanya meng-update tiga field pada `permissions/{izinId}`:

```ts
{
  status: "approved" | "rejected",
  diputuskanOleh: asistenUid,
  diputuskanPada: serverTimestamp(),
}
```

Alasan, pemilik, sesi, hasil AI, dan waktu pengajuan dipertahankan. Keputusan
kedua ditolak; tidak ada fitur mengubah keputusan final. Tombol memerlukan
konfirmasi, terkunci saat request berjalan, dan baru menampilkan berhasil
setelah transaksi selesai. Transaksi memerlukan koneksi, tidak mengantre
keputusan offline. Rules tetap wajib memaksakan batas ini di server.

## Pesan untuk Rajib (siap disalin)

> SRS-07 pemeriksaan izin asisten sudah diimplementasikan di
> `/asisten/izin` dan `/asisten/izin/[izinId]`. Gunakan koleksi `permissions`
> dengan `uid`, `sessionId`, `alasan`, `status: "pending"`,
> `dibuatPada: serverTimestamp()`, serta `kategoriAI`/`statusAI` sesuai kontrak.
> AI gagal/timeout tetap simpan pengajuan; kategori boleh null.
> Layar praktikan perlu `onSnapshot` pada pengajuan miliknya untuk membaca
> `pending`/`approved`/`rejected`, `diputuskanOleh`, dan `diputuskanPada`.
> Jika hasil AI datang belakangan, update hanya `kategoriAI`/`statusAI`;
> jangan menulis ulang seluruh dokumen dengan status pending karena keputusan
> asisten mungkin sudah tersimpan. Jangan ubah alasan/pemilik/sesi setelah
> pengajuan dikirim tanpa kesepakatan PM. Tetap jaga bentuk `useAuth()` dan
> UID Firebase Auth. Route guard asisten perlu mencakup kedua rute baru ini.
> Setelah bagianmu siap, kita uji pengajuan -> AI -> keputusan -> status
> praktikan dengan dua akun/perangkat.

## Integrasi menu — Ilham/Rajib

Tautan masuk **belum dipasang** pada jadwal/dashboard, karena file tersebut
milik Ilham/Rajib. Route baru dapat diakses lewat URL Expo Router, tetapi
alur normal dari menu menunggu satu tautan berikut dipasang oleh pemilik file.

Untuk Ilham, di `src/app/asisten/index.tsx`, tambahkan setelah tombol
"Kelola kelas & peserta" di dalam `styles.actions`. Semua import/style berikut
sudah tersedia di file Ilham saat handoff ini ditulis:

```tsx
<Link href="/asisten/izin" asChild>
  <TouchableOpacity accessibilityRole="link" style={styles.secondaryBtn}>
    <Text style={styles.secondaryText}>Periksa pengajuan izin</Text>
  </TouchableOpacity>
</Link>
```

Rajib juga boleh menambahkan tautan `/asisten/izin` pada dashboard khusus
ASISTEN. Tidak perlu mengubah bentuk provider, membuat koleksi baru, atau
menambah paket native untuk fitur ini.

## PM — Security Rules dan kebijakan

Validasi UI/transaksi tidak menggantikan Rules. PM perlu menguji:

- Asisten ber-role ASISTEN boleh membaca/query izin dan profil/sesi yang dirujuk.
  Praktikan hanya boleh membaca izin dengan `uid == request.auth.uid`.
- Praktikan hanya boleh membuat izin miliknya pada sesi yang sah sesuai
  keanggotaan. Status awal pending; field keputusan harus kosong/belum ada.
- Update keputusan hanya oleh ASISTEN, dari pending ke approved/rejected.
  Field yang berubah hanya `status`, `diputuskanOleh`, `diputuskanPada`;
  pemutus harus UID Auth dan waktu harus waktu server (`request.time`).
- Tolak keputusan ulang dan perubahan field keputusan oleh praktikan.
  Pembaruan AI yang terlambat tidak boleh mengembalikan status ke pending.
  Sepakati hak update AI setelah keputusan final dengan Rajib/layanan AI.
- Skema sekarang belum memiliki kepemilikan kelas oleh asisten. Implementasi
  mengikuti role ASISTEN untuk semua izin, seperti CRUD asisten saat ini.
  Pembatasan asisten per kelas memerlukan kontrak/query baru melalui PM.
- Izin disetujui belum otomatis menjadi attendance berstatus Izin. Hubungan
  izin-ke-presensi/rekap tetap keputusan PM bersama Ilham/Rajib. Fitur ini
  tidak menimpa catatan Hadir atau mengubah statistik rekap.
- Sesi/profil yang telah dihapus tidak menghapus izin. UI memperingatkan dan
  tetap menampilkan ID; kebijakan retensi/penanganan izin tersebut perlu PM.

## Pemeriksaan dan uji bersama

```sh
npx expo lint
npx tsc --noEmit
node --test tests/*.test.mjs
npx expo export --platform android --no-bytecode --max-workers 2 --output-dir .expo/fauzan-izin-check
```

Tes Node memuat kode produksi dengan Firebase, lifecycle hook, dan komponen
native tiruan. Tes meliputi kontrak tiga field, role/akun berubah, dua keputusan,
retry transaksi, data berubah/hilang, offline, listener dan cleanup, filter,
AI kosong, konfirmasi, ketukan ganda, serta hasil request setelah unmount.
Ini tidak membuktikan Security Rules, contention Firebase asli, atau tampilan
di perangkat. Export Android hanya memeriksa bundling JavaScript, bukan APK.

Uji integrasi yang masih wajib:

1. Rajib mengirim izin dengan akun praktikan yang terdaftar pada sesi Ilham.
2. Asisten melihat pengajuan otomatis, memeriksa alasan/AI, dan mengonfirmasi.
3. Praktikan melihat status berubah tanpa restart; tutup/buka app, data tetap ada.
4. Ulangi dengan AI timeout, ditolak, koneksi putus, dua asisten bersamaan,
   role dicabut, logout saat request, dan pengajuan dihapus saat layar terbuka.
5. PM menguji akses ilegal lewat SDK terhadap Rules, bukan hanya lewat UI.
6. Verifikasi layar kecil/lebar pada development build yang sesuai.

Seluruh pekerjaan Fauzan (SRS-02 praktikan, SRS-03/04, dan SRS-07) dikumpulkan
pada satu branch `feat/praktikan-presensi` dan diajukan melalui satu PR ke
`main`, sesuai pilihan Fauzan. Commit seluruh perubahan sebelum mengambil
perubahan terbaru dari `origin/main` dan melakukan rebase. Selesaikan konflik
yang muncul sebelum push. Pengujian memakai helper bersama
`tests/helpers/load-source.mjs`.
