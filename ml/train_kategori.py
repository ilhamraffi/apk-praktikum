"""Latih model kategori alasan izin (sakit/keluarga/keperluan) untuk inferensi lokal.

Skrip ini menghasilkan JSON dengan skema yang sama seperti model EDOM sehingga
dapat dibaca oleh classifier JavaScript di `src/ai/kategori/classifier.js`.

Penting: metrik hanya bermakna jika dataset berisi alasan nyata yang sudah
diberi label. Dataset bawaan `ml/data/alasan_izin.csv` adalah contoh sintetis
untuk menguji alur, bukan bukti performa model.

Contoh:
    python ml/train_kategori.py
    python ml/train_kategori.py --data ml/data/alasan_izin.csv \
        --output src/ai/kategori/model-kategori.json \
        --status production --sumber "alasan izin praktikan 2026 (anonymized)"
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.feature_extraction.text import TfidfVectorizer

WORD_RE = re.compile(r"[a-z0-9]+")

# Harus sama dengan aliases di classifier.js. Alias hanya memetakan satu token
# ke satu token; ekspansi multi-kata tidak didukung oleh inferensi JavaScript.
ALIASES = {
    "gak": "tidak",
    "nggak": "tidak",
    "ga": "tidak",
    "gk": "tidak",
    "enggak": "tidak",
    "kagak": "tidak",
    "tdk": "tidak",
    "org": "orang",
    "ortu": "orangtua",
    "udh": "sudah",
    "udah": "sudah",
    "aja": "saja",
    "sja": "saja",
    "gue": "saya",
    "gua": "saya",
    "gwa": "saya",
    "aku": "saya",
    "sy": "saya",
    "yg": "yang",
    "dgn": "dengan",
    "utk": "untuk",
    "krn": "karena",
    "karna": "karena",
}

PREPROCESSING = "unicode_nfkd_ascii_words_unigram_bigram_sublinear_tf_l2_v1"


def normalize(text: str) -> str:
    """Sama dengan normalisasi di classifier.js (unicode_nfkd...)."""
    text = re.sub(r"<[^>]*>", " ", text)
    text = unicodedata.normalize("NFKD", text)
    text = re.sub(r"[\u0300-\u036f]", "", text)
    return text.lower()


def analyze_grams(text: str) -> list[str]:
    """Unigram + bigram, urutan dan pemetaan alias sama dengan classifier.js."""
    words = [ALIASES.get(word, word) for word in WORD_RE.findall(normalize(text))]
    return words + [f"{kiri} {kanan}" for kiri, kanan in zip(words, words[1:])]


def baca_dataset(path: Path) -> tuple[list[str], list[str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != ["alasan", "label"]:
            raise SystemExit(f"Header CSV harus 'alasan,label', ditemukan {reader.fieldnames}")
        teks, label = [], []
        for nomor, row in enumerate(reader, start=2):
            alasan = (row.get("alasan") or "").strip()
            kategori = (row.get("label") or "").strip().lower()
            if not alasan or not kategori:
                continue
            if not WORD_RE.search(normalize(alasan)):
                raise SystemExit(f"Baris {nomor}: alasan tidak punya kata yang bisa diproses")
            teks.append(alasan)
            label.append(kategori)
    if not teks:
        raise SystemExit("Dataset kosong.")
    return teks, label


def cek_dataset(teks: list[str], label: list[str], min_per_class: int) -> dict[str, int]:
    jumlah = Counter(label)
    if len(jumlah) < 2:
        raise SystemExit("Dataset harus punya minimal dua kategori.")
    for kategori, total in sorted(jumlah.items()):
        if total < min_per_class:
            raise SystemExit(
                f"Kategori '{kategori}' hanya {total} contoh; minimal {min_per_class}. "
                "Tambahkan data atau turunkan --min-per-class."
            )
    duplikat = Counter(teks)
    bentrok = sorted({t for t, n in duplikat.items() if n > 1})
    if bentrok:
        print(f"Peringatan: {len(bentrok)} teks duplikat (mis. {bentrok[0]!r}).")
    return dict(sorted(jumlah.items()))


def buat_pipeline(max_features: int, seed: int) -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer=analyze_grams,
            sublinear_tf=True,
            norm="l2",
            smooth_idf=True,
            max_features=max_features,
            dtype=np.float64,
        )),
        ("svc", LinearSVC(C=1.0, class_weight="balanced", max_iter=10_000, dual="auto", random_state=seed)),
    ])


def evaluasi(teks: list[str], label: list[str], max_features: int, test_size: float, seed: int) -> dict:
    x_train, x_test, y_train, y_test = train_test_split(
        teks, label, test_size=test_size, random_state=seed, stratify=label
    )
    pipeline = buat_pipeline(max_features, seed).fit(x_train, y_train)
    prediksi = pipeline.predict(x_test)
    kategori = sorted(set(label))
    laporan = classification_report(
        y_test, prediksi, labels=kategori, output_dict=True, zero_division=0
    )
    matriks = confusion_matrix(y_test, prediksi, labels=kategori)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=seed)
    skor_cv = cross_val_score(buat_pipeline(max_features, seed), teks, label, cv=cv)
    return {
        "holdout": {
            "test_size": test_size,
            "train_rows": len(x_train),
            "test_rows": len(x_test),
            "accuracy": round(float(laporan["accuracy"]), 4),
            "macro_f1": round(float(f1_score(y_test, prediksi, average="macro")), 4),
            "per_label": {
                kategori_label: {
                    "precision": round(float(nilai["precision"]), 4),
                    "recall": round(float(nilai["recall"]), 4),
                    "f1": round(float(nilai["f1-score"]), 4),
                    "support": int(nilai["support"]),
                }
                for kategori_label, nilai in laporan.items()
                if kategori_label in kategori
            },
            "confusion_matrix": {"labels": kategori, "rows": matriks.tolist()},
        },
        "cross_validation": {
            "folds": int(cv.get_n_splits()),
            "accuracy_mean": round(float(np.mean(skor_cv)), 4),
            "accuracy_std": round(float(np.std(skor_cv)), 4),
            "scores": [round(float(skor), 4) for skor in skor_cv],
        },
    }


def ekspor_model(
    teks: list[str],
    label: list[str],
    metrik: dict,
    dataset_path: Path,
    jumlah: dict[str, int],
    max_features: int,
    seed: int,
    status: str,
    sumber: str,
) -> dict:
    pipeline = buat_pipeline(max_features, seed).fit(teks, label)
    tfidf: TfidfVectorizer = pipeline.named_steps["tfidf"]
    svc: LinearSVC = pipeline.named_steps["svc"]
    if svc.coef_.shape[0] != len(svc.classes_):
        raise SystemExit("Bentuk coef_ tidak sesuai jumlah kelas.")
    return {
        "schema_version": 1,
        "status": status,
        "algorithm": "LinearSVC",
        "labels": [str(item) for item in svc.classes_],
        "preprocessing": PREPROCESSING,
        "aliases": ALIASES,
        "vocabulary": {kata: int(indeks) for kata, indeks in tfidf.vocabulary_.items()},
        "idf": [float(nilai) for nilai in tfidf.idf_],
        "weights": [[float(nilai) for nilai in baris] for baris in svc.coef_],
        "bias": [float(nilai) for nilai in svc.intercept_],
        "training_data": {
            "file": dataset_path.as_posix(),
            "sha256": hashlib.sha256(dataset_path.read_bytes()).hexdigest(),
            "rows": len(teks),
            "per_label": jumlah,
            "source": sumber,
            "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "evaluation": metrik,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", type=Path, default=Path("ml/data/alasan_izin.csv"))
    parser.add_argument("--output", type=Path, default=Path("src/ai/kategori/model-kategori.json"))
    parser.add_argument("--metrics", type=Path, default=Path("ml/metrics.json"))
    parser.add_argument("--min-per-class", type=int, default=20)
    parser.add_argument("--max-features", type=int, default=3000)
    parser.add_argument("--test-size", type=float, default=0.25)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--status", default="contoh_sintetis_belum_divalidasi")
    parser.add_argument(
        "--sumber",
        default="contoh sintetis untuk menguji alur; ganti dengan alasan izin nyata yang dianonimkan",
    )
    args = parser.parse_args()

    if not args.data.exists():
        raise SystemExit(f"Dataset tidak ditemukan: {args.data}")
    teks, label = baca_dataset(args.data)
    jumlah = cek_dataset(teks, label, args.min_per_class)

    print(f"Dataset : {args.data} ({len(teks)} baris)")
    print(f"Kategori: {jumlah}")
    if args.status != "production":
        print(
            "\nPERINGATAN: model diekspor sebagai eksperimen. Metrik di bawah hanya valid "
            "untuk dataset ini dan TIDAK boleh diklaim sebagai akurasi aplikasi.\n"
        )

    metrik = evaluasi(teks, label, args.max_features, args.test_size, args.seed)
    holdout = metrik["holdout"]
    print(f"Akurasi holdout : {holdout['accuracy']:.2%} ({holdout['test_rows']} baris uji)")
    print(f"Macro F1 holdout: {holdout['macro_f1']:.2%}")
    for kategori_label, nilai in holdout["per_label"].items():
        print(
            f"  {kategori_label:<10} precision={nilai['precision']:.2f} "
            f"recall={nilai['recall']:.2f} f1={nilai['f1']:.2f} support={nilai['support']}"
        )
    print(f"Confusion matrix ({' | '.join(holdout['confusion_matrix']['labels'])}):")
    for kategori_label, baris in zip(holdout["confusion_matrix"]["labels"], holdout["confusion_matrix"]["rows"]):
        print(f"  {kategori_label:<10} {baris}")
    cv = metrik["cross_validation"]
    print(f"Cross-validation {cv['folds']} fold: {cv['accuracy_mean']:.2%} +/- {cv['accuracy_std']:.2%}")

    model = ekspor_model(
        teks, label, metrik, args.data, jumlah, args.max_features, args.seed, args.status, args.sumber
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(model, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    args.metrics.parent.mkdir(parents=True, exist_ok=True)
    args.metrics.write_text(
        json.dumps(
            {"dataset": model["training_data"], "evaluation": metrik},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\nModel  : {args.output} ({args.output.stat().st_size / 1024:.1f} KiB)")
    print(f"Metrik : {args.metrics}")
    print(f"Fitur  : {len(model['vocabulary'])}")
    if args.status != "production":
        print("\nJangan menuliskan angka evaluasi ini di laporan sebagai hasil model nyata.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
