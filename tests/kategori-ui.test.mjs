// Uji JSX dan handler dengan batas UI tiruan; bukan screenshot/layout di HP.
import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./helpers/load-source.mjs";
import { hookHarness } from "./helpers/hook-harness.mjs";

const errors = loadSource("src/lib/errors.ts");
const utils = loadSource("src/utils/hasilAI.ts");
const izinUtils = loadSource("src/utils/izinAsisten.ts");
const pengajuan = { id: "p_s", uid: "p", sessionId: "s", alasan: "Sedang demam", kategoriAI: null, statusAI: "failed", status: "pending" };
const session = { id: "s", classId: "k", namaPraktikum: "PPK", modul: "Modul 1", waktu: "Senin", ruangan: "Lab", status: "BELUM_DIBUKA" };
const jsx = (type, props) => ({ type, props });
const runtime = { jsx, jsxs: jsx };
const native = Object.fromEntries(["ActivityIndicator", "FlatList", "Text", "TouchableOpacity", "View"].map((name) => [name, name]));
native.StyleSheet = { create: (styles) => styles };

function nodes(tree) {
  const found = [];
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || !node.props) return;
    found.push(node);
    for (const key of ["children", "ListHeaderComponent", "ListEmptyComponent"]) visit(node.props[key]);
  };
  visit(tree); return found;
}
const text = (tree) => nodes(tree).filter((node) => node.type === "Text").flatMap((node) => node.props.children).join(" ");
const button = (tree) => nodes(tree).find((node) => node.type === "TouchableOpacity");
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function retryHarness(save = async () => {}) {
  const hooks = hookHarness(); const calls = [];
  let props = { uid: "p", pengajuan, dariCache: false };
  const { AnalisisUlangIzin } = loadSource("src/components/praktikan/AnalisisUlangIzin.tsx", {
    react: hooks.react, "react/jsx-runtime": runtime, "react-native": native,
    "../../hooks/useIzinPraktikan": { analisisUlangIzinPraktikan: (input) => { calls.push(input); return save(input); } },
    "../../lib/errors": errors,
  });
  return { ...hooks, calls, render: (changes = {}) => { props = { ...props, ...changes }; return hooks.render(() => AnalisisUlangIzin(props)); } };
}

test("hasil AI menampilkan kategori, ketidakpastian, dan keputusan manusia", () => {
  const { HasilAnalisisIzin } = loadSource("src/components/izin/HasilAnalisisIzin.tsx", {
    "react/jsx-runtime": runtime, "react-native": native, "../../utils/hasilAI": utils,
  });
  for (const [label, tampilan] of [["sakit", "Sakit"], ["keluarga", "Keluarga"], ["keperluan", "Keperluan"]]) {
    const rendered = text(HasilAnalisisIzin({ pengajuan: { ...pengajuan, kategoriAI: label, statusAI: "success" } }));
    assert.match(rendered, /Kategori AI/);
    assert.match(rendered, new RegExp(tampilan));
    assert.match(rendered, /tidak memverifikasi kebenaran alasan/);
    assert.match(rendered, /Keputusan tetap ditentukan asisten/);
  }
  const unknown = text(HasilAnalisisIzin({ pengajuan: { ...pengajuan, statusAI: "unknown_vocabulary" } }));
  assert.match(unknown, /belum dapat dianalisis/);
  assert.doesNotMatch(unknown, /Sakit/);
});

test("analisis ulang hanya dimulai saat diketuk, ketukan ganda ditolak dan hasil menunggu commit", async () => {
  const pending = deferred(); const h = retryHarness(() => pending.promise);
  const submit = button(h.render()).props.onPress;
  assert.equal(h.calls.length, 0);
  const first = submit(); await submit();
  assert.deepEqual(h.calls, [{ uid: "p", izinId: "p_s" }]);
  assert.equal(button(h.render()).props.disabled, true);
  assert.doesNotMatch(text(h.render()), /diperbarui/);
  pending.resolve(); await first;
  assert.match(text(h.render()), /Hasil analisis diperbarui/);
});

