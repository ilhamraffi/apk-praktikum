# Model EDOM dari materi pengajar

`model-edom.json` dan `sentiment.js` disalin tanpa perubahan dari paket
`model-edom` yang diberikan pengguna pada 15 November 2026.
Dokumentasi paket asli disertakan sebagai `UPSTREAM-README.md`.

Sumber materi: https://github.com/Doctor3131/ppk-rn-expo-58/blob/main/docs/Pertemuan%202/Model%20EDOM.md

SHA-256 berkas asli:

- model-edom.json: `55d4c02a185ef7a13b1132954e97130f1294476275f15c1e44bf6720a25779ff`
- sentiment.js: `ccb1b38fda4abdff04e951bb736f766eaa77302a3e659eea0b014a650a0ff2b4`

Model LinearSVC ini memakai 3.000 fitur dan label `negatif`, `netral`, `positif`.
Metadata model menandainya `research_baseline_edom_not_practicum_validated`.
Data latih adalah komentar evaluasi dosen/perkuliahan (EDOM), bukan dataset
kategori alasan izin. Hasil adalah sentimen teks, bukan bukti kebenaran alasan,
diagnosis, atau keputusan menerima/menolak izin. Teks tak dikenal menghasilkan
label null; aplikasi tidak menggantinya dengan netral.

Lisensi repository materi disalin ke `LICENSE-UPSTREAM.txt` dari
https://github.com/Doctor3131/ppk-rn-expo-58/blob/main/LICENSE.

Paket mengatribusikan dataset ke https://github.com/samfch/edom-sentiment.
Lisensi MIT dataset disertakan dalam `LICENSE-DATASET.txt` dari repository itu.
Paket empat berkas yang diterima tidak menyertakan script/dataset pelatihan;
aplikasi hanya membawa model dan inferensi. `requirements.txt` tidak diperlukan
untuk menjalankan aplikasi atau membangun APK.
