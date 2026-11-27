// node --test tests/sprint4-fondasi.test.mjs
// Uji fondasi PM Sprint 4: grace period/denda, template & parser 3 bulk CSV terpisah,
// jalur pembayaran/presensi backend Vercel, serta verifikasi signature SHA-512 Midtrans.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const denda = loadSource("src/lib/denda.ts");
const templateBulk = loadSource("src/lib/templateBulk.ts", {
  "./denda": denda,
});
const midtrans = loadSource("backend/lib/midtrans.ts", {
  "node:crypto": crypto,
});
const keterlambatanServer = loadSource("backend/lib/keterlambatan.ts");

test("hitungKeterlambatan menganggap tepat pada akhir grace period sebagai TEPAT_WAKTU dan lewatnya TERLAMBAT", () => {
  const mulai = new Date("2026-11-27T08:00:00Z");
  const tepatBatas = new Date("2026-11-27T08:15:00Z");
  const sebelumBatas = new Date("2026-11-27T08:05:00Z");
  const lewatSatuDetik = new Date("2026-11-27T08:15:01Z");
  const lewatSepuluhMenit = new Date("2026-11-27T08:25:00Z");

  assert.equal(denda.hitungKeterlambatan(sebelumBatas, mulai, 15).terlambat, false);
  assert.equal(denda.hitungKeterlambatan(tepatBatas, mulai, 15).statusKetepatan, "TEPAT_WAKTU");
  assert.equal(denda.hitungKeterlambatan(tepatBatas, mulai, 15).terlambatMenit, 0);

  const satuDetik = denda.hitungKeterlambatan(lewatSatuDetik, mulai, 15);
  assert.equal(satuDetik.terlambat, true);
  assert.equal(satuDetik.statusKetepatan, "TERLAMBAT");
  assert.equal(satuDetik.terlambatMenit, 1);

  const sepuluhMenit = denda.hitungKeterlambatan(lewatSepuluhMenit, mulai, 15);
  assert.equal(sepuluhMenit.terlambatMenit, 10);

  // Konsisten dengan utilitas server backend.
  assert.equal(
    keterlambatanServer.hitungKeterlambatanServer(tepatBatas.getTime(), mulai.getTime(), 15).terlambat,
    false,
  );
  assert.equal(
    keterlambatanServer.hitungKeterlambatanServer(lewatSatuDetik.getTime(), mulai.getTime(), 15).terlambatMenit,
    1,
  );
});

test("buatFineId deterministik mencegah duplikasi dan formatRupiah memformat nominal Indonesia", () => {
  assert.equal(denda.buatFineId("sesi-1", "uid-abc"), "sesi-1_uid-abc");
  assert.throws(() => denda.buatFineId("sesi/1", "uid-abc"));
  assert.throws(() => denda.buatFineId("", "uid-abc"));

  assert.equal(denda.formatRupiah(0), "Rp0");
  assert.equal(denda.formatRupiah(5000), "Rp5.000");
  assert.equal(denda.formatRupiah(1250000), "Rp1.250.000");
  assert.equal(denda.formatRupiah(null), "Rp0");
});

test("buatTemplateCsv memisahkan 3 jenis template bulk (lab, praktikan, asprak)", () => {
  const tLab = templateBulk.buatTemplateCsv("lab");
  const tPraktikan = templateBulk.buatTemplateCsv("praktikan");
  const tAsprak = templateBulk.buatTemplateCsv("asprak");

  assert.equal(tLab.namaFile, "template-bulk-lab.csv");
  assert.equal(tPraktikan.namaFile, "template-bulk-praktikan.csv");
  assert.equal(tAsprak.namaFile, "template-bulk-asprak.csv");

  assert.ok(tLab.header.includes("gracePeriodMenit"));
  assert.ok(tLab.header.includes("nominalDenda"));
  assert.deepEqual(tPraktikan.header, ["nim", "nama", "email"]);
  assert.deepEqual(tAsprak.header, ["nim", "nama", "email"]);

  // Template yang dihasilkan harus 100% valid saat di-parse kembali.
  for (const jenis of ["lab", "praktikan", "asprak"]) {
    const parsed = templateBulk.parseCsvBulk(jenis, templateBulk.buatTemplateCsv(jenis).konten);
    assert.equal(parsed.length, 2);
    assert.equal(parsed.every((item) => item.diterima && item.masalah.length === 0), true);
  }
});

