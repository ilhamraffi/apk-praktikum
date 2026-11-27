// backend/lib/midtrans.ts
// Integrasi Midtrans Snap Sandbox & verifikasi signature SHA-512 webhook.
// MIDTRANS_SERVER_KEY hanya dibaca dari environment variable server.
import crypto from "node:crypto";

export type StatusPembayaran = "pending" | "success" | "failed";

export interface PayloadWebhookMidtrans {
  order_id?: unknown;
  status_code?: unknown;
  gross_amount?: unknown;
  signature_key?: unknown;
  transaction_status?: unknown;
  fraud_status?: unknown;
  payment_type?: unknown;
  transaction_id?: unknown;
  transaction_time?: unknown;
}

export interface PermintaanSnapMidtrans {
  orderId: string;
  grossAmount: number;
  namaItem: string;
  customer: {
    nama: string;
    email?: string;
  };
}

export interface HasilSnapMidtrans {
  token: string;
  redirectUrl: string;
}

export function ambilServerKeyMidtrans(): string {
  const key = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!key) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi di server.");
  }
  return key;
}

export function ambilUrlSnapMidtrans(): string {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return isProd
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
}

/**
 * Verifikasi signature resmi Midtrans:
 * SHA512(order_id + status_code + gross_amount + serverKey)
 */
export function verifikasiSignatureMidtrans(
  payload: PayloadWebhookMidtrans,
  serverKey: string,
): boolean {
  if (
    typeof payload.order_id !== "string" ||
    typeof payload.status_code !== "string" ||
    typeof payload.gross_amount !== "string" ||
    typeof payload.signature_key !== "string" ||
    !serverKey
  ) {
    return false;
  }

  const diharapkan = crypto
    .createHash("sha512")
    .update(
      `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`,
    )
    .digest("hex");

  const bufA = Buffer.from(diharapkan, "utf8");
  const bufB = Buffer.from(payload.signature_key.trim().toLowerCase(), "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Memetakan status transaksi Midtrans ke status aplikasi: pending / success / failed. */
export function petakanStatusMidtrans(
  transactionStatus: unknown,
  fraudStatus?: unknown,
): StatusPembayaran {
  if (typeof transactionStatus !== "string") return "pending";
  switch (transactionStatus.toLowerCase()) {
    case "settlement":
      return "success";
    case "capture":
      return typeof fraudStatus === "string" && fraudStatus.toLowerCase() === "challenge"
        ? "pending"
        : "success";
    case "pending":
      return "pending";
    case "deny":
    case "cancel":
    case "expire":
    case "failure":
      return "failed";
    default:
      return "pending";
  }
}

/** Membuat order_id aman (maks 50 karakter alfanumerik/strip/garis bawah sesuai Midtrans). */
export function buatOrderIdMidtrans(fineId: string, nowMs = Date.now()): string {
  const bersih = fineId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24) || "FINE";
  return `HL-${bersih}-${nowMs}`.slice(0, 50);
}

export async function buatTransaksiSnapMidtrans(
  input: PermintaanSnapMidtrans,
): Promise<HasilSnapMidtrans> {
  const serverKey = ambilServerKeyMidtrans();
  const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;

  const body = {
    transaction_details: {
      order_id: input.orderId,
      gross_amount: Math.round(input.grossAmount),
    },
    item_details: [
      {
        id: input.orderId,
        price: Math.round(input.grossAmount),
        quantity: 1,
        name: input.namaItem.slice(0, 50),
      },
    ],
    customer_details: {
      first_name: input.customer.nama.slice(0, 50),
      ...(input.customer.email ? { email: input.customer.email } : {}),
    },
  };

  const response = await fetch(ambilUrlSnapMidtrans(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as {
    token?: unknown;
    redirect_url?: unknown;
    error_messages?: unknown;
  };

  if (!response.ok || typeof data.token !== "string" || typeof data.redirect_url !== "string") {
    const detail = Array.isArray(data.error_messages)
      ? data.error_messages.join("; ")
      : `HTTP ${response.status}`;
    throw new Error(`Midtrans gagal membuat transaksi: ${detail}`);
  }

  return { token: data.token, redirectUrl: data.redirect_url };
}
