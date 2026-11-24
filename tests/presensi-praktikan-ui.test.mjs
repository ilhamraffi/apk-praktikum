// Uji handler/keluaran JSX dengan batas native palsu; bukan uji layout perangkat.
import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const theme = loadSource("src/theme.ts");
const errors = loadSource("src/lib/errors.ts");
const util = loadSource("src/utils/presensiPraktikan.ts");
const geo = loadSource("src/lib/geo.ts");

const labDefault = {
  id: "lab-1",
  nama: "Lab Komputasi Dasar",
  gedung: "Gedung E301",
  latitude: -6.973,
  longitude: 107.63,
  radiusMeter: 50,
};
const koordinatDalam = { latitude: -6.973, longitude: 107.6301, akurasiMeter: 15 };
const koordinatLuar = { latitude: -6.975, longitude: 107.635, akurasiMeter: 12 };
const session = {
  id: "satu",
  classId: "a",
  labId: "lab-1",
  namaPraktikum: "Pemrograman",
  modul: "Modul 1",
  waktu: "Senin 08:00",
  ruangan: "Lab 1",
  status: "DIBUKA",
};
const kelas = { id: "a", nama: "Kelas A", kode: "A", pesertaUids: ["praktikan-a"] };
const record = {
  uid: "praktikan-a",
  nama: "Andi",
  nim: "230001",
  statusKehadiran: "Hadir",
  catatan: "Hadir",
  waktu: null,
  jarakMeter: 14.5,
};
const jsx = (type, props) => ({ type, props });
const native = Object.fromEntries(
  [
    "ActivityIndicator",
    "KeyboardAvoidingView",
    "Modal",
    "Pressable",
    "ScrollView",
    "Text",
    "TextInput",
    "TouchableOpacity",
    "View",
    "FlatList",
  ].map((name) => [name, name]),
);
native.StyleSheet = { create: (styles) => styles, absoluteFill: {} };
native.Platform = { OS: "android" };
native.Linking = { openSettings: async () => {} };

function nodesOf(tree) {
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object" || !node.props) return;
    nodes.push(node);
    for (const key of ["children", "ListHeaderComponent", "ListEmptyComponent"]) {
      visit(node.props[key]);
    }
  }
  visit(tree);
  return nodes;
}
const textOf = (tree) =>
  nodesOf(tree)
    .filter((node) => node.type === "Text")
    .flatMap((node) => (Array.isArray(node.props.children) ? node.props.children : [node.props.children]))
    .filter((item) => item !== null && item !== undefined && item !== false)
    .join(" ");
const buttonWith = (tree, label) =>
  nodesOf(tree).find((node) => node.type === "TouchableOpacity" && textOf(node).includes(label));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
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
      return [
        hooks[index].value,
        (next) => {
          updates += 1;
          hooks[index].value = typeof next === "function" ? next(hooks[index].value) : next;
        },
      ];
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
    "../../theme": theme,
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
  const h = formHarness((catatan) => {
    values.push(catatan);
    return pending.promise;
  });
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
  const h = formHarness(async () => {
    throw { code: "firestore/unavailable" };
  });
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
  const h = formHarness(async () => {
    sends += 1;
  });
  const tree = h.render({ pesanNonaktif: "Sesi sudah ditutup oleh asisten." });
  const button = buttonWith(tree, "Konfirmasi hadir");
  assert.equal(button.props.disabled, true);
  await button.props.onPress();
  assert.equal(sends, 0);
  assert.equal(
    nodesOf(tree).some((node) => node.type === "TouchableOpacity" && textOf(node) === "Izin"),
    false,
  );
});

test("form memvalidasi kode presensi acak saat sesi memiliki kodePresensi", async () => {
  const values = [];
  const h = formHarness(async (catatan) => {
    values.push(catatan);
  });
  const sesiBerkode = { ...session, kodePresensi: "K8M4P2" };
  let tree = h.render({ sesi: sesiBerkode });

  // Kosong -> ditolak
  await buttonWith(tree, "Konfirmasi hadir").props.onPress();
  tree = h.render({ sesi: sesiBerkode });
  assert.equal(values.length, 0);
  assert.match(textOf(tree), /Masukkan kode presensi/);

  // Salah kode -> ditolak
  const inputKode = nodesOf(tree).find(
    (node) => node.type === "TextInput" && node.props.accessibilityLabel === "Kode presensi ruangan",
  );
  inputKode.props.onChangeText("salah1");
  tree = h.render({ sesi: sesiBerkode });
  await buttonWith(tree, "Konfirmasi hadir").props.onPress();
  tree = h.render({ sesi: sesiBerkode });
  assert.equal(values.length, 0);
  assert.match(textOf(tree), /Kode presensi tidak sesuai/);

  // Kode cocok (huruf kecil pun otomatis di-uppercase) -> berhasil
  nodesOf(tree)
    .find((node) => node.type === "TextInput" && node.props.accessibilityLabel === "Kode presensi ruangan")
    .props.onChangeText("k8m4p2");
  tree = h.render({ sesi: sesiBerkode });
  await buttonWith(tree, "Konfirmasi hadir").props.onPress();
  assert.equal(values.length, 1);
  assert.equal(h.closes(), 1);
});

