// Menguji handler/JSX produksi dengan batas native palsu; bukan tes visual di HP.
import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./helpers/load-source.mjs";
import { hookHarness } from "./helpers/hook-harness.mjs";

const util = loadSource("src/utils/izinAsisten.ts");
const errors = loadSource("src/lib/errors.ts");
const pengajuan = { id: "izin-satu", uid: "praktikan-a", sessionId: "sesi-satu", alasan: "Sedang sakit", kategoriAI: null, statusAI: "timeout", status: "pending", dibuatPada: null };
const jsx = (type, props) => ({ type, props });
const runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
const native = Object.fromEntries(["ActivityIndicator", "FlatList", "ScrollView", "Text", "TouchableOpacity", "View"].map((name) => [name, name]));
native.StyleSheet = { create: (styles) => styles };
const statusComponents = { Loading: "Loading", Empty: "Empty", ErrorBanner: "ErrorBanner" };

function nodesOf(tree) {
  const nodes = [];
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object" || !node.props) return;
    nodes.push(node);
    for (const key of ["children", "ListHeaderComponent", "ListEmptyComponent"]) visit(node.props[key]);
  };
  visit(tree); return nodes;
}
const textOf = (tree) => nodesOf(tree).filter((node) => node.type === "Text").flatMap((node) => node.props.children).join(" ");
const buttonWith = (tree, label) => nodesOf(tree).find((node) => node.type === "TouchableOpacity" && textOf(node).includes(label));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function decisionHarness(save = async () => {}) {
  const hooks = hookHarness(); const calls = [];
  let props = { asistenUid: "asisten-a", pengajuan, dariCache: false, tertunda: false };
  const { KeputusanPengajuanIzin } = loadSource("src/components/asisten/izin/KeputusanPengajuanIzin.tsx", {
    react: hooks.react, "react/jsx-runtime": runtime, "react-native": native,
    "../../../hooks/useIzinAsisten": { putuskanPengajuanIzin: (input) => { calls.push(input); return save(input); } },
    "../../../lib/errors": errors, "../../../utils/izinAsisten": util, "../../shared/StatusLayar": statusComponents,
  });
  return {
    ...hooks, calls,
    render: (changes = {}) => { props = { ...props, ...changes }; return hooks.render(() => KeputusanPengajuanIzin(props)); },
  };
}

test("AI kosong tidak menghalangi pilihan, tetapi write hanya terjadi setelah konfirmasi eksplisit", async () => {
  for (const [label, confirm, keputusan] of [["Terima izin", "Ya, terima izin", "approved"], ["Tolak izin", "Ya, tolak izin", "rejected"]]) {
    const h = decisionHarness();
    const tree = h.render();
    assert.equal(h.calls.length, 0);
    buttonWith(tree, label).props.onPress();
    assert.equal(h.calls.length, 0);
    await buttonWith(h.render(), confirm).props.onPress();
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.calls[0], { asistenUid: "asisten-a", pengajuan, keputusan });
    assert.match(textOf(h.render()), /Keputusan tersimpan/);
  }
});

test("ketukan ganda dikunci dan batal tidak menutup konfirmasi saat sedang menyimpan", async () => {
  const pending = deferred(); const h = decisionHarness(() => pending.promise);
  buttonWith(h.render(), "Terima izin").props.onPress();
  const submit = buttonWith(h.render(), "Ya, terima izin").props.onPress;
  const first = submit(); await submit();
  assert.equal(h.calls.length, 1);
  const busy = h.render();
  assert.equal(buttonWith(busy, "Menyimpan keputusan").props.disabled, true);
  assert.equal(buttonWith(busy, "Batal").props.disabled, true);
  buttonWith(busy, "Batal").props.onPress();
  assert.match(textOf(h.render()), /Terima pengajuan ini/);
  pending.resolve(); await first;
});

test("gagal menyimpan menampilkan error dan memungkinkan retry tanpa menganggap keputusan sukses", async () => {
  const h = decisionHarness(async () => { throw { code: "firestore/unavailable" }; });
  buttonWith(h.render(), "Tolak izin").props.onPress();
  await buttonWith(h.render(), "Ya, tolak izin").props.onPress();
  const failed = h.render();
  assert.equal(buttonWith(failed, "Ya, tolak izin").props.disabled, false);
  assert.match(nodesOf(failed).find((node) => node.type === "ErrorBanner").props.message, /database tidak tersedia/);
  assert.doesNotMatch(textOf(failed), /Keputusan tersimpan/);
  buttonWith(failed, "Batal").props.onPress();
  assert.ok(buttonWith(h.render(), "Terima izin"));
  assert.equal(h.calls.length, 1);
});

