// backend/api/pembayaran/buat.ts
// POST /api/pembayaran/buat
// Membuat transaksi Midtrans Snap Sandbox lewat backend (SRS-22) dan mencatat
// transaksi awal berstatus `pending` di koleksi `payments/{orderId}`.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue } from "firebase-admin/firestore";
import { ambilDb, verifikasiBearerToken } from "../../lib/firebaseAdmin";
import { isNumber } from "../../lib/keterlambatan";
import {
  buatOrderIdMidtrans,
  buatTransaksiSnapMidtrans,
} from "../../lib/midtrans";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method tidak diizinkan." });
  }

  try {
    const decoded = await verifikasiBearerToken(req);
    const uid = decoded.uid;
    const fineId =
      typeof req.body?.fineId === "string" ? req.body.fineId.trim() : "";

    if (!fineId || fineId.includes("/")) {
      return res.status(400).json({
        code: "invalid-argument",
        error: "Identitas tagihan tidak valid.",
      });
    }

    const db = ambilDb();
    const fineRef = db.doc(`fines/${fineId}`);
    const [fineSnap, userSnap] = await Promise.all([
      fineRef.get(),
      db.doc(`users/${uid}`).get(),
    ]);

    if (!fineSnap.exists) {
      return res.status(404).json({
        code: "not-found",
        error: "Tagihan denda tidak ditemukan.",
      });
    }

    const fine = fineSnap.data() ?? {};
    if (fine.uid !== uid) {
      return res.status(403).json({
        code: "permission-denied",
        error: "Kamu tidak berhak membayar tagihan milik praktikan lain.",
      });
    }
    if (fine.status === "success") {
      return res.status(409).json({
        code: "already-exists",
        error: "Tagihan denda ini sudah lunas.",
      });
    }
    if (!isNumber(fine.nominal) || fine.nominal <= 0) {
      return res.status(400).json({
        code: "failed-precondition",
        error: "Nominal denda tidak valid.",
      });
    }

    const user = userSnap.data() ?? {};
    const orderId = buatOrderIdMidtrans(fineId);
    const namaPraktikum =
      typeof fine.namaPraktikum === "string" && fine.namaPraktikum.trim()
        ? fine.namaPraktikum.trim()
        : "Praktikum";

    const snap = await buatTransaksiSnapMidtrans({
      orderId,
      grossAmount: fine.nominal,
      namaItem: `Denda ${namaPraktikum}`,
      customer: {
        nama: typeof user.nama === "string" && user.nama ? user.nama : "Praktikan",
        email: typeof user.email === "string" ? user.email : decoded.email,
      },
    });

    const batch = db.batch();
    batch.set(db.doc(`payments/${orderId}`), {
      orderId,
      fineId,
      uid,
      sessionId: typeof fine.sessionId === "string" ? fine.sessionId : "",
      namaPraktikum,
      modul: typeof fine.modul === "string" ? fine.modul : "",
      nominal: Math.round(fine.nominal),
      status: "pending",
      metodePembayaran: null,
      snapToken: snap.token,
      redirectUrl: snap.redirectUrl,
      midtransTransactionId: null,
      midtransStatus: "pending",
      dibuatPada: FieldValue.serverTimestamp(),
      diperbaruiPada: FieldValue.serverTimestamp(),
      waktuTransaksi: null,
    });
    batch.update(fineRef, {
      status: "pending",
      orderIdTerakhir: orderId,
      diperbaruiPada: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return res.status(200).json({
      orderId,
      snapToken: snap.token,
      redirectUrl: snap.redirectUrl,
      status: "pending",
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("UNAUTHENTICATED:")) {
      return res.status(401).json({
        code: "unauthenticated",
        error: error.message.replace("UNAUTHENTICATED:", "").trim(),
      });
    }
    return res.status(500).json({
      code: "internal",
      error: error instanceof Error ? error.message : "Gagal membuat transaksi Midtrans.",
    });
  }
}