function presensiLokasiHarness({
  role = "PRAKTIKAN",
  user = { uid: "praktikan-a" },
  sessionId = "satu",
  jadwal = {},
  presensi = {},
  lab = {},
  lokasi = {},
} = {}) {
  const requests = [];
  const writes = [];
  const locationCalls = [];
  let settingsOpens = 0;
  let mintaIzinCalls = 0;
  let muatUlangCalls = 0;

  const jadwalState = {
    sesi: [session],
    kelas: [kelas],
    mapKelas: new Map([["a", kelas]]),
    loading: false,
    error: null,
    dariCache: false,
    cobaLagi: () => {},
    ...jadwal,
  };
  const presensiState = {
    catatan: new Map(),
    tertunda: new Set(),
    loading: false,
    error: null,
    dariCache: false,
    cobaLagi: () => {},
    ...presensi,
  };
  const labState = {
    lab: labDefault,
    loading: false,
    error: null,
    dariCache: false,
    cobaLagi: () => {},
    ...lab,
  };
  const lokasiState = {
    koordinat: koordinatDalam,
    akurasiMeter: 15,
    status: "siap",
    mintaIzin: () => {
      mintaIzinCalls += 1;
    },
    muatUlang: () => {
      muatUlangCalls += 1;
    },
    ...lokasi,
  };
  const localNative = {
    ...native,
    Linking: {
      openSettings: async () => {
        settingsOpens += 1;
      },
    },
  };
  const { KartuStatusLokasi } = loadSource("src/components/praktikan/KartuStatusLokasi.tsx", {
    "../../theme": theme,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": localNative,
    "../../utils/presensiPraktikan": util,
  });

  let stateIdx = 0;
  const react = {
    useState: (initial) => {
      const value = stateIdx++ === 0 ? false : initial;
      return [value, () => {}];
    },
    useEffect: () => {},
  };

  const source = loadSource("src/app/praktikan/presensi/[sessionId].tsx", {
    "../../../theme": theme,
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": localNative,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "expo-router": {
      Link: "Link",
      useLocalSearchParams: () => ({ sessionId }),
    },
    "../../../context/AuthContext": { useAuth: () => ({ user, role, loading: false }) },
    "../../../hooks/useJadwalPraktikan": { useJadwalPraktikan: () => jadwalState },
    "../../../hooks/useLabSesi": { useLabSesi: () => labState },
    "../../../hooks/useLokasiPerangkat": {
      useLokasiPerangkat: (aktif) => {
        locationCalls.push(aktif);
        return lokasiState;
      },
    },
    "../../../hooks/usePresensiPraktikan": {
      usePresensiPraktikan: (uid, ids) => {
        requests.push({ uid, ids });
        return presensiState;
      },
      catatPresensiPraktikan: async (input) => {
        writes.push(input);
      },
    },
    "../../../lib/geo": geo,
    "../../../utils/presensiPraktikan": util,
    "../../../components/praktikan/FormPresensi": { FormPresensi: "FormPresensi" },
    "../../../components/praktikan/KartuStatusLokasi": { KartuStatusLokasi },
    "../../../components/praktikan/RingkasanPresensi": { RingkasanPresensi: "RingkasanPresensi" },
    "../../../components/asisten/InformasiSesi": { InformasiSesi: "InformasiSesi" },
    "../../../components/asisten/StatusSesi": { StatusSesi: "StatusSesi" },
    "../../../components/shared/StatusLayar": { Loading: "Loading", ErrorBanner: "ErrorBanner" },
  });

  const screenTree = source.default();
  const section = nodesOf(screenTree).find(
    (node) => typeof node.type === "function" && node.type.name === "BagianPresensiLokasi",
  );
  let sectionTree = section ? section.type(section.props) : screenTree;
  // Render KartuStatusLokasi agar teks jarak, radius, dan tombol aksi bisa diperiksa.
  const kartuNode = nodesOf(sectionTree).find(
    (node) => typeof node.type === "function" && node.type.name === "KartuStatusLokasi",
  );
  const kartuTree = kartuNode ? kartuNode.type(kartuNode.props) : null;

  return {
    screenTree,
    tree: sectionTree,
    kartuTree,
    nodes: nodesOf(sectionTree),
    kartuNodes: kartuTree ? nodesOf(kartuTree) : [],
    requests,
    writes,
    locationCalls,
    getSettingsOpens: () => settingsOpens,
    getMintaIzinCalls: () => mintaIzinCalls,
    getMuatUlangCalls: () => muatUlangCalls,
  };
}

