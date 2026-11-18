// Integrasi model kategori + batas Firestore tiruan, tanpa akses proyek Firebase tim.
import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { loadSource } from "./helpers/load-source.mjs";

const require = createRequire(import.meta.url);
const ai = loadSource("src/lib/ai.ts", {
  "../ai/kategori/model-kategori.json": require("../src/ai/kategori/model-kategori.json"),
  "../ai/kategori/classifier": require("../src/ai/kategori/classifier.js"),
});
const utils = loadSource("src/utils/izinAsisten.ts");
const errors = loadSource("src/lib/errors.ts");
const uid = "praktikan-a", izinId = `${uid}_sesi-satu`, path = `permissions/${izinId}`;
const alasan = "Saya sedang demam sehingga tidak bisa mengikuti praktikum.";
const request = { uid, sessionId: "sesi-satu", alasan };
const permission = { uid, sessionId: "sesi-satu", alasan, status: "pending", kategoriAI: null, statusAI: "failed", dibuatPada: "2026-11-15T12:00:00Z" };

function harness(customAI = ai) {
  const docs = new Map([[`users/${uid}`, { role: "PRAKTIKAN" }]]);
  const auth = { currentUser: { uid } };
  const writes = [], updates = [];
  const controls = { retry: null, onRead: null, offline: false, setError: null, commitError: null, attempts: 0 };
  const serverTime = { serverTimestamp: true };
  const firestore = {
    doc: (_db, ...parts) => ({ path: parts.join("/"), id: parts.at(-1) }),
    serverTimestamp: () => serverTime,
    setDoc: async (ref, value) => {
      if (controls.setError) throw controls.setError;
      docs.set(ref.path, { ...value }); writes.push({ path: ref.path, value: { ...value } });
    },
    runTransaction: async (_db, callback) => {
      if (controls.offline) throw { code: "firestore/unavailable" };
      for (let attempt = 0; attempt < 2; attempt += 1) {
        controls.attempts += 1;
        const staged = [];
        await callback({
          get: async (ref) => {
            assert.equal(staged.length, 0, "Tulis hanya setelah seluruh read selesai");
            const value = docs.get(ref.path);
            controls.onRead?.(ref.path);
            return { exists: () => value !== undefined, data: () => value };
          },
          update: (ref, patch) => staged.push({ path: ref.path, patch }),
        });
        if (attempt === 0 && controls.retry) { controls.retry(); continue; }
        if (controls.commitError) throw controls.commitError;
        for (const item of staged) {
          docs.set(item.path, { ...docs.get(item.path), ...item.patch }); updates.push(item);
        }
        return;
      }
    },
  };
  const source = loadSource("src/hooks/useIzinPraktikan.ts", {
    "@react-native-firebase/firestore": firestore,
    "../lib/firebase": { auth, db: {} }, "../lib/errors": errors,
    "../lib/ai": customAI, "../utils/izinAsisten": utils,
  });
  return { ...source, docs, auth, writes, updates, controls, serverTime };
}

test("pengajuan tersimpan dahulu, kategori model asli disimpan tanpa mengubah status pending", async () => {
  const h = harness();
  await h.ajukanIzinPraktikan(request);
  assert.equal(h.writes[0].value.status, "pending");
  assert.equal(h.writes[0].value.kategoriAI, null);
  assert.equal(h.writes[0].value.dibuatPada, h.serverTime);
  assert.deepEqual(h.updates, [{ path, patch: { kategoriAI: "sakit", statusAI: "success" } }]);
  assert.equal(h.docs.get(path).status, "pending");
  assert.equal(h.docs.get(path).diputuskanOleh, null);
  assert.equal(h.docs.get(path).diputuskanPada, null);
});

test("pengajuan sakit/keluarga/keperluan tetap menunggu keputusan asisten", async () => {
  for (const label of ["sakit", "keluarga", "keperluan"]) {
    const h = harness({ ...ai, klasifikasikanAlasan: async () => label });
    await h.ajukanIzinPraktikan(request);
    assert.equal(h.docs.get(path).kategoriAI, label);
    assert.equal(h.docs.get(path).status, "pending");
  }
});