test("parseCsvBulk mendukung pemisah titik koma Excel ID serta menandai baris kosong/invalid untuk diedit Aslab", () => {
  const csvSemicolon = [
    "\uFEFFnim;nama;email",
    "24060124140010;Budi;budi@undip.ac.id",
    "24060124140011;;email-salah",
  ].join("\r\n");

  const hasil = templateBulk.parseCsvBulk("praktikan", csvSemicolon);
  assert.equal(hasil.length, 2);
  assert.equal(hasil[0].diterima, true);
  assert.deepEqual(hasil[0].masalah, []);

  // Baris kedua tetap muncul untuk ScrollView preview agar Aslab bisa melengkapi atau deny.
  assert.equal(hasil[1].diterima, false);
  assert.equal(hasil[1].masalah.length, 2);

  // Setelah Aslab melengkapi data di ScrollView, validasi ulang harus lolos.
  const diperbaiki = { nim: hasil[1].data.nim, nama: "Siti", email: "siti@undip.ac.id" };
  assert.deepEqual(templateBulk.validasiBarisBulk("praktikan", diperbaiki), []);
});

test("verifikasiSignatureMidtrans menerima signature SHA-512 sah dan menolak payload termodifikasi", () => {
  const serverKey = "SB-Mid-server-TEST-KEY-123";
  const payload = {
    order_id: "HL-sesi1_uid1-1732690000000",
    status_code: "200",
    gross_amount: "5000.00",
  };
  const signature = crypto
    .createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
    .digest("hex");

  assert.equal(midtrans.verifikasiSignatureMidtrans({ ...payload, signature_key: signature }, serverKey), true);
  assert.equal(
    midtrans.verifikasiSignatureMidtrans({ ...payload, gross_amount: "100.00", signature_key: signature }, serverKey),
    false,
  );
  assert.equal(
    midtrans.verifikasiSignatureMidtrans({ ...payload, signature_key: "palsu" }, serverKey),
    false,
  );
  assert.equal(
    midtrans.verifikasiSignatureMidtrans({ ...payload, signature_key: signature }, "KEY-LAIN"),
    false,
  );
});

test("petakanStatusMidtrans dan buatOrderIdMidtrans mematuhi kontrak Midtrans", () => {
  assert.equal(midtrans.petakanStatusMidtrans("settlement"), "success");
  assert.equal(midtrans.petakanStatusMidtrans("capture", "accept"), "success");
  assert.equal(midtrans.petakanStatusMidtrans("capture", "challenge"), "pending");
  assert.equal(midtrans.petakanStatusMidtrans("pending"), "pending");
  assert.equal(midtrans.petakanStatusMidtrans("deny"), "failed");
  assert.equal(midtrans.petakanStatusMidtrans("cancel"), "failed");
  assert.equal(midtrans.petakanStatusMidtrans("expire"), "failed");

  const orderId = midtrans.buatOrderIdMidtrans("sesi-sangat-panjang-1234567890_uid-9876543210", 1732690000000);
  assert.ok(orderId.length <= 50);
  assert.match(orderId, /^[A-Za-z0-9_-]+$/);
});

test("helper pembayaran & presensi memanggil backend Vercel dengan Firebase Bearer token", async () => {
  const prevUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  const prevFetch = globalThis.fetch;
  const requests = [];

  process.env.EXPO_PUBLIC_BACKEND_URL = "https://hadirlab-backend.vercel.app/";
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify(
          String(url).includes("/api/pembayaran/buat")
            ? { orderId: "HL-1", snapToken: "tok", redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/vtweb/tok", status: "pending" }
            : { jarakMeter: 12, radiusMeter: 100, statusKetepatan: "TERLAMBAT", terlambatMenit: 5, fineId: "s1_u1", nominalDenda: 5000 },
        ),
    };
  };

  try {
    const backend = loadSource("src/lib/backend.ts", {
      "./firebase": { auth: { currentUser: { getIdToken: async () => "id-token-uji" } } },
    });
    const pembayaran = loadSource("src/lib/pembayaran.ts", {
      "./backend": backend,
    });
    const presensi = loadSource("src/lib/presensi.ts", {
      "@react-native-firebase/functions": { getFunctions: () => ({}), httpsCallable: () => () => {} },
      "./backend": backend,
    });

    const trx = await pembayaran.buatTransaksiDenda("s1_u1");
    assert.equal(trx.orderId, "HL-1");
    assert.equal(requests[0].url, "https://hadirlab-backend.vercel.app/api/pembayaran/buat");
    assert.equal(requests[0].init.headers.Authorization, "Bearer id-token-uji");

    const hasilPresensi = await presensi.catatPresensi({
      sessionId: "s1",
      catatan: "Hadir",
      koordinat: { latitude: -7.0486, longitude: 110.441, akurasiMeter: 20 },
    });
    assert.equal(hasilPresensi.fineId, "s1_u1");
    assert.equal(requests[1].url, "https://hadirlab-backend.vercel.app/api/presensi/catat");

    await assert.rejects(pembayaran.buatTransaksiDenda("bad/id"), /tidak valid/);
  } finally {
    if (prevUrl === undefined) delete process.env.EXPO_PUBLIC_BACKEND_URL;
    else process.env.EXPO_PUBLIC_BACKEND_URL = prevUrl;
    globalThis.fetch = prevFetch;
  }
});