test("halaman presensi khusus mengaktifkan tombol saat di dalam radius dan mengirim koordinat ke server", async () => {
  const h = presensiLokasiHarness();
  assert.deepEqual(h.requests, [{ uid: "praktikan-a", ids: ["satu"] }]);
  assert.deepEqual(h.locationCalls, [true]);
  assert.equal(buttonWith(h.tree, "Presensi sekarang").props.disabled, false);
  assert.match(textOf(h.kartuTree), /Di dalam radius/);
  assert.match(textOf(h.kartuTree), /Lab Komputasi Dasar/);
  assert.match(textOf(h.kartuTree), /50 m/);

  await h.nodes.find((node) => node.type === "FormPresensi").props.onSubmit("catatan");
  assert.deepEqual(h.writes, [
    { uid: "praktikan-a", sesiId: "satu", catatan: "catatan", koordinat: koordinatDalam },
  ]);
});

test("halaman presensi menolak saat di luar radius, offline, sesi tutup, izin ditolak, GPS mati, dan sudah presensi", async () => {
  const diLuar = presensiLokasiHarness({
    lokasi: { koordinat: koordinatLuar, akurasiMeter: 12, status: "siap" },
  });
  assert.equal(buttonWith(diLuar.tree, "Presensi sekarang").props.disabled, true);
  assert.match(textOf(diLuar.kartuTree), /Di luar radius/);
  assert.match(textOf(diLuar.kartuTree), /50 m/);
  assert.ok(diLuar.nodes.find((node) => node.type === "FormPresensi").props.pesanNonaktif);

  const ditolak = presensiLokasiHarness({
    lokasi: { koordinat: null, akurasiMeter: null, status: "izin_ditolak" },
  });
  assert.equal(buttonWith(ditolak.tree, "Presensi sekarang").props.disabled, true);
  buttonWith(ditolak.kartuTree, "Minta izin lagi").props.onPress();
  await buttonWith(ditolak.kartuTree, "Buka pengaturan").props.onPress();
  assert.equal(ditolak.getMintaIzinCalls(), 1);
  assert.equal(ditolak.getSettingsOpens(), 1);

  const gpsMati = presensiLokasiHarness({
    lokasi: { koordinat: null, akurasiMeter: null, status: "layanan_mati" },
  });
  assert.equal(buttonWith(gpsMati.tree, "Presensi sekarang").props.disabled, true);
  buttonWith(gpsMati.kartuTree, "Coba lagi").props.onPress();
  assert.equal(gpsMati.getMuatUlangCalls(), 1);

  for (const options of [
    { jadwal: { dariCache: true } },
    { presensi: { dariCache: true } },
    { lab: { dariCache: true } },
    { jadwal: { sesi: [{ ...session, status: "BELUM_DIBUKA" }] } },
    { jadwal: { sesi: [{ ...session, status: "DITUTUP" }] } },
    { jadwal: { sesi: [{ ...session, labId: undefined }] }, lab: { lab: null } },
  ]) {
    const h = presensiLokasiHarness(options);
    assert.equal(buttonWith(h.tree, "Presensi sekarang").props.disabled, true);
    assert.ok(h.nodes.find((node) => node.type === "FormPresensi").props.pesanNonaktif);
  }

  const sudahHadir = presensiLokasiHarness({
    presensi: { catatan: new Map([["satu", record]]) },
  });
  assert.equal(sudahHadir.nodes.some((node) => node.type === "RingkasanPresensi"), true);
  assert.equal(buttonWith(sudahHadir.tree, "Presensi sekarang"), undefined);
  assert.deepEqual(sudahHadir.locationCalls, [false]);
});

test("halaman detail sesi terpisah dari form presensi dan menautkan ke /praktikan/presensi/[sessionId]", () => {
  const jadwalState = {
    sesi: [session],
    kelas: [kelas],
    mapKelas: new Map([["a", kelas]]),
    loading: false,
    error: null,
    dariCache: false,
    cobaLagi: () => {},
  };
  const presensiState = {
    catatan: new Map(),
    tertunda: new Set(),
    loading: false,
    error: null,
    dariCache: false,
    cobaLagi: () => {},
  };
  const source = loadSource("src/app/praktikan/[sesiId].tsx", {
    "../../theme": theme,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": native,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "expo-router": {
      Link: "Link",
      Redirect: "Redirect",
      useLocalSearchParams: () => ({ sesiId: "satu" }),
    },
    "../../context/AuthContext": {
      useAuth: () => ({ user: { uid: "praktikan-a" }, role: "PRAKTIKAN", loading: false }),
    },
    "../../hooks/useJadwalPraktikan": { useJadwalPraktikan: () => jadwalState },
    "../../hooks/usePresensiPraktikan": { usePresensiPraktikan: () => presensiState },
    "../../components/praktikan/RingkasanPresensi": { RingkasanPresensi: "RingkasanPresensi" },
    "../../components/asisten/InformasiSesi": { InformasiSesi: "InformasiSesi" },
    "../../components/asisten/StatusSesi": { StatusSesi: "StatusSesi" },
    "../../components/shared/StatusLayar": { Loading: "Loading", ErrorBanner: "ErrorBanner" },
  });
  const tree = source.default();
  const section = nodesOf(tree).find(
    (node) => typeof node.type === "function" && node.type.name === "BagianStatusKehadiran",
  );
  const sectionTree = section.type(section.props);
  const linkPresensi = nodesOf(sectionTree).find((node) => node.type === "Link");
  assert.deepEqual(linkPresensi.props.href, {
    pathname: "/praktikan/presensi/[sessionId]",
    params: { sessionId: "satu" },
  });
  assert.equal(nodesOf(sectionTree).some((node) => node.type === "FormPresensi"), false);
});

