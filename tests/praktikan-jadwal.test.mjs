// Jalankan: node --test tests/praktikan-jadwal.test.mjs
// Uji logika listener dan keluaran layar dengan Firestore/React Native palsu.
// Tidak menghubungi Firebase dan tidak memerlukan paket pengujian tambahan.
import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const errors = loadSource("src/lib/errors.ts");
const kelas = (id, pesertaUids = ["praktikan-a"]) => ({
  id, nama: `Kelas ${id}`, kode: id, pesertaUids,
});
const sesi = (id, classId, status = "BELUM_DIBUKA") => ({
  id, classId, status, namaPraktikum: `Praktikum ${id}`,
  modul: "Modul 1", waktu: "Senin 08:00", ruangan: "Lab 1",
});

function firestoreHarness() {
  const listeners = [];
  const states = [];
  const firestore = {
    collection: (_db, path) => ({ path }),
    where: (field, op, value) => ({ field, op, value }),
    query: (ref, ...filters) => ({ ...ref, filters }),
    onSnapshot: (ref, options, next, error) => {
      const listener = { ref, options, next, error, active: true, stops: 0 };
      listeners.push(listener);
      return () => { listener.active = false; listener.stops += 1; };
    },
  };
  const { langgananJadwalPraktikan } = loadSource("src/hooks/useJadwalPraktikan.ts", {
    "@react-native-firebase/firestore": firestore,
    "../lib/firebase": { db: {} },
    "../lib/errors": errors,
  });
  const emit = (listener, rows, fromCache = false) => listener.next({
    docs: rows.map(({ id, ...data }) => ({ id, data: () => data })),
    metadata: { fromCache },
  });
  return {
    listeners, emit,
    subscribe: (uid = "praktikan-a") => langgananJadwalPraktikan(uid, (value) => states.push(value)),
    latest: () => states.at(-1),
    stateCount: () => states.length,
    classes: () => listeners.findLast((item) => item.active && item.ref.path === "classes"),
    sessions: (id) => listeners.findLast((item) => item.active && item.ref.path === "sessions" && item.ref.filters[0].value === id),
  };
}

test("tanpa UID tidak ada query Firestore", () => {
  const h = firestoreHarness();
  h.subscribe("");
  assert.equal(h.listeners.length, 0);
  assert.deepEqual(h.latest(), { kelas: [], sesi: [], loading: false, error: null, dariCache: false });
});

test("query kelas dibatasi UID dan sesi hanya dibaca untuk kelas yang diikuti", () => {
  const h = firestoreHarness();
  h.subscribe();
  assert.deepEqual(h.classes().ref.filters, [
    { field: "pesertaUids", op: "array-contains", value: "praktikan-a" },
  ]);
  h.emit(h.classes(), [kelas("a"), kelas("asing", ["praktikan-b"])]);
  assert.equal(h.sessions("asing"), undefined);
  assert.deepEqual(h.sessions("a").ref.filters, [{ field: "classId", op: "==", value: "a" }]);
  h.emit(h.sessions("a"), [sesi("saya", "a"), sesi("asing", "asing")]);
  assert.deepEqual(h.latest().sesi.map((item) => item.id), ["saya"]);
});

test("tanpa kelas selesai memuat dengan daftar kosong", () => {
  const h = firestoreHarness();
  h.subscribe();
  h.emit(h.classes(), []);
  assert.equal(h.latest().loading, false);
  assert.deepEqual(h.latest().sesi, []);
  assert.equal(h.listeners.length, 1);
});

test("menunggu seluruh kelas dan mendukung kelas yang belum mempunyai sesi", () => {
  const h = firestoreHarness();
  h.subscribe();
  h.emit(h.classes(), [kelas("a"), kelas("b")]);
  h.emit(h.sessions("a"), [sesi("satu", "a")]);
  assert.equal(h.latest().loading, true);
  h.emit(h.sessions("b"), []);
  assert.equal(h.latest().loading, false);
  assert.deepEqual(h.latest().sesi.map((item) => item.id), ["satu"]);
});

test("perubahan status sesi dan label kelas diteruskan tanpa menambah listener", () => {
  const h = firestoreHarness();
  h.subscribe();
  h.emit(h.classes(), [kelas("a")]);
  h.emit(h.sessions("a"), [sesi("satu", "a", "DIBUKA")]);
  assert.equal(h.latest().sesi[0].status, "DIBUKA");
  h.emit(h.sessions("a"), [sesi("satu", "a", "DITUTUP")]);
  h.emit(h.classes(), [{ ...kelas("a"), nama: "Nama terbaru" }]);
  assert.equal(h.latest().sesi[0].status, "DITUTUP");
  assert.equal(h.latest().kelas[0].nama, "Nama terbaru");
  assert.equal(h.listeners.length, 2);
});