test("hasil request setelah logout/unmount tidak memperbarui layar akun baru", async () => {
  for (const fails of [false, true]) {
    const pending = deferred(); const h = decisionHarness(() => pending.promise);
    buttonWith(h.render(), "Terima izin").props.onPress();
    const result = buttonWith(h.render(), "Ya, terima izin").props.onPress();
    h.unmount(); const updates = h.updates();
    if (fails) pending.reject(new Error("Gagal")); else pending.resolve();
    await result;
    assert.equal(h.updates(), updates);
  }
});

test("cache/write tertunda memblokir keputusan; izin yang sudah selesai tidak memiliki tombol keputusan", () => {
  for (const changes of [{ dariCache: true }, { tertunda: true }]) {
    const h = decisionHarness(); const tree = h.render(changes);
    const button = buttonWith(tree, "Terima izin");
    assert.equal(button.props.disabled, true); button.props.onPress();
    assert.equal(h.calls.length, 0);
    assert.equal(buttonWith(h.render(), "Ya, terima izin"), undefined);
  }
  for (const status of ["approved", "rejected"]) {
    const h = decisionHarness();
    assert.equal(nodesOf(h.render({ pengajuan: { ...pengajuan, status } })).some((node) => node.type === "TouchableOpacity"), false);
  }
});

test("alasan berubah saat konfirmasi menuntut pemeriksaan ulang, sedangkan hasil AI boleh datang belakangan", async () => {
  const h = decisionHarness();
  buttonWith(h.render(), "Terima izin").props.onPress();
  let tree = h.render({ pengajuan: { ...pengajuan, alasan: "Alasan yang baru" } });
  assert.equal(buttonWith(tree, "Ya, terima izin").props.disabled, true);
  await buttonWith(tree, "Ya, terima izin").props.onPress();
  assert.equal(h.calls.length, 0);
  buttonWith(tree, "Batal").props.onPress();
  buttonWith(h.render(), "Terima izin").props.onPress();
  tree = h.render({ pengajuan: { ...pengajuan, alasan: "Alasan yang baru", kategoriAI: "Lainnya" } });
  assert.equal(buttonWith(tree, "Ya, terima izin").props.disabled, false);
  await buttonWith(tree, "Ya, terima izin").props.onPress();
  assert.equal(h.calls[0].pengajuan.alasan, "Alasan yang baru");
});

test("guard tidak memasang anak/listener saat belum login, loading, UID kosong atau role salah", () => {
  for (const auth of [
    { user: null, role: null, loading: false }, { user: { uid: "a" }, role: "ASISTEN", loading: true },
    { user: { uid: "p" }, role: "PRAKTIKAN", loading: false }, { user: {}, role: "ASISTEN", loading: false },
  ]) {
    let renders = 0;
    const { AksesIzinAsisten } = loadSource("src/components/asisten/izin/AksesIzinAsisten.tsx", {
      "react/jsx-runtime": runtime, "react-native": native, "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
      "expo-router": { Link: "Link", Redirect: "Redirect" }, "../../../context/AuthContext": { useAuth: () => auth },
      "../../shared/StatusLayar": statusComponents,
    });
    const tree = AksesIzinAsisten({ children: () => { renders += 1; return null; } });
    assert.equal(renders, 0);
    if (!auth.user && !auth.loading) assert.equal(tree.props.href, "/");
  }
});

