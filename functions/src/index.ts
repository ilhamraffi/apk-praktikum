import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

if (!getApps().length) initializeApp();

const db = getFirestore();
const messaging = getMessaging();
const BATAS_AKURASI_METER = 250;
const RADIUS_BUMI_METER = 6_371_000;

interface RequestData {
  sessionId?: unknown;
  catatan?: unknown;
  kodePresensi?: unknown;
  koordinat?: {
    latitude?: unknown;
    longitude?: unknown;
    akurasiMeter?: unknown;
  };
}

interface SesiData {
  classId?: unknown;
  labId?: unknown;
  status?: unknown;
  kodePresensi?: unknown;
}

interface KelasData {
  pesertaUids?: unknown;
}

interface LabData {
  latitude?: unknown;
  longitude?: unknown;
  radiusMeter?: unknown;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function distanceInMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const radians = (value: number) => value * (Math.PI / 180);
  const deltaLatitude = radians(latitudeB - latitudeA);
  const deltaLongitude = radians(longitudeB - longitudeA);
  const firstLatitude = radians(latitudeA);
  const secondLatitude = radians(latitudeB);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;
  return RADIUS_BUMI_METER * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function invalid(message: string): never {
  throw new HttpsError("invalid-argument", message);
}

export const catatPresensi = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Silakan masuk terlebih dahulu.");
  }

  const data = (request.data ?? {}) as RequestData;
  const sessionId = data.sessionId;
  const catatan = data.catatan;
  const koordinat = data.koordinat;
  if (
    typeof sessionId !== "string" ||
    !sessionId ||
    sessionId.includes("/") ||
    typeof catatan !== "string" ||
    !catatan.trim() ||
    !koordinat ||
    !isNumber(koordinat.latitude) ||
    !isNumber(koordinat.longitude) ||
    !isNumber(koordinat.akurasiMeter)
  ) {
    invalid("Data presensi atau lokasi tidak valid.");
  }
  if (
    koordinat.latitude < -90 ||
    koordinat.latitude > 90 ||
    koordinat.longitude < -180 ||
    koordinat.longitude > 180 ||
    koordinat.akurasiMeter < 0 ||
    koordinat.akurasiMeter > 100_000
  ) {
    invalid("Koordinat atau akurasi lokasi tidak valid.");
  }
  if (koordinat.akurasiMeter > BATAS_AKURASI_METER) {
    throw new HttpsError(
      "failed-precondition",
      "Akurasi lokasi belum cukup. Tunggu GPS lebih stabil lalu coba lagi.",
    );
  }
  const latitude = koordinat.latitude;
  const longitude = koordinat.longitude;
  const akurasiMeter = koordinat.akurasiMeter;

  const uid = request.auth.uid;
  const sessionRef = db.doc(`sessions/${sessionId}`);
  const attendanceRef = db.doc(`sessions/${sessionId}/attendance/${uid}`);

  const hasil = await db.runTransaction(async (transaction) => {
    const [sessionSnap, userSnap, attendanceSnap] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(db.doc(`users/${uid}`)),
      transaction.get(attendanceRef),
    ]);
    if (!sessionSnap.exists) {
      throw new HttpsError("not-found", "Sesi praktikum tidak ditemukan.");
    }
    if (attendanceSnap.exists) {
      throw new HttpsError("already-exists", "Presensi untuk sesi ini sudah tercatat.");
    }

    const session = sessionSnap.data() as SesiData;
    const user = userSnap.data();
    if (!userSnap.exists || user?.role !== "PRAKTIKAN") {
      throw new HttpsError("permission-denied", "Presensi hanya untuk praktikan.");
    }
    if (session.status !== "DIBUKA" || typeof session.classId !== "string") {
      throw new HttpsError("failed-precondition", "Sesi belum dibuka.");
    }
    const kodeWajib =
      typeof session.kodePresensi === "string"
        ? session.kodePresensi.trim().toUpperCase()
        : "";
    if (kodeWajib) {
      const kodeKirim =
        typeof data.kodePresensi === "string"
          ? data.kodePresensi.trim().toUpperCase()
          : "";
      if (kodeKirim !== kodeWajib) {
        throw new HttpsError(
          "permission-denied",
          "Kode presensi ruangan tidak sesuai.",
        );
      }
    }
    if (typeof session.labId !== "string" || !session.labId) {
      throw new HttpsError("failed-precondition", "Sesi belum memiliki laboratorium.");
    }

    const classSnap = await transaction.get(db.doc(`classes/${session.classId}`));
    const kelas = classSnap.data() as KelasData | undefined;
    if (
      !classSnap.exists ||
      !Array.isArray(kelas?.pesertaUids) ||
      !kelas.pesertaUids.includes(uid)
    ) {
      throw new HttpsError("permission-denied", "Kamu bukan peserta kelas ini.");
    }

    const labSnap = await transaction.get(db.doc(`labs/${session.labId}`));
    const lab = labSnap.data() as LabData | undefined;
    if (
      !labSnap.exists ||
      !isNumber(lab?.latitude) ||
      !isNumber(lab?.longitude) ||
      !isNumber(lab?.radiusMeter) ||
      lab.latitude < -90 ||
      lab.latitude > 90 ||
      lab.longitude < -180 ||
      lab.longitude > 180 ||
      lab.radiusMeter <= 0 ||
      lab.radiusMeter > 250
    ) {
      throw new HttpsError("failed-precondition", "Data laboratorium tidak valid.");
    }
    const labLatitude = lab?.latitude;
    const labLongitude = lab?.longitude;
    const labRadiusMeter = lab?.radiusMeter;
    if (
      !isNumber(labLatitude) ||
      !isNumber(labLongitude) ||
      !isNumber(labRadiusMeter)
    ) {
      throw new HttpsError("failed-precondition", "Data laboratorium tidak valid.");
    }

    const jarakMeter = distanceInMeters(
      latitude,
      longitude,
      labLatitude,
      labLongitude,
    );
    if (jarakMeter > labRadiusMeter) {
      throw new HttpsError(
        "permission-denied",
        `Kamu berada di luar radius laboratorium (${Math.round(jarakMeter)} m).`,
      );
    }
    transaction.create(attendanceRef, {
      uid,
      nama: typeof user.nama === "string" ? user.nama.trim() : "",
      nim: typeof user.nim === "string" ? user.nim.trim() : "",
      statusKehadiran: "Hadir",
      catatan: catatan.trim(),
      waktu: FieldValue.serverTimestamp(),
      labId: session.labId,
      lokasi: {
        latitude,
        longitude,
        akurasiMeter,
      },
      jarakMeter: Math.round(jarakMeter * 100) / 100,
    });
    return { jarakMeter: Math.round(jarakMeter * 100) / 100, radiusMeter: labRadiusMeter };
  });

  return hasil;
});