test("pencabutan keanggotaan langsung menghapus sesi dan menolak callback lama", () => {
  const h = firestoreHarness();
  h.subscribe();
  h.emit(h.classes(), [kelas("a"), kelas("b")]);
  const oldA = h.sessions("a");
  h.emit(oldA, [sesi("a1", "a")]);
  h.emit(h.sessions("b"), [sesi("b1", "b")]);
  h.emit(h.classes(), [kelas("b")]);
  assert.equal(oldA.active, false);
  assert.deepEqual(h.latest().sesi.map((item) => item.id), ["b1"]);
  const count = h.stateCount();
  h.emit(oldA, [sesi("terlambat", "a")]);
  oldA.error({ code: "firestore/permission-denied" });
  assert.equal(h.stateCount(), count);
  // Ditambahkan kembali: callback dari langganan pertama tetap tidak berlaku.
  h.emit(h.classes(), [kelas("a"), kelas("b")]);
  h.emit(oldA, [sesi("terlambat", "a")]);
  assert.equal(h.latest().loading, true);
  h.emit(h.sessions("a"), [sesi("a2", "a")]);
  assert.deepEqual(h.latest().sesi.map((item) => item.id), ["a2", "b1"]);
});

test("gagal akses sesi mengosongkan data, menghentikan listener, dan bisa dilanggan ulang", () => {
  const h = firestoreHarness();
  h.subscribe();
  h.emit(h.classes(), [kelas("a")]);
  h.emit(h.sessions("a"), [sesi("satu", "a")]);
  const old = h.sessions("a");
  old.error({ code: "firestore/permission-denied" });
  assert.equal(h.listeners.some((item) => item.active), false);
  assert.deepEqual(h.latest().sesi, []);
  assert.match(h.latest().error, /Akses ditolak/);
  const count = h.stateCount();
  h.emit(old, [sesi("terlambat", "a")]);
  assert.equal(h.stateCount(), count);
  h.subscribe();
  h.emit(h.classes(), []);
  assert.equal(h.latest().error, null);
});

test("gagal membaca kelas tidak dianggap sebagai daftar kosong", () => {
  const h = firestoreHarness();
  h.subscribe();
  h.classes().error({ code: "firestore/unavailable" });
  assert.equal(h.latest().loading, false);
  assert.match(h.latest().error, /tidak tersedia/);
  assert.equal(h.listeners.some((item) => item.active), false);
});

test("indikator cache mengikuti metadata kelas dan seluruh sesi", () => {
  const h = firestoreHarness();
  h.subscribe();
  assert.equal(h.classes().options.includeMetadataChanges, true);
  h.emit(h.classes(), [kelas("a")], true);
  h.emit(h.sessions("a"), [], true);
  assert.equal(h.latest().dariCache, true);
  h.emit(h.classes(), [kelas("a")], false);
  assert.equal(h.latest().dariCache, true);
  h.emit(h.sessions("a"), [], false);
  assert.equal(h.latest().dariCache, false);
});

test("logout/unmount membersihkan semua listener dan callback akun lama diabaikan", () => {
  const h = firestoreHarness();
  const stop = h.subscribe();
  h.emit(h.classes(), [kelas("a")]);
  const oldClasses = h.classes();
  const oldSession = h.sessions("a");
  stop();
  stop();
  assert.equal(h.listeners.some((item) => item.active), false);
  assert.equal(oldSession.stops, 1);
  assert.equal(oldClasses.stops, 1);
  h.subscribe("praktikan-b");
  h.emit(h.classes(), [kelas("b", ["praktikan-b"])]);
  h.emit(h.sessions("b"), [sesi("b1", "b")]);
  const count = h.stateCount();
  h.emit(oldClasses, [kelas("a")]);
  h.emit(oldSession, [sesi("a1", "a")]);
  assert.equal(h.stateCount(), count);
  assert.deepEqual(h.latest().sesi.map((item) => item.id), ["b1"]);
});

