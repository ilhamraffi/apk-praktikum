// Uji handler/keluaran JSX dengan batas native palsu; bukan uji layout perangkat.
import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const errors = loadSource("src/lib/errors.ts");
const util = loadSource("src/utils/presensiPraktikan.ts");
const session = { id: "satu", classId: "a", namaPraktikum: "Pemrograman", modul: "Modul 1", waktu: "Senin 08:00", ruangan: "Lab 1", status: "DIBUKA" };
const kelas = { id: "a", nama: "Kelas A", kode: "A", pesertaUids: ["praktikan-a"] };
const record = { uid: "praktikan-a", nama: "Andi", nim: "230001", statusKehadiran: "Hadir", catatan: "", waktu: null };
const jsx = (type, props) => ({ type, props });
const native = Object.fromEntries([
  "ActivityIndicator", "KeyboardAvoidingView", "Modal", "Pressable", "ScrollView", "Text", "TextInput", "TouchableOpacity", "View", "FlatList",
].map((name) => [name, name]));
native.StyleSheet = { create: (styles) => styles, absoluteFill: {} };
native.Platform = { OS: "android" };

function nodesOf(tree) {
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object" || !node.props) return;
    nodes.push(node);
    for (const key of ["children", "ListHeaderComponent", "ListEmptyComponent"]) visit(node.props[key]);
  }
  visit(tree);
  return nodes;
}
const textOf = (tree) => nodesOf(tree).filter((node) => node.type === "Text").flatMap((node) => node.props.children).join(" ");
const buttonWith = (tree, label) => nodesOf(tree).find((node) => node.type === "TouchableOpacity" && textOf(node).includes(label));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function formHarness(onSubmit) {
  const hooks = [];
  let cursor = 0;
  let closes = 0;
  let updates = 0;
  let props = { sesi: session, visible: true, onSubmit, onClose: () => { closes += 1; } };
  const react = {
    useState: (initial) => {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { value: initial };
      return [hooks[index].value, (next) => { updates += 1; hooks[index].value = typeof next === "function" ? next(hooks[index].value) : next; }];
    },
    useRef: (initial) => {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { current: initial };
      return hooks[index];
    },
    useEffect: (callback) => {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { cleanup: callback() };
    },
  };
  const { FormPresensi } = loadSource("src/components/praktikan/FormPresensi.tsx", {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": native,
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0 }) },
    "../../lib/errors": errors,
    "../../utils/presensiPraktikan": util,
  });
  return {
    render: (changes = {}) => {
      props = { ...props, ...changes };
      cursor = 0;
      const wrapper = FormPresensi(props);
      return wrapper ? wrapper.type(wrapper.props) : null;
    },
    closes: () => closes,
    updates: () => updates,
    unmount: () => hooks.forEach((hook) => hook.cleanup?.()),
  };
}

test("form menunggu commit, menolak ketukan ganda, dan tidak bisa ditutup saat mengirim", async () => {
  const pending = deferred();
  const values = [];
  const h = formHarness((catatan) => { values.push(catatan); return pending.promise; });
  let tree = h.render();
  nodesOf(tree).find((node) => node.type === "TextInput").props.onChangeText("  saya hadir  ");
  tree = h.render();
  const submit = buttonWith(tree, "Konfirmasi hadir").props.onPress;
  const first = submit();
  await submit();
  assert.deepEqual(values, ["saya hadir"]);
  assert.equal(h.closes(), 0);
  tree = h.render();
  assert.equal(buttonWith(tree, "Menyimpan presensi").props.disabled, true);
  nodesOf(tree).find((node) => node.type === "Modal").props.onRequestClose();
  assert.equal(h.closes(), 0);
  pending.resolve();
  await first;
  assert.equal(h.closes(), 1);
});

test("kegagalan menyimpan mempertahankan catatan dan membuka tombol untuk retry", async () => {
  const h = formHarness(async () => { throw { code: "firestore/unavailable" }; });
  let tree = h.render();
  nodesOf(tree).find((node) => node.type === "TextInput").props.onChangeText("catatan tetap ada");
  tree = h.render();
  await buttonWith(tree, "Konfirmasi hadir").props.onPress();
  tree = h.render();
  assert.equal(h.closes(), 0);
  assert.equal(nodesOf(tree).find((node) => node.type === "TextInput").props.value, "catatan tetap ada");
  assert.equal(buttonWith(tree, "Konfirmasi hadir").props.disabled, false);
  assert.match(textOf(tree), /database tidak tersedia/);
});

test("hasil submit setelah unmount tidak menutup form akun baru atau memperbarui state", async () => {
  const pending = deferred();
  const h = formHarness(() => pending.promise);
  const result = buttonWith(h.render(), "Konfirmasi hadir").props.onPress();
  h.unmount();
  const updates = h.updates();
  pending.resolve();
  await result;
  assert.equal(h.closes(), 0);
  assert.equal(h.updates(), updates);
});

test("form tidak mengirim ketika sesi menjadi nonaktif dan tidak menawarkan pilihan Izin", async () => {
  let sends = 0;
  const h = formHarness(async () => { sends += 1; });
  const tree = h.render({ pesanNonaktif: "Sesi sudah ditutup oleh asisten." });
  const button = buttonWith(tree, "Konfirmasi hadir");
  assert.equal(button.props.disabled, true);
  await button.props.onPress();
  assert.equal(sends, 0);
  assert.equal(nodesOf(tree).some((node) => node.type === "TouchableOpacity" && textOf(node) === "Izin"), false);
});

