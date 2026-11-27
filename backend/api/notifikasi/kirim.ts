// backend/api/notifikasi/kirim.ts
// POST /api/notifikasi/kirim
// Pengirim push notification kegiatan praktikum (sesi dibuka, jadwal berubah,
// keputusan izin) lewat backend Vercel dengan verifikasi Firebase ID Token & role.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  ambilDb,
  kirimNotifikasiKeUids,
  verifikasiBearerToken,
} from "../../lib/firebaseAdmin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method tidak diizinkan." });
  }

  try {
    const decoded = await verifikasiBearerToken(req);
    const db = ambilDb();
    const callerSnap = await db.doc(`users/${decoded.uid}`).get();
    const callerRole = callerSnap.data()?.role;
    if (callerRole !== "ASISTEN" && callerRole !== "ASLAB") {
      return res.status(403).json({ error: "Hanya Asprak/Aslab yang dapat mengirim notifikasi kegiatan." });
    }

    const jenis = typeof req.body?.jenis === "string" ? req.body.jenis : "";

    if (jenis === "sesi_dibuka" || jenis === "jadwal_berubah") {
      const sessionId =
        typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
      if (!sessionId || sessionId.includes("/")) {
        return res.status(400).json({ error: "Identitas sesi tidak valid." });
      }
      const sesiSnap = await db.doc(`sessions/${sessionId}`).get();
      if (!sesiSnap.exists) {
        return res.status(404).json({ error: "Sesi tidak ditemukan." });
      }
      const sesi = sesiSnap.data() ?? {};
      const classId = typeof sesi.classId === "string" ? sesi.classId : "";
      const kelasSnap = classId ? await db.doc(`classes/${classId}`).get() : null;
      const pesertaUids = Array.isArray(kelasSnap?.data()?.pesertaUids)
        ? (kelasSnap?.data()?.pesertaUids as string[])
        : [];
      const nama = typeof sesi.namaPraktikum === "string" ? sesi.namaPraktikum : "Praktikum";
      const modul = typeof sesi.modul === "string" ? sesi.modul : "";

      await kirimNotifikasiKeUids(pesertaUids, {
        title: jenis === "sesi_dibuka" ? "Sesi praktikum dibuka" : "Jadwal praktikum berubah",
        body:
          jenis === "sesi_dibuka"
            ? `${nama}${modul ? ` - ${modul}` : ""} sudah dibuka. Silakan presensi.`
            : `Jadwal ${nama}${modul ? ` - ${modul}` : ""} diperbarui. Periksa detail sesi.`,
        data: {
          type: jenis,
          sessionId,
          route:
            jenis === "sesi_dibuka"
              ? `/praktikan/presensi/${sessionId}`
              : `/praktikan/${sessionId}`,
        },
      });
      return res.status(200).json({ ok: true, terkirimKe: pesertaUids.length });
    }

    if (jenis === "izin_diputuskan") {
      const izinId = typeof req.body?.izinId === "string" ? req.body.izinId.trim() : "";
      if (!izinId || izinId.includes("/")) {
        return res.status(400).json({ error: "Identitas izin tidak valid." });
      }
      const izinSnap = await db.doc(`permissions/${izinId}`).get();
      if (!izinSnap.exists) {
        return res.status(404).json({ error: "Pengajuan izin tidak ditemukan." });
      }
      const izin = izinSnap.data() ?? {};
      const uidTarget = typeof izin.uid === "string" ? izin.uid : "";
      const status = izin.status === "approved" ? "diterima" : "ditolak";
      await kirimNotifikasiKeUids(uidTarget ? [uidTarget] : [], {
        title: `Pengajuan izin ${status}`,
        body:
          izin.status === "approved"
            ? "Pengajuan izin kamu diterima (excused absence, bebas denda)."
            : "Pengajuan izin kamu ditolak oleh asisten.",
        data: {
          type: "izin_diputuskan",
          izinId,
          route: "/praktikan/izin",
        },
      });
      return res.status(200).json({ ok: true, terkirimKe: uidTarget ? 1 : 0 });
    }

    return res.status(400).json({ error: "Jenis notifikasi tidak dikenal." });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("UNAUTHENTICATED:")) {
      return res.status(401).json({ error: error.message.replace("UNAUTHENTICATED:", "").trim() });
    }
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Gagal mengirim notifikasi.",
    });
  }
}