test("analisis ulang gagal mempertahankan izin dan mengizinkan retry", async () => {
  const h = retryHarness(async () => { throw { code: "firestore/unavailable" }; });
  await button(h.render()).props.onPress();
  const tree = h.render();
  assert.match(text(tree), /database tidak tersedia/);
  assert.equal(button(tree).props.disabled, false);
  assert.equal(h.calls.length, 1);
});

test("izin final/orang lain tidak menyediakan retry; cache memblokir tindakan", async () => {
  for (const change of [
    { pengajuan: { ...pengajuan, status: "approved" } },
    { pengajuan: { ...pengajuan, status: "rejected" } },
    { uid: "orang-lain" },
  ]) {
    const h = retryHarness(); assert.equal(h.render(change), null); assert.equal(h.calls.length, 0);
  }
  const h = retryHarness(); const tree = h.render({ dariCache: true });
  assert.equal(button(tree).props.disabled, true);
  await button(tree).props.onPress();
  assert.equal(h.calls.length, 0);
});

test("penyelesaian analisis setelah logout/unmount tidak mengubah state akun baru", async () => {
  for (const fails of [false, true]) {
    const pending = deferred(); const h = retryHarness(() => pending.promise);
    const result = button(h.render()).props.onPress();
    h.unmount(); const updates = h.updates();
    if (fails) pending.reject(new Error("Gagal")); else pending.resolve();
    await result; assert.equal(h.updates(), updates);
  }
});

function izinPage({ jadwal = {}, permissions = {} } = {}) {
  const defaultPage = loadSource("src/app/praktikan/izin.tsx", {
    "react/jsx-runtime": runtime, "react-native": native,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "expo-router": { Link: "Link", useLocalSearchParams: () => ({}) },
    "../../components/praktikan/FormIzin": { FormIzin: "FormIzin" },
    "../../components/praktikan/AnalisisUlangIzin": { AnalisisUlangIzin: "AnalisisUlangIzin" },
    "../../components/izin/HasilAnalisisIzin": { HasilAnalisisIzin: "HasilAnalisisIzin" },
    "../../components/shared/StatusLayar": { Empty: "Empty", ErrorBanner: "ErrorBanner", Loading: "Loading" },
    "../../context/AuthContext": { useAuth: () => ({ user: { uid: "p" }, role: "PRAKTIKAN", loading: false }) },
    "../../hooks/useDaftarIzinPraktikan": {},
    "../../hooks/useIzinPraktikan": { useDaftarIzinPraktikan: () => ({ izin: [pengajuan], loading: false, error: null, dariCache: false, cobaLagi: () => {}, ...permissions }) },
    "../../hooks/useJadwalPraktikan": { useJadwalPraktikan: () => ({ sesi: [session], loading: false, error: null, cobaLagi: () => {}, ...jadwal }) },
    "../../utils/izinAsisten": izinUtils,
  }).default;
  return defaultPage();
}

test("izin lama menampilkan hasil bersama dan tombol analisis ulang yang terikat akun/id", () => {
  const tree = izinPage({ permissions: { dariCache: true } });
  const list = nodes(tree).find((node) => node.type === "FlatList");
  const card = list.props.renderItem({ item: session });
  assert.equal(nodes(card).find((node) => node.type === "HasilAnalisisIzin").props.pengajuan, pengajuan);
  const retry = nodes(card).find((node) => node.type === "AnalisisUlangIzin");
  assert.equal(retry.props.uid, "p");
  assert.equal(retry.props.pengajuan.id, "p_s");
  assert.equal(retry.props.dariCache, true);
});

test("kegagalan jadwal ditampilkan sebagai error, bukan pesan belum ada sesi", () => {
  const tree = izinPage({ jadwal: { sesi: [], error: "Akses ditolak" } });
  assert.equal(nodes(tree).find((node) => node.type === "ErrorBanner").props.message, "Akses ditolak");
  assert.equal(nodes(tree).some((node) => node.type === "Empty"), false);
  assert.match(text(tree), /Coba lagi/);
});