test("teks tidak dikenal dan kegagalan model tetap menyimpan izin tanpa kategori palsu", async () => {
  const unknown = harness();
  await unknown.ajukanIzinPraktikan({ ...request, alasan: "qzxvkjwpp xyzxyzqq" });
  assert.equal(unknown.docs.get(path).kategoriAI, null);
  assert.equal(unknown.docs.get(path).statusAI, "unknown_vocabulary");
  assert.equal(unknown.docs.get(path).status, "pending");
  const broken = harness({ ...ai, klasifikasikanAlasan: async () => { throw new Error("Model rusak"); } });
  await broken.ajukanIzinPraktikan(request);
  assert.equal(broken.docs.get(path).statusAI, "failed");
  assert.equal(broken.docs.get(path).status, "pending");
});

test("izin lama gagal dianalisis dapat dianalisis ulang tanpa membuat ulang pengajuan", async () => {
  const h = harness(); h.docs.set(path, { ...permission });
  await h.analisisUlangIzinPraktikan({ uid, izinId });
  assert.equal(h.writes.length, 0);
  assert.equal(h.docs.get(path).dibuatPada, permission.dibuatPada);
  assert.equal(h.docs.get(path).alasan, alasan);
  assert.deepEqual(h.updates[0].patch, { kategoriAI: "sakit", statusAI: "success" });
});

test("analisis ulang menolak akun/role salah, izin milik orang lain, dokumen hilang dan keputusan final", async () => {
  for (const modify of [
    (h) => { h.auth.currentUser = null; },
    (h) => h.docs.set(`users/${uid}`, { role: "ASISTEN" }),
    (h) => h.docs.delete(`users/${uid}`),
    (h) => h.docs.delete(path),
    (h) => h.docs.set(path, { ...permission, uid: "orang-lain" }),
    (h) => h.docs.set(path, { ...permission, status: "approved" }),
    (h) => h.docs.set(path, { ...permission, status: "rejected" }),
    (h) => { h.controls.onRead = () => { h.auth.currentUser = { uid: "orang-lain" }; }; },
  ]) {
    const h = harness(); h.docs.set(path, { ...permission }); modify(h);
    await assert.rejects(h.analisisUlangIzinPraktikan({ uid, izinId }));
    assert.equal(h.updates.length, 0);
  }
});

test("retry memeriksa ulang alasan terbaru atau berhenti saat asisten lebih dulu memutuskan", async () => {
  const changed = harness(); changed.docs.set(path, { ...permission });
  changed.controls.retry = () => changed.docs.set(path, { ...permission, alasan: "Saya harus mengantar ibu ke rumah sakit." });
  await changed.analisisUlangIzinPraktikan({ uid, izinId });
  assert.equal(changed.docs.get(path).kategoriAI, "keluarga");
  for (const status of ["approved", "rejected"]) {
    const h = harness(); h.docs.set(path, { ...permission });
    h.controls.retry = () => h.docs.set(path, { ...permission, status, diputuskanOleh: "asisten-a" });
    await assert.rejects(h.analisisUlangIzinPraktikan({ uid, izinId }), /sudah diputuskan/);
    assert.equal(h.updates.length, 0);
    assert.equal(h.docs.get(path).status, status);
  }
});

test("gagal menyimpan izin tidak memanggil AI; gagal sinkronisasi AI tidak menggagalkan izin yang tersimpan", async () => {
  let calls = 0;
  const h = harness({ ...ai, klasifikasikanAlasan: async () => { calls += 1; return "sakit"; } });
  h.controls.setError = { code: "firestore/permission-denied" };
  await assert.rejects(h.ajukanIzinPraktikan(request));
  assert.equal(calls, 0);
  h.controls.setError = null;
  h.controls.commitError = { code: "firestore/unavailable" };
  await h.ajukanIzinPraktikan(request);
  assert.equal(h.docs.get(path).status, "pending");
  assert.equal(h.docs.get(path).kategoriAI, null);
  assert.equal(h.updates.length, 0);
  await assert.rejects(h.analisisUlangIzinPraktikan({ uid, izinId }));
});

test("retry offline menampilkan kegagalan dan tidak mengubah kategori tersimpan", async () => {
  const h = harness(); h.docs.set(path, { ...permission }); h.controls.offline = true;
  await assert.rejects(h.analisisUlangIzinPraktikan({ uid, izinId }), (error) => error.code === "firestore/unavailable");
  assert.deepEqual(h.docs.get(path), permission);
  assert.equal(h.updates.length, 0);
});
