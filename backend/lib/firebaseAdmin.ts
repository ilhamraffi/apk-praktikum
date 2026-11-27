// backend/lib/firebaseAdmin.ts
// Inisialisasi Firebase Admin SDK dari environment variable Vercel, verifikasi
// Firebase ID Token (Bearer), dan pengirim push notification FCM.
import type { VercelRequest } from "@vercel/node";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function parseServiceAccount(): Record<string, string> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON belum dikonfigurasi di Vercel.");
  }

  let jsonText = raw;
  if (!raw.startsWith("{")) {
    jsonText = Buffer.from(raw, "base64").toString("utf8");
  }

  const parsed = JSON.parse(jsonText) as Record<string, string>;
  if (typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  return parsed;
}

function pastikanApp(): void {
  if (getApps().length > 0) return;
  initializeApp({
    credential: cert(parseServiceAccount()),
  });
}

export function ambilDb() {
  pastikanApp();
  return getFirestore();
}

export async function verifikasiBearerToken(
  req: VercelRequest,
): Promise<DecodedIdToken> {
  pastikanApp();
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new Error("UNAUTHENTICATED: Token autentikasi tidak ditemukan.");
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new Error("UNAUTHENTICATED: Token autentikasi kosong.");
  }
  try {
    return await getAuth().verifyIdToken(token);
  } catch {
    throw new Error("UNAUTHENTICATED: Sesi masuk tidak valid atau kedaluwarsa.");
  }
}

export async function kirimNotifikasiKeUids(
  uids: string[],
  pesan: {
    title: string;
    body: string;
    data?: Record<string, string>;
  },
): Promise<void> {
  const daftarUid = [...new Set(uids.filter((u) => typeof u === "string" && u.trim()))];
  if (daftarUid.length === 0) return;

  const db = ambilDb();
  const messaging = getMessaging();
  const refs: Array<{ token: string; ref: FirebaseFirestore.DocumentReference }> = [];

  await Promise.all(
    daftarUid.map(async (uid) => {
      const snap = await db.collection(`users/${uid}/fcmTokens`).get();
      snap.forEach((docSnap) => {
        refs.push({ token: docSnap.id, ref: docSnap.ref });
      });
    }),
  );

  if (refs.length === 0) return;

  const hasil = await messaging.sendEachForMulticast({
    tokens: refs.map((item) => item.token),
    notification: {
      title: pesan.title,
      body: pesan.body,
    },
    data: pesan.data,
    android: { priority: "high" },
  });

  const hapusKadaluarsa: Array<Promise<unknown>> = [];
  hasil.responses.forEach((resp, idx) => {
    const code = resp.error?.code;
    if (
      code === "messaging/invalid-registration-token" ||
      code === "messaging/registration-token-not-registered"
    ) {
      hapusKadaluarsa.push(refs[idx].ref.delete().catch(() => {}));
    }
  });
  await Promise.all(hapusKadaluarsa);
}
