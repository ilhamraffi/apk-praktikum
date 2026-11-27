// backend/api/midtrans/webhook.ts
// POST /api/midtrans/webhook
// Menerima HTTP callback/webhook dari Midtrans Sandbox, memverifikasi signature SHA-512,
// memperbarui status `payments` & `fines` secara atomik (tanpa mengubah status kehadiran),
// serta mengirim push notification hasil pembayaran (SRS-22, SRS-23).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue } from "firebase-admin/firestore";
import { ambilDb, kirimNotifikasiKeUids } from "../../lib/firebaseAdmin";
import { formatRupiah } from "../../lib/keterlambatan";
import {
  ambilServerKeyMidtrans,
  petakanStatusMidtrans,
  verifikasiSignatureMidtrans,
  type PayloadWebhookMidtrans,
} from "../../lib/midtrans";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method tidak diizinkan." });
  }

  try {
    const payload = (req.body ?? {}) as PayloadWebhookMidtrans;
    const serverKey = ambilServerKeyMidtrans();

    if (!verifikasiSignatureMidtrans(payload, serverKey)) {
      return res.status(403).json({ error: "Signature Midtrans tidak valid." });
    }

    const orderId = String(payload.order_id);
    const grossAmount = Math.round(Number(payload.gross_amount));
    const statusBaru = petakanStatusMidtrans(
      payload.transaction_status,
      payload.fraud_status,
    );
    const metodePembayaran =
      typeof payload.payment_type === "string" ? payload.payment_type : null;
    const midtransTransactionId =
      typeof payload.transaction_id === "string" ? payload.transaction_id : null;
    const midtransStatus =
      typeof payload.transaction_status === "string"
        ? payload.transaction_status
        : null;
    const waktuTransaksi =
      typeof payload.transaction_time === "string"
        ? payload.transaction_time
        : null;

    const db = ambilDb();
    const paymentRef = db.doc(`payments/${orderId}`);

    const hasil = await db.runTransaction(async (tx) => {
      const paymentSnap = await tx.get(paymentRef);
      if (!paymentSnap.exists) {
        return { ditemukan: false as const };
      }

      const payment = paymentSnap.data() ?? {};
      const nominalTercatat = Math.round(Number(payment.nominal ?? 0));
      if (!Number.isFinite(grossAmount) || grossAmount !== nominalTercatat) {
        return { ditemukan: true as const, nominalCocok: false as const };
      }

      const fineId = typeof payment.fineId === "string" ? payment.fineId : "";
      const fineRef = fineId ? db.doc(`fines/${fineId}`) : null;
      const fineSnap = fineRef ? await tx.get(fineRef) : null;
      const statusLamaPayment = payment.status;
      const statusLamaFine = fineSnap?.data()?.status;

      tx.update(paymentRef, {
        status: statusBaru,
        metodePembayaran,
        midtransTransactionId,
        midtransStatus,
        waktuTransaksi: waktuTransaksi ?? FieldValue.serverTimestamp(),
        diperbaruiPada: FieldValue.serverTimestamp(),
      });

      // Jangan pernah menurunkan status tagihan yang sudah lunas (`success`)
      // dan JANGAN mengubah dokumen `attendance` (SRS-21).
      if (fineRef && fineSnap?.exists && statusLamaFine !== "success") {
        tx.update(fineRef, {
          status: statusBaru,
          orderIdTerakhir: orderId,
          diperbaruiPada: FieldValue.serverTimestamp(),
          ...(statusBaru === "success" ? { dibayarPada: FieldValue.serverTimestamp() } : {}),
        });
      }

      return {
        ditemukan: true as const,
        nominalCocok: true as const,
        uid: typeof payment.uid === "string" ? payment.uid : "",
        fineId,
        namaPraktikum:
          typeof payment.namaPraktikum === "string" ? payment.namaPraktikum : "Praktikum",
        nominal: nominalTercatat,
        statusBerubah: statusLamaPayment !== statusBaru,
      };
    });

    if (!hasil.ditemukan) {
      return res.status(404).json({ error: "Transaksi pembayaran tidak ditemukan." });
    }
    if (!hasil.nominalCocok) {
      return res.status(400).json({ error: "Nominal transaksi tidak cocok." });
    }

    if (hasil.uid && hasil.statusBerubah && (statusBaru === "success" || statusBaru === "failed")) {
      const sukses = statusBaru === "success";
      await kirimNotifikasiKeUids([hasil.uid], {
        title: sukses ? "Pembayaran denda berhasil" : "Pembayaran denda gagal",
        body: sukses
          ? `Pembayaran denda ${hasil.namaPraktikum} sebesar ${formatRupiah(hasil.nominal)} telah terverifikasi.`
          : `Pembayaran denda ${hasil.namaPraktikum} belum berhasil. Silakan coba bayar ulang.`,
        data: {
          type: sukses ? "pembayaran_berhasil" : "pembayaran_gagal",
          fineId: hasil.fineId,
          orderId,
          route: "/praktikan/pembayaran",
        },
      }).catch(() => {});
    }

    return res.status(200).json({ ok: true, status: statusBaru });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Gagal memproses webhook Midtrans.",
    });
  }
}
