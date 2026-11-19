import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { loadSource } from "./helpers/load-source.mjs";

const require = createRequire(import.meta.url);
const model = require("../src/ai/kategori/model-kategori.json");
const classifier = require("../src/ai/kategori/classifier.js");
const ai = loadSource("src/lib/ai.ts", {
  "../ai/kategori/model-kategori.json": model, "../ai/kategori/classifier": classifier,
});
const hasil = loadSource("src/utils/hasilAI.ts");

test("model kategori memakai tiga label dan bentuk fitur konsisten", () => {
  assert.deepEqual(new Set(model.labels), new Set(["sakit", "keluarga", "keperluan"]));
  assert.equal(model.labels.length, 3);
  assert.equal(model.weights.length, model.labels.length);
  assert.equal(model.bias.length, model.labels.length);
  for (const baris of model.weights) assert.equal(baris.length, model.idf.length);
  const indeksTerbesar = Math.max(...Object.values(model.vocabulary));
  assert.ok(indeksTerbesar < model.idf.length);
});

test("model memberi kategori alasan, bukan sentimen", async () => {
  assert.equal(await ai.klasifikasikanAlasan("Saya sedang demam dan harus istirahat."), "sakit");
  assert.equal(await ai.klasifikasikanAlasan("Saya harus mengantar ibu ke rumah sakit."), "keluarga");
  assert.equal(await ai.klasifikasikanAlasan("Saya mengikuti lomba di luar kampus."), "keperluan");
});

test("input kosong/tidak dikenal tidak dipaksa menjadi kategori, skor bukan probabilitas", async () => {
  for (const nilai of ["", "  ", "😀😀😀", "qzxvkjwpp xyzxyzqq"]) {
    await assert.rejects(ai.klasifikasikanAlasan(nilai), ai.TeksTidakDikenaliKategori);
  }
  const prediction = classifier.createKategoriClassifier(model)("Saya sakit demam.");
  assert.equal(prediction.scoreType, "decision_margin");
  assert.equal(prediction.experimental, true);
  assert.equal(prediction.scores.every(Number.isFinite), true);
});

test("inferensi berjalan tanpa jaringan dan classifier diinisialisasi sekali", async () => {
  let inisialisasi = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("Model lokal tidak boleh menggunakan jaringan"); };
  try {
    const source = loadSource("src/lib/ai.ts", {
      "../ai/kategori/model-kategori.json": model,
      "../ai/kategori/classifier": {
        createKategoriClassifier: (data) => {
          inisialisasi += 1;
          return classifier.createKategoriClassifier(data);
        },
      },
    });
    await source.klasifikasikanAlasan("Saya sedang demam dan harus istirahat.");
    await source.klasifikasikanAlasan("Saya harus mengantar ibu ke rumah sakit.");
    assert.equal(inisialisasi, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test("UI membedakan kategori baru, sentimen EDOM lama, dan teks yang tidak dikenal", () => {
  for (const [kategoriAI, label] of [["sakit", "Sakit"], ["keluarga", "Keluarga"], ["keperluan", "Keperluan"]]) {
    const info = hasil.informasiHasilAI({ kategoriAI, statusAI: "success" });
    assert.equal(info.judul, "Kategori AI");
    assert.equal(info.hasil, label);
    assert.match(info.penjelasan, /tidak memverifikasi kebenaran alasan/);
    assert.match(info.penjelasan, /Keputusan tetap ditentukan asisten/);
  }
  for (const lama of ["positif", "netral", "negatif"]) {
    const info = hasil.informasiHasilAI({ kategoriAI: lama, statusAI: "success" });
    assert.match(info.judul, /Sentimen AI \(EDOM\)/);
  }
  for (const kategoriAI of ["Kesehatan", "constructor", "__proto__"]) {
    const info = hasil.informasiHasilAI({ kategoriAI, statusAI: "success" });
    assert.equal(info.judul, "Kategori AI");
    assert.equal(info.hasil, kategoriAI);
  }
  assert.match(hasil.informasiHasilAI({ kategoriAI: null, statusAI: "unknown_vocabulary" }).hasil, /belum dapat dianalisis/);
  assert.match(hasil.informasiHasilAI({ kategoriAI: null, statusAI: "failed" }).hasil, /Tidak tersedia/);
  assert.match(hasil.informasiHasilAI({ kategoriAI: null, statusAI: "not_requested" }).hasil, /analisis ulang/);
});

test("paket EDOM asli tetap utuh sebagai arsip sumber", () => {
  for (const [nama, hash] of [
    ["model-edom.json", "55d4c02a185ef7a13b1132954e97130f1294476275f15c1e44bf6720a25779ff"],
    ["sentiment.js", "ccb1b38fda4abdff04e951bb736f766eaa77302a3e659eea0b014a650a0ff2b4"],
  ]) {
    assert.equal(
      createHash("sha256").update(readFileSync(new URL(`../src/ai/edom/${nama}`, import.meta.url))).digest("hex"),
      hash,
    );
  }
});