function screenHarness(kind, { role = "PRAKTIKAN", user = { uid: "praktikan-a" }, jadwal = {}, presensi = {} } = {}) {
  const requests = [];
  const writes = [];
  const jadwalState = { sesi: [session], kelas: [kelas], mapKelas: new Map([["a", kelas]]), loading: false, error: null, dariCache: false, cobaLagi: () => {}, ...jadwal };
  const presensiState = { catatan: new Map(), tertunda: new Set(), loading: false, error: null, dariCache: false, cobaLagi: () => {}, ...presensi };
  const source = loadSource(kind === "detail" ? "src/app/praktikan/[sesiId].tsx" : "src/app/praktikan/riwayat.tsx", {
    react: { useState: () => [false, () => {}] },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": native,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "expo-router": { Link: "Link", Redirect: "Redirect", useLocalSearchParams: () => ({ sesiId: "satu" }) },
    "../../context/AuthContext": { useAuth: () => ({ user, role, loading: false }) },
    "../../hooks/useJadwalPraktikan": { useJadwalPraktikan: () => jadwalState },
    "../../hooks/usePresensiPraktikan": {
      usePresensiPraktikan: (uid, ids) => { requests.push({ uid, ids }); return presensiState; },
      catatPresensiPraktikan: async (input) => { writes.push(input); },
    },
    "../../components/praktikan/FormPresensi": { FormPresensi: "FormPresensi" },
    "../../components/praktikan/RingkasanPresensi": { RingkasanPresensi: "RingkasanPresensi" },
    "../../components/asisten/InformasiSesi": { InformasiSesi: "InformasiSesi" },
    "../../components/asisten/StatusSesi": { StatusSesi: "StatusSesi" },
    "../../components/shared/StatusLayar": { Loading: "Loading", ErrorBanner: "ErrorBanner", Empty: "Empty" },
  });
  let tree = source.default();
  if (kind === "detail") {
    const section = nodesOf(tree).find((node) => typeof node.type === "function" && node.type.name === "BagianPresensiPraktikan");
    if (section) tree = section.type(section.props);
  }
  return { tree, nodes: nodesOf(tree), requests, writes };
}

test("detail mengirim identitas/sesi yang sesuai dan hanya mengaktifkan presensi saat siap", async () => {
  const h = screenHarness("detail");
  assert.deepEqual(h.requests, [{ uid: "praktikan-a", ids: ["satu"] }]);
  assert.equal(buttonWith(h.tree, "Presensi sekarang").props.disabled, false);
  await h.nodes.find((node) => node.type === "FormPresensi").props.onSubmit("catatan");
  assert.deepEqual(h.writes, [{ uid: "praktikan-a", sesiId: "satu", catatan: "catatan" }]);
});

test("detail menolak presensi saat cache, belum dibuka, ditutup, loading, error, atau sudah tercatat", () => {
  for (const options of [
    { jadwal: { dariCache: true } },
    { presensi: { dariCache: true } },
    { jadwal: { sesi: [{ ...session, status: "BELUM_DIBUKA" }] } },
    { jadwal: { sesi: [{ ...session, status: "DITUTUP" }] } },
    { presensi: { loading: true } },
    { presensi: { error: "Akses ditolak" } },
    { presensi: { catatan: new Map([["satu", record]]) } },
  ]) {
    const h = screenHarness("detail", options);
    assert.notEqual(buttonWith(h.tree, "Presensi sekarang")?.props.disabled, false);
    assert.ok(h.nodes.find((node) => node.type === "FormPresensi").props.pesanNonaktif);
  }
});

test("riwayat hanya memasukkan catatan sesi kelas sendiri dan menampilkan status sinkronisasi", () => {
  const h = screenHarness("riwayat", { presensi: { catatan: new Map([["satu", record], ["asing", record]]), tertunda: new Set(["satu"]) } });
  assert.deepEqual(h.requests, [{ uid: "praktikan-a", ids: ["satu"] }]);
  const list = h.nodes.find((node) => node.type === "FlatList");
  assert.deepEqual(list.props.data.map((item) => item.id), ["satu"]);
  const card = list.props.renderItem({ item: list.props.data[0] });
  assert.equal(nodesOf(card).find((node) => node.type === "RingkasanPresensi").props.tertunda, true);
});

test("riwayat dibatasi akun praktikan dan membedakan loading/error/riwayat kosong", () => {
  for (const options of [{ role: "ASISTEN" }, { user: null }, { user: {} }]) {
    const h = screenHarness("riwayat", options);
    assert.equal(h.requests[0].uid, undefined);
    assert.equal(h.nodes.some((node) => node.type === "FlatList"), false);
  }
  for (const [presensi, expected] of [[{ loading: true }, "Loading"], [{ error: "Koneksi terputus" }, "ErrorBanner"], [{}, "Empty"]]) {
    const h = screenHarness("riwayat", { presensi });
    assert.ok(h.nodes.find((node) => node.type === expected));
    assert.deepEqual(h.nodes.find((node) => node.type === "FlatList").props.data, []);
  }
});
