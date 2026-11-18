# Pelatihan model kategori alasan izin

Folder ini berisi alur pelatihan model lokal yang memetakan teks alasan izin ke
`sakit`, `keluarga`, atau `keperluan`. Hasilnya adalah satu berkas JSON yang
dibaca langsung oleh aplikasi tanpa jaringan.

## Berkas

| Berkas | Isi |
|---|---|
| `train_kategori.py` | Pelatihan TF-IDF + LinearSVC, evaluasi, dan ekspor JSON |
| `data/alasan_izin.csv` | Dataset `alasan,label` — **bawaan masih contoh sintetis** |
| `metrics.json` | Hasil evaluasi terakhir (holdout + cross-validation) |

Keluaran model ada di `src/ai/kategori/model-kategori.json`.

## Penting: data bawaan bukan data nyata

`data/alasan_izin.csv` disusun sebagai contoh agar alur bisa dijalankan dan
diuji. **Jangan mengutip angka akurasi dari dataset ini sebagai hasil penelitian
atau performa aplikasi.** Ganti isinya dengan alasan izin nyata yang sudah
dianonimkan, lalu latih ulang.

Saat mengumpulkan data:

- Hapus nama, NIM, nomor telepon, dan detail pribadi lain.
- Minta izin pemilik data dan gunakan hanya untuk tugas ini.
- Jangan menyalin alasan dari akun orang lain tanpa izin.
- Jaga keseimbangan jumlah contoh per kategori (idealnya ≥ 50 per kategori).
- Simpan teks apa adanya, termasuk singkatan yang biasa dipakai praktikan.

## Format dataset

```csv
alasan,label
Saya sedang demam dan harus istirahat,sakit
Saya harus mengantar ibu ke rumah sakit,keluarga
Saya mengikuti lomba di luar kampus,keperluan
```

- Header wajib persis `alasan,label`.
- Label yang dipakai aplikasi: `sakit`, `keluarga`, `keperluan` (huruf kecil).
- Satu baris satu alasan. Hindari koma di dalam teks atau bungkus dengan tanda kutip.

## Menjalankan pelatihan

Butuh Python 3.10+ dengan `scikit-learn`, `numpy`, dan `pandas`:

```bash
pip install scikit-learn numpy pandas
python ml/train_kategori.py
```

Opsi yang tersedia:

```bash
python ml/train_kategori.py \
  --data ml/data/alasan_izin.csv \
  --output src/ai/kategori/model-kategori.json \
  --metrics ml/metrics.json \
  --min-per-class 20 \
  --test-size 0.25 \
  --status contoh_sintetis_belum_divalidasi \
  --sumber "contoh sintetis untuk menguji alur"
```

Script akan berhenti jika ada kategori dengan contoh kurang dari
`--min-per-class` (default 20). Setelah data nyata terkumpul dan dievaluasi,
baru gunakan `--status production` dan isi `--sumber` dengan keterangan dataset
yang sebenarnya.

## Kesetaraan dengan inferensi JavaScript

Agar hasil di Python dan HP sama, `train_kategori.py` dan
`src/ai/kategori/classifier.js` memakai aturan yang sama:

1. Hapus tag HTML, normalisasi NFKD, buang diakritik, lalu huruf kecil.
2. Token `[a-z0-9]+` dengan pemetaan alias (mis. `gak` → `tidak`).
3. Fitur unigram + bigram.
4. TF sublinear `1 + ln(count)`, dikali IDF, lalu normalisasi L2.
5. `LinearSVC`, keputusan `bias + bobot · vektor`.

Mengubah salah satu sisi tanpa sisi lainnya akan membuat hasil melenceng.

## Setelah melatih ulang

1. Periksa `ml/metrics.json` dan confusion matrix, bukan hanya akurasi.
2. Jalankan `node --test tests/*.test.mjs`, `npx tsc --noEmit`, dan `npx expo lint`.
3. Perbarui `src/ai/kategori/README.md` (model card) dengan dataset dan metrik baru.
4. Uji manual di HP dengan kalimat yang tidak ada di dataset latih.
5. Jangan menaikkan `status` ke `production` sebelum ada evaluasi pada data nyata
   yang terpisah dari data latih.
