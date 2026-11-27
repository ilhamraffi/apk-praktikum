// backend/api/presensi/catat.ts
// POST /api/presensi/catat
// Validasi lokasi/radius presensi (SRS-10), hitung keterlambatan grace period,
// buat tepat 1 tagihan denda bila terlambat (SRS-21), dan kirim FCM tagihan baru (SRS-23).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  ambilDb,
  kirimNotifikasiKeUids,
  verifikasiBearerToken,
} from "../../lib/firebaseAdmin";
import {
  BATAS_AKURASI_METER,
  buatFineId,
  formatRupiah,
  GRACE_PERIOD_DEFAULT_MENIT,
  hitungJarakMeter,
  hitungKeterlambatanServer,
  isNumber,
  NOMINAL_DENDA_DEFAULT,
} from "../../lib/keterlambatan";

interface RequestBody {
  sessionId?: unknown;
  catatan?: unknown;
  kodePresensi?: unknown;
  koordinat?: {
    latitude?: unknown;
    longitude?: unknown;
    akurasiMeter?: unknown;
  };
}

class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method tidak diizinkan." });
  }

  try {
    const decoded = await verifikasiBearerToken(req);
    const uid = decoded.uid;
    const body = (req.body ?? {}) as RequestBody;

    const sessionId = body.sessionId;
    const catatan = body.catatan;
    const koordinat = body.koordinat;
    const kodeInput =
      typeof body.kodePresensi === "string"
        ? body.kodePresensi.trim().toUpperCase()
        : "";

    if (
      typeof sessionId !== "string" ||
      !sessionId.trim() ||
      sessionId.includes("/") ||
      typeof catatan !== "string" ||
      !catatan.trim() ||
      !koordinat ||
      !isNumber(koordinat.latitude) ||
      !isNumber(koordinat.longitude) ||
      !isNumber(koordinat.akurasiMeter)
    ) {
      throw new ApiError(400, "invalid-argument", "Data presensi atau lokasi tidak valid.");
    }

    if (
      koordinat.latitude < -90 ||
      koordinat.latitude > 90 ||
      koordinat.longitude < -180 ||
      koordinat.longitude > 180 ||
      koordinat.akurasiMeter < 0 ||
      koordinat.akurasiMeter > 100_000
    ) {
      throw new ApiError(400, "invalid-argument", "Koordinat atau akurasi lokasi tidak valid.");
    }

    if (koordinat.akurasiMeter > BATAS_AKURASI_METER) {
      throw new ApiError(
        400,
        "failed-precondition",
        "Akurasi lokasi belum cukup. Tunggu GPS lebih stabil lalu coba lagi.",
      );
    }

    const db = ambilDb();
    const sessionRef = db.doc(`sessions/${sessionId}`);
    const userRef = db.doc(`users/${uid}`);
    const attendanceRef = db.doc(`sessions/${sessionId}/attendance/${uid}`);
    const fineId = buatFineId(sessionId, uid);
    const fineRef = db.doc(`fines/${fineId}`);

    // SRS-21: praktikan dengan izin disetujui dicatat sebagai excused absence,
    // bebas denda, dan kehadirannya tidak diubah menjadi Hadir.
    const izinDisetujuiSnap = await db
      .collection("permissions")
      .where("uid", "==", uid)
      .where("sessionId", "==", sessionId)
      .where("status", "==", "approved")
      .limit(1)
      .get();

    if (!izinDisetujuiSnap.empty) {
      throw new ApiError(
        409,
        "failed-precondition",
        "Izin untuk sesi ini sudah disetujui (tidak hadir dengan izin). Kehadiran tidak diubah menjadi Hadir dan kamu dibebaskan dari denda.",
      );
    }

    const sekarangMs = Date.now();
    const hasil = await db.runTransaction(async (tx) => {
      const [sessionSnap, userSnap, attendanceSnap, fineSnap] = await Promise.all([
        tx.get(sessionRef),
        tx.get(userRef),
        tx.get(attendanceRef),
        tx.get(fineRef),
      ]);

      if (!sessionSnap.exists) {
        throw new ApiError(404, "not-found", "Sesi praktikum tidak ditemukan.");
      }
      if (attendanceSnap.exists) {
        throw new ApiError(409, "already-exists", "Presensi untuk sesi ini sudah tercatat.");
      }

      const session = sessionSnap.data() ?? {};
      const user = userSnap.data() ?? {};
      if (!userSnap.exists || user.role !== "PRAKTIKAN") {
        throw new ApiError(403, "permission-denied", "Presensi hanya untuk praktikan.");
      }
      if (session.status !== "DIBUKA" || typeof session.classId !== "string") {
        throw new ApiError(400, "failed-precondition", "Sesi belum dibuka.");
      }
      if (typeof session.labId !== "string" || !session.labId) {
        throw new ApiError(400, "failed-precondition", "Sesi belum memiliki laboratorium.");
      }

      const kodeSesi =
        typeof session.kodePresensi === "string"
          ? session.kodePresensi.trim().toUpperCase()
          : "";
      if (kodeSesi && kodeInput !== kodeSesi) {
        throw new ApiError(
          400,
          "failed-precondition",
          kodeInput
            ? "Kode presensi tidak cocok. Periksa kode yang dibagikan asisten."
            : "Masukkan kode presensi dari asisten untuk mencatat kehadiran.",
        );
      }

      const classSnap = await tx.get(db.doc(`classes/${session.classId}`));
      const kelas = classSnap.data() ?? {};
      if (
        !classSnap.exists ||
        !Array.isArray(kelas.pesertaUids) ||
        !kelas.pesertaUids.includes(uid)
      ) {
        throw new ApiError(403, "permission-denied", "Kamu bukan peserta kelas ini.");
      }

      const labSnap = await tx.get(db.doc(`labs/${session.labId}`));
      const lab = labSnap.data() ?? {};
      if (
        !labSnap.exists ||
        !isNumber(lab.latitude) ||
        !isNumber(lab.longitude) ||
        !isNumber(lab.radiusMeter) ||
        lab.radiusMeter <= 0 ||
        lab.radiusMeter > 250
      ) {
        throw new ApiError(400, "failed-precondition", "Data laboratorium tidak valid.");
      }

      const jarakMeter =
        Math.round(
          hitungJarakMeter(
            koordinat.latitude as number,
            koordinat.longitude as number,
            lab.latitude,
            lab.longitude,
          ) * 100,
        ) / 100;

      if (jarakMeter > lab.radiusMeter) {
        throw new ApiError(
          400,
          "failed-precondition",
          `Di luar radius laboratorium (${jarakMeter} m dari batas ${lab.radiusMeter} m).`,
        );
      }

      const mulaiMs =
        session.mulai instanceof Timestamp
          ? session.mulai.toMillis()
          : null;
      const gracePeriodMenit = isNumber(lab.gracePeriodMenit)
        ? lab.gracePeriodMenit
        : GRACE_PERIOD_DEFAULT_MENIT;
      const nominalDenda = isNumber(lab.nominalDenda)
        ? Math.round(lab.nominalDenda)
        : NOMINAL_DENDA_DEFAULT;

      const ketepatan = hitungKeterlambatanServer(
        sekarangMs,
        mulaiMs,
        gracePeriodMenit,
      );

      const perluBuatTagihan = ketepatan.terlambat && nominalDenda > 0;
      const idTagihan = perluBuatTagihan ? fineId : null;

      tx.set(attendanceRef, {
        uid,
        nama: typeof user.nama === "string" ? user.nama : "",
        nim: typeof user.nim === "string" ? user.nim : "",
        statusKehadiran: "Hadir",
        catatan: catatan.trim(),
        waktu: FieldValue.serverTimestamp(),
        labId: session.labId,
        lokasi: {
          latitude: koordinat.latitude,
          longitude: koordinat.longitude,
          akurasiMeter: koordinat.akurasiMeter,
        },
        jarakMeter,
        statusKetepatan: ketepatan.statusKetepatan,
        terlambatMenit: ketepatan.terlambatMenit,
        fineId: idTagihan,
      });

      let tagihanBaruDibuat = false;
      if (perluBuatTagihan && !fineSnap.exists) {
        tx.set(fineRef, {
          uid,
          sessionId,
          classId: session.classId,
          labId: session.labId,
          attendancePath: `sessions/${sessionId}/attendance/${uid}`,
          namaPraktikan: typeof user.nama === "string" ? user.nama : "",
          nim: typeof user.nim === "string" ? user.nim : "",
          namaPraktikum:
            typeof session.namaPraktikum === "string" ? session.namaPraktikum : "",
          modul: typeof session.modul === "string" ? session.modul : "",
          nominal: nominalDenda,
          terlambatMenit: ketepatan.terlambatMenit,
          status: "pending",
          orderIdTerakhir: null,
          dibuatPada: FieldValue.serverTimestamp(),
          diperbaruiPada: FieldValue.serverTimestamp(),
          dibayarPada: null,
        });
        tagihanBaruDibuat = true;
      }

      return {
        jarakMeter,
        radiusMeter: lab.radiusMeter,
        statusKetepatan: ketepatan.statusKetepatan,
        terlambatMenit: ketepatan.terlambatMenit,
        fineId: idTagihan,
        nominalDenda: perluBuatTagihan ? nominalDenda : 0,
        namaPraktikum:
          typeof session.namaPraktikum === "string" ? session.namaPraktikum : "Praktikum",
        tagihanBaruDibuat,
      };
    });

    if (hasil.tagihanBaruDibuat && hasil.fineId) {
      await kirimNotifikasiKeUids([uid], {
        title: "Tagihan denda keterlambatan",
        body: `Terlambat ${hasil.terlambatMenit} menit pada ${hasil.namaPraktikum}. Tagihan: ${formatRupiah(hasil.nominalDenda)}.`,
        data: {
          type: "tagihan_denda",
          fineId: hasil.fineId,
          sessionId,
          route: "/praktikan/denda",
        },
      }).catch(() => {});
    }

    return res.status(200).json({
      jarakMeter: hasil.jarakMeter,
      radiusMeter: hasil.radiusMeter,
      statusKetepatan: hasil.statusKetepatan,
      terlambatMenit: hasil.terlambatMenit,
      fineId: hasil.fineId,
      nominalDenda: hasil.nominalDenda,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ code: error.code, error: error.message });
    }
    if (error instanceof Error && error.message.startsWith("UNAUTHENTICATED:")) {
      return res.status(401).json({
        code: "unauthenticated",
        error: error.message.replace("UNAUTHENTICATED:", "").trim(),
      });
    }
    return res.status(500).json({
      code: "internal",
      error: error instanceof Error ? error.message : "Gagal mencatat presensi.",
    });
  }
}