function screenHarness(kind, data = {}, params = { izinId: "izin-satu" }) {
  const hooks = hookHarness(); const calls = [];
  const hasil = { izin: [pengajuan], pengajuan, loading: false, error: null, dariCache: false, tertunda: false, cobaLagi: () => {}, ...data };
  const source = loadSource(`src/app/asisten/izin/${kind === "list" ? "index" : "[izinId]"}.tsx`, {
    react: hooks.react, "react/jsx-runtime": runtime, "react-native": native,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "expo-router": { Link: "Link", useLocalSearchParams: () => params },
    "../../../components/asisten/izin/AksesIzinAsisten": { AksesIzinAsisten: "AksesIzinAsisten" },
    "../../../components/asisten/izin/InformasiPengajuanIzin": { AlasanPengajuanIzin: "AlasanPengajuanIzin", IdentitasPengajuanIzin: "IdentitasPengajuanIzin", StatusPengajuanIzin: "StatusPengajuanIzin" },
    "../../../components/asisten/izin/KeputusanPengajuanIzin": { KeputusanPengajuanIzin: "KeputusanPengajuanIzin" },
    "../../../components/shared/StatusLayar": statusComponents,
    "../../../utils/izinAsisten": util,
    "../../../hooks/useIzinAsisten": {
      useDaftarIzinAsisten: (uid, status) => { calls.push([uid, status]); return hasil; },
      useDetailIzinAsisten: (uid, id) => { calls.push([uid, id]); return hasil; },
    },
  });
  return {
    calls, hasil,
    render: () => {
      const gate = source.default();
      assert.equal(gate.type, "AksesIzinAsisten");
      const child = gate.props.children("asisten-a");
      return hooks.render(() => child.type(child.props));
    },
  };
}

test("daftar memakai filter menunggu lalu diputuskan, dan link menuju ID izin yang dipilih", () => {
  const h = screenHarness("list"); const tree = h.render();
  assert.deepEqual(h.calls[0], ["asisten-a", "pending"]);
  const list = nodesOf(tree).find((node) => node.type === "FlatList");
  const card = list.props.renderItem({ item: pengajuan });
  assert.equal(nodesOf(card).find((node) => node.type === "AlasanPengajuanIzin").props.pengajuan, pengajuan);
  assert.deepEqual(nodesOf(card).find((node) => node.type === "Link").props.href, { pathname: "/asisten/izin/[izinId]", params: { izinId: "izin-satu" } });
  buttonWith(tree, "Diterima").props.onPress(); h.render();
  assert.deepEqual(h.calls.at(-1), ["asisten-a", "approved"]);
});

test("daftar membedakan loading/error/kosong serta cache dan tidak menampilkan data lama saat error", () => {
  for (const [data, type] of [[{ loading: true }, "Loading"], [{ error: "Akses ditolak" }, "ErrorBanner"], [{ izin: [] }, "Empty"]]) {
    const h = screenHarness("list", data); const tree = h.render();
    assert.ok(nodesOf(tree).find((node) => node.type === type));
    assert.deepEqual(nodesOf(tree).find((node) => node.type === "FlatList").props.data, []);
  }
  assert.match(textOf(screenHarness("list", { dariCache: true }).render()), /data tersimpan di perangkat/);
});

test("detail tidak memasang tindakan untuk loading/error/dihapus; metadata diteruskan untuk blokir keputusan", () => {
  for (const [data, type] of [[{ loading: true }, "Loading"], [{ error: "Akses ditolak" }, "ErrorBanner"], [{ pengajuan: null }, "Empty"]]) {
    const tree = screenHarness("detail", data).render();
    assert.ok(nodesOf(tree).find((node) => node.type === type));
    assert.equal(nodesOf(tree).some((node) => node.type === "KeputusanPengajuanIzin"), false);
  }
  const h = screenHarness("detail", { dariCache: true, tertunda: true });
  const action = nodesOf(h.render()).find((node) => node.type === "KeputusanPengajuanIzin");
  assert.equal(action.props.asistenUid, "asisten-a");
  assert.equal(action.props.dariCache, true); assert.equal(action.props.tertunda, true);
  assert.deepEqual(h.calls[0], ["asisten-a", "izin-satu"]);
});

test("informasi AI kosong dan referensi profil/sesi hilang ditampilkan tanpa crash", () => {
  const source = loadSource("src/components/asisten/izin/InformasiPengajuanIzin.tsx", {
    "react/jsx-runtime": runtime, "react-native": native, "../../../utils/izinAsisten": util,
    "../../../hooks/useReferensiIzinAsisten": { useReferensiIzinAsisten: () => ({ data: null, loading: false, error: null, cobaLagi: () => {} }) },
  });
  const reason = source.AlasanPengajuanIzin({ pengajuan });
  assert.match(textOf(reason), /Kategori belum tersedia/);
  assert.match(textOf(reason), /Keputusan tetap ditentukan asisten/);
  const identity = source.IdentitasPengajuanIzin({ asistenUid: "asisten-a", pengajuan });
  assert.match(textOf(identity), /Profil praktikan tidak ditemukan/);
  assert.match(textOf(identity), /Sesi tidak ditemukan/);
  assert.match(textOf(identity), /praktikan-a/);
});