test("RingkasanPresensi menampilkan jarak tercatat bila tersedia dan menyembunyikannya untuk data lama", () => {
  const { RingkasanPresensi } = loadSource("src/components/praktikan/RingkasanPresensi.tsx", {
    "../../theme": theme,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": native,
    "../../utils/presensiPraktikan": util,
  });
  const denganJarak = RingkasanPresensi({ presensi: record });
  assert.match(textOf(denganJarak), /Jarak tercatat/);
  assert.match(textOf(denganJarak), /14,5 m/);

  const tanpaJarak = RingkasanPresensi({ presensi: { ...record, jarakMeter: undefined } });
  assert.equal(textOf(tanpaJarak).includes("Jarak tercatat"), false);
});

function riwayatHarness({ role = "PRAKTIKAN", user = { uid: "praktikan-a" }, jadwal = {}, presensi = {} } = {}) {
  const requests = [];
  const jadwalState = {
    sesi: [session],
    kelas: [kelas],
    mapKelas: new Map([["a", kelas]]),
    loading: false,
    error: null,
    dariCache: false,
    cobaLagi: () => {},
    ...jadwal,
  };
  const presensiState = {
    catatan: new Map(),
    tertunda: new Set(),
    loading: false,
    error: null,
    dariCache: false,
    cobaLagi: () => {},
    ...presensi,
  };
  const source = loadSource("src/app/praktikan/riwayat.tsx", {
    "../../theme": theme,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": native,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "expo-router": { Link: "Link" },
    "../../context/AuthContext": { useAuth: () => ({ user, role, loading: false }) },
    "../../hooks/useJadwalPraktikan": { useJadwalPraktikan: () => jadwalState },
    "../../hooks/usePresensiPraktikan": {
      usePresensiPraktikan: (uid, ids) => {
        requests.push({ uid, ids });
        return presensiState;
      },
    },
    "../../components/praktikan/RingkasanPresensi": { RingkasanPresensi: "RingkasanPresensi" },
    "../../components/shared/StatusLayar": {
      Loading: "Loading",
      ErrorBanner: "ErrorBanner",
      Empty: "Empty",
    },
  });
  const tree = source.default();
  return { tree, nodes: nodesOf(tree), requests };
}

test("riwayat hanya memasukkan catatan sesi kelas sendiri dan menampilkan status sinkronisasi", () => {
  const h = riwayatHarness({
    presensi: {
      catatan: new Map([
        ["satu", record],
        ["asing", record],
      ]),
      tertunda: new Set(["satu"]),
    },
  });
  assert.deepEqual(h.requests, [{ uid: "praktikan-a", ids: ["satu"] }]);
  const list = h.nodes.find((node) => node.type === "FlatList");
  assert.deepEqual(
    list.props.data.map((item) => item.id),
    ["satu"],
  );
  const card = list.props.renderItem({ item: list.props.data[0] });
  assert.equal(nodesOf(card).find((node) => node.type === "RingkasanPresensi").props.tertunda, true);
});

test("riwayat dibatasi akun praktikan dan membedakan loading/error/riwayat kosong", () => {
  for (const options of [{ role: "ASISTEN" }, { user: null }, { user: {} }]) {
    const h = riwayatHarness(options);
    assert.equal(h.requests[0].uid, undefined);
    assert.equal(h.nodes.some((node) => node.type === "FlatList"), false);
  }
  for (const [presensi, expected] of [
    [{ loading: true }, "Loading"],
    [{ error: "Koneksi terputus" }, "ErrorBanner"],
    [{}, "Empty"],
  ]) {
    const h = riwayatHarness({ presensi });
    assert.ok(h.nodes.find((node) => node.type === expected));
    assert.deepEqual(h.nodes.find((node) => node.type === "FlatList").props.data, []);
  }
});