interface SessionNotificationData {
  classId?: unknown;
  namaPraktikum?: unknown;
  modul?: unknown;
  mulai?: { toMillis?: () => number } | null;
  selesai?: { toMillis?: () => number } | null;
  waktu?: unknown;
  labId?: unknown;
  ruangan?: unknown;
  status?: unknown;
}

function millisOf(ts: unknown): number | null {
  if (ts && typeof ts === "object" && "toMillis" in ts && typeof (ts as { toMillis?: unknown }).toMillis === "function") {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return null;
}

interface PermissionNotificationData {
  uid?: unknown;
  sessionId?: unknown;
  status?: unknown;
}

async function tokensForUsers(uids: string[]): Promise<string[]> {
  const tokens = new Set<string>();
  for (const uid of [...new Set(uids)]) {
    const snapshot = await db.collection(`users/${uid}/fcmTokens`).get();
    snapshot.docs.forEach((item) => tokens.add(item.id));
  }
  return [...tokens];
}

async function kirimNotifikasi(
  tokens: string[],
  title: string,
  body: string,
  route: string,
): Promise<void> {
  if (!tokens.length) return;
  for (let index = 0; index < tokens.length; index += 500) {
    await messaging.sendEachForMulticast({
      tokens: tokens.slice(index, index + 500),
      notification: { title, body },
      data: { route },
    });
  }
}

export const onSessionChanged = onDocumentUpdated(
  "sessions/{sessionId}",
  async (event) => {
    const before = event.data?.before.data() as SessionNotificationData | undefined;
    const after = event.data?.after.data() as SessionNotificationData | undefined;
    if (!before || !after || typeof after.classId !== "string") return;

    const statusDibuka =
      before.status !== "DIBUKA" && after.status === "DIBUKA";
    const jadwalBerubah =
      millisOf(before.mulai) !== millisOf(after.mulai) ||
      millisOf(before.selesai) !== millisOf(after.selesai) ||
      before.waktu !== after.waktu ||
      before.labId !== after.labId ||
      before.ruangan !== after.ruangan;
    if (!statusDibuka && !jadwalBerubah) return;

    const kelasSnap = await db.doc(`classes/${after.classId}`).get();
    const pesertaUids = kelasSnap.data()?.pesertaUids;
    if (!Array.isArray(pesertaUids)) return;
    const tokens = await tokensForUsers(
      pesertaUids.filter((uid): uid is string => typeof uid === "string"),
    );
    const nama = typeof after.namaPraktikum === "string" ? after.namaPraktikum : "Praktikum";
    if (statusDibuka) {
      await kirimNotifikasi(
        tokens,
        "Sesi dibuka",
        `${nama}${typeof after.modul === "string" ? ` - ${after.modul}` : ""}. Silakan presensi.`,
        `/praktikan/${event.params.sessionId}`,
      );
    } else {
      await kirimNotifikasi(
        tokens,
        "Jadwal berubah",
        `${nama}${typeof after.waktu === "string" ? ` - ${after.waktu}` : ""}.`,
        `/praktikan/${event.params.sessionId}`,
      );
    }
  },
);

export const onPermissionDecision = onDocumentUpdated(
  "permissions/{permissionId}",
  async (event) => {
    const before = event.data?.before.data() as PermissionNotificationData | undefined;
    const after = event.data?.after.data() as PermissionNotificationData | undefined;
    if (
      !before ||
      !after ||
      typeof after.uid !== "string" ||
      (after.status !== "approved" && after.status !== "rejected") ||
      before.status === after.status
    ) {
      return;
    }
    const tokens = await tokensForUsers([after.uid]);
    const status = after.status === "approved" ? "diterima" : "ditolak";
    await kirimNotifikasi(
      tokens,
      `Pengajuan izin ${status}`,
      "Buka aplikasi untuk melihat detail pengajuan izin.",
      "/praktikan/izin",
    );
  },
);
