import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { loadSource } from "./helpers/load-source.mjs";

const require = createRequire(import.meta.url);
const model = require("../src/ai/edom/model-edom.json");
const sentiment = require("../src/ai/edom/sentiment.js");
const ai = loadSource("src/lib/ai.ts", {
  "../ai/edom/model-edom.json": model, "../ai/edom/sentiment": sentiment,
});
const hasil = loadSource("src/utils/hasilAI.ts");

test("model dan inferensi sama persis dengan paket pengajar yang diperiksa", () => {
  for (const [name, expected] of [
    ["model-edom.json", "55d4c02a185ef7a13b1132954e97130f1294476275f15c1e44bf6720a25779ff"],
    ["sentiment.js", "ccb1b38fda4abdff04e951bb736f766eaa77302a3e659eea0b014a650a0ff2b4"],
  ]) {
    assert.equal(createHash("sha256").update(readFileSync(new URL(`../src/ai/edom/${name}`, import.meta.url))).digest("hex"), expected);
  }
  assert.deepEqual(model.labels, ["negatif", "netral", "positif"]);
});

test("model asli memberi sentimen, bukan kategori sakit atau keputusan izin", async () => {
  assert.equal(await ai.klasifikasikanAlasan("Asisten menjelaskan langkah praktikum dengan jelas."), "positif");
  assert.equal(await ai.klasifikasikanAlasan("Saya sedang demam sehingga tidak bisa mengikuti praktikum."), "netral");
});

test("input kosong/tidak dikenal tidak dijadikan netral, angka skor tidak diklaim sebagai probabilitas", async () => {
  for (const value of ["", "  ", "😀😀😀", "qzxvkjwpp xyzxyzqq"]) {
    await assert.rejects(ai.klasifikasikanAlasan(value), ai.TeksTidakDikenaliEDOM);
  }
  const result = sentiment.createSentimentClassifier(model)("Penjelasan asisten sangat jelas.");
  assert.equal(result.scoreType, "decision_margin");
  assert.equal(result.experimental, true);
  assert.equal(result.scores.every(Number.isFinite), true);
});

test("EDOM berjalan tanpa fetch/endpoint dan classifier diinisialisasi sekali", async () => {
  let initializations = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("Model lokal tidak boleh menggunakan jaringan"); };
  try {
    const source = loadSource("src/lib/ai.ts", {
      "../ai/edom/model-edom.json": model,
      "../ai/edom/sentiment": { createSentimentClassifier: (data) => { initializations += 1; return sentiment.createSentimentClassifier(data); } },
    });
    await source.klasifikasikanAlasan("Asisten menjelaskan langkah praktikum dengan jelas.");
    await source.klasifikasikanAlasan("Saya sedang demam sehingga tidak bisa mengikuti praktikum.");
    assert.equal(initializations, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test("UI membedakan sentimen EDOM, kategori lama, dan teks yang tidak dikenal", () => {
  for (const [kategoriAI, label] of [["positif", "Positif"], ["netral", "Netral"], ["negatif", "Negatif"]]) {
    const info = hasil.informasiHasilAI({ kategoriAI, statusAI: "success" });
    assert.match(info.judul, /Sentimen.*EDOM/);
    assert.equal(info.hasil, label);
    assert.match(info.penjelasan, /Keputusan tetap ditentukan asisten/);
  }
  for (const kategoriAI of ["Sakit", "Kesehatan", "constructor", "__proto__"]) {
    const info = hasil.informasiHasilAI({ kategoriAI, statusAI: "success" });
    assert.equal(info.judul, "Kategori AI");
    assert.equal(info.hasil, kategoriAI);
  }
  assert.match(hasil.informasiHasilAI({ kategoriAI: null, statusAI: "unknown_vocabulary" }).hasil, /belum dapat dianalisis/);
  assert.match(hasil.informasiHasilAI({ kategoriAI: null, statusAI: "failed" }).hasil, /Tidak tersedia/);
  assert.match(hasil.informasiHasilAI({ kategoriAI: null, statusAI: "not_requested" }).hasil, /analisis ulang/);
});