function screenHarness({ detail = true, id = "satu", user = { uid: "praktikan-a" }, role = "PRAKTIKAN", loadingAuth = false, jadwal = {} } = {}) {
  const uids = [];
  const createElement = (type, props) => ({ type, props });
  const native = Object.fromEntries(["FlatList", "ScrollView", "Text", "TouchableOpacity", "View"].map((name) => [name, name]));
  native.StyleSheet = { create: (styles) => styles };
  const exports = loadSource(detail ? "src/app/praktikan/[sesiId].tsx" : "src/app/praktikan/index.tsx", {
    "react/jsx-runtime": { jsx: createElement, jsxs: createElement },
    "expo-router": { Link: "Link", Redirect: "Redirect", useLocalSearchParams: () => ({ sesiId: id }) },
    "react-native": native,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "../../context/AuthContext": { useAuth: () => ({ user, role, loading: loadingAuth }) },
    "../../hooks/useJadwalPraktikan": { useJadwalPraktikan: (uid) => {
      uids.push(uid);
      return { sesi: [sesi("satu", "a")], kelas: [kelas("a")], mapKelas: new Map([["a", kelas("a")]]), loading: false, error: null, dariCache: false, cobaLagi: () => {}, ...jadwal };
    } },
    "../../components/shared/StatusLayar": { Loading: "Loading", Empty: "Empty", ErrorBanner: "ErrorBanner" },
    "../../components/asisten/InformasiSesi": { InformasiSesi: "InformasiSesi" },
    "../../components/asisten/StatusSesi": { StatusSesi: "StatusSesi" },
    "../../components/praktikan/KartuJadwal": { KartuJadwalPraktikan: "KartuJadwalPraktikan" },
    "../../components/praktikan/FormPresensi": { FormPresensi: "FormPresensi" },
    "../../components/praktikan/RingkasanPresensi": { RingkasanPresensi: "RingkasanPresensi" },
    "../../hooks/usePresensiPraktikan": {},
  });
  const tree = exports.default();
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object" || !node.props) return;
    nodes.push(node);
    visit(node.props.children);
    visit(node.props.ListHeaderComponent);
    visit(node.props.ListEmptyComponent);
  }
  visit(tree);
  const text = nodes.filter((node) => node.type === "Text").flatMap((node) => node.props.children).join(" ");
  return { uids, tree, nodes, text };
}

test("daftar dan detail tidak meminta data sebelum autentikasi atau bagi role asisten", () => {
  for (const detail of [true, false]) {
    for (const input of [{ user: null }, { role: "ASISTEN" }, { user: {} }, { loadingAuth: true }]) {
      const result = screenHarness({ detail, ...input });
      assert.deepEqual(result.uids, [undefined]);
      assert.equal(result.nodes.some((node) => node.type === "InformasiSesi" || node.type === "FlatList"), false);
    }
  }
});

test("detail lewat URL asing tidak menampilkan informasi sesi atau nama kelas", () => {
  const result = screenHarness({ id: "sesi-kelas-lain" });
  assert.match(result.text, /Sesi tidak tersedia/);
  assert.equal(result.nodes.some((node) => node.type === "InformasiSesi"), false);
  assert.equal(result.text.includes("Praktikum satu"), false);
});

test("detail yang sah menampilkan informasi sesi dan tautan kembali yang benar", () => {
  const result = screenHarness();
  assert.deepEqual(result.uids, ["praktikan-a"]);
  const info = result.nodes.find((node) => node.type === "InformasiSesi");
  assert.equal(info.props.sesi.id, "satu");
  assert.equal(info.props.kelasLabel, "Kelas a (a)");
  assert.equal(result.nodes.find((node) => node.type === "Link").props.href, "/praktikan");
});

test("tautan dashboard lama diarahkan ke daftar tanpa meminta sesi bernama index", () => {
  const result = screenHarness({ id: "index" });
  assert.deepEqual(result.uids, [undefined]);
  assert.equal(result.tree.type, "Redirect");
  assert.equal(result.tree.props.href, "/praktikan");
});

test("layar menampilkan loading/error, bukan pesan sesi hilang atau daftar kosong", () => {
  for (const detail of [true, false]) {
    const loading = screenHarness({ detail, jadwal: { loading: true } });
    assert.equal(loading.nodes.some((node) => node.type === "Loading"), true);
    assert.equal(loading.text.includes("Sesi tidak tersedia"), false);
    const failed = screenHarness({ detail, jadwal: { error: "Koneksi terganggu" } });
    assert.equal(failed.nodes.some((node) => node.type === "ErrorBanner"), true);
    assert.match(failed.text, /Coba lagi/);
    assert.equal(failed.nodes.some((node) => node.type === "Empty"), false);
  }
});

test("daftar membedakan praktikan tanpa kelas dengan kelas tanpa sesi", () => {
  for (const [classes, expected] of [[[], "Belum terdaftar di kelas"], [[kelas("a")], "Belum ada jadwal"]]) {
    const result = screenHarness({ detail: false, jadwal: { kelas: classes, sesi: [] } });
    assert.equal(result.nodes.find((node) => node.type === "Empty").props.title, expected);
  }
});
