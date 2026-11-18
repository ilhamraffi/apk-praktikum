# Model kategori alasan izin (lokal)

Model ini menggantikan pemakaian sentimen EDOM sebagai keluaran utama
`kategoriAI`. EDOM asli tetap disimpan di `src/ai/edom/` sebagai arsip sumber
dan untuk menampilkan dokumen izin lama.

## Ringkasan

| | |
|---|---|
| Berkas model | `model-kategori.json` |
| Inferensi | `classifier.js` (`createKategoriClassifier`) |
| Algoritma | TF-IDF (unigram + bigram, sublinear TF, L2) + LinearSVC |
| Label | `keluarga`, `keperluan`, `sakit` |
| Fitur | 756 |
| Status | `contoh_sintetis_belum_divalidasi` |
| Jaringan | Tidak ada; seluruh inferensi di perangkat |

## Data latih

Dataset bawaan `ml/data/alasan_izin.csv` berisi **136 contoh sintetis**
(45 `sakit`, 45 `keluarga`, 46 `keperluan`) yang dibuat untuk menguji alur,
bukan diambil dari pengajuan nyata. Karena itu:

- Metrik di bawah **bukan** klaim performa pada alasan praktikan sebenarnya.
- Model belum layak disebut tervalidasi dan tidak boleh dipakai untuk menilai
  kebenaran alasan atau dasar keputusan izin.
- Ganti dataset dengan alasan nyata yang dianonimkan, lalu latih ulang sesuai
  `ml/README.md`.

## Metrik pada dataset contoh

Holdout 25% (34 baris uji, `random_state=42`): akurasi 0,9706 dan macro F1 0,9696.
Cross-validation 5 fold: 0,8828 ± 0,0412.

| Label | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| keluarga | 1,00 | 0,91 | 0,95 | 11 |
| keperluan | 1,00 | 1,00 | 1,00 | 12 |
| sakit | 0,92 | 1,00 | 0,96 | 11 |

Confusion matrix (baris = aktual, kolom = prediksi, urutan `keluarga`,
`keperluan`, `sakit`):

```
[[10  0  1]
 [ 0 12  0]
 [ 0  0 11]]
```

Angka ini hanya mengukur kecocokan pada pola dataset sintetis yang mirip dengan
kalimat uji. Jangan menuliskannya sebagai akurasi aplikasi.

## Batasan

- Hanya tiga kategori. Tidak ada kelas `lainnya`, sehingga teks yang masih
  mengandung kata dikenal akan tetap dipaksa ke salah satu dari tiga label.
- Tidak ada probabilitas terkalibrasi. `scores` adalah decision margin
  LinearSVC, bukan tingkat keyakinan.
- Kalimat ambigu dapat salah kategori, misalnya "acara" yang bisa berarti acara
  keluarga atau acara kampus.
- Teks tanpa satu pun kata dikenal menghasilkan `label: null` dan status
  `unknown_vocabulary`; aplikasi tidak menggantinya dengan kategori apa pun.
- Model membaca pola kata, bukan memahami konteks atau memverifikasi kebenaran
  alasan.

## Privasi dan operasional

Inferensi berjalan lokal, tanpa HTTP maupun API key. Tidak ada data alasan yang
dikirim ke layanan pihak ketiga. Firestore tetap memerlukan koneksi untuk
menyimpan hasil, dan hasil hanya mengubah `kategoriAI`/`statusAI`.
