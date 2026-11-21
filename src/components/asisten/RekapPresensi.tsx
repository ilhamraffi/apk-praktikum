// src/components/asisten/RekapPresensi.tsx
import { StyleSheet, Text, View } from "react-native";
import type { CatatanPresensi, SessionStatus } from "../../types";
import { ErrorBanner, Loading } from "../shared/StatusLayar";
import { formatJarakPresensi, formatWaktuPresensi, hitungRekapPresensi } from "./dataRekapPresensi";
import { radius, warna } from "../../theme";

const pesanKosong: Record<SessionStatus, string> = {
  BELUM_DIBUKA:
    "Sesi belum dibuka. Rekap kehadiran akan tersedia setelah praktikan mulai melakukan presensi.",
  DIBUKA: "Belum ada praktikan yang melakukan presensi.",
  DITUTUP: "Tidak ada presensi yang tercatat pada sesi ini.",
};

type RekapPresensiProps = {
  catatan: CatatanPresensi[];
  totalPraktikan: number;
  status: SessionStatus;
  loading?: boolean;
  error?: string | null;
};

export function RekapPresensi({
  catatan,
  totalPraktikan,
  status,
  loading,
  error,
}: RekapPresensiProps) {
  const rekap = hitungRekapPresensi(catatan, totalPraktikan);
  const alpa =
    rekap.total !== null
      ? Math.max(0, rekap.total - rekap.jumlahHadir - rekap.jumlahIzin)
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.title}>
          Rekap Kehadiran
        </Text>
        <Text style={styles.ratioBadge}>
          {rekap.total === null
            ? `${rekap.jumlahHadir} hadir`
            : `${rekap.jumlahHadir} / ${rekap.total}`}
        </Text>
      </View>

      {loading ? (
        <Loading label="Memuat presensi..." />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <View accessibilityLiveRegion="polite" style={styles.summary}>
            {rekap.persentase !== null ? (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Persentase kehadiran"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.min(rekap.persentase, 100),
                  text: `${rekap.persentase}% kehadiran`,
                }}
                style={styles.track}
              >
                <View
                  style={[
                    styles.progress,
                    { width: `${Math.min(rekap.persentase, 100)}%` },
                  ]}
                />
              </View>
            ) : null}

            <View style={styles.statGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{rekap.jumlahHadir}</Text>
                <Text style={styles.statLabel}>Hadir</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{rekap.jumlahIzin}</Text>
                <Text style={styles.statLabel}>Izin</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{alpa ?? "-"}</Text>
                <Text style={styles.statLabel}>Belum hadir</Text>
              </View>
            </View>
          </View>

          {rekap.jumlahDiabaikan > 0 ? (
            <Text style={styles.warning}>
              {rekap.jumlahDiabaikan} catatan duplikat atau tidak valid tidak
              dihitung.
            </Text>
          ) : null}
          {rekap.total !== null && rekap.jumlahHadir > rekap.total ? (
            <Text style={styles.warning}>
              Jumlah hadir melebihi total praktikan. Data sesi perlu diperiksa.
            </Text>
          ) : null}

          {rekap.catatan.length === 0 ? (
            <Text accessibilityLiveRegion="polite" style={styles.empty}>
              {pesanKosong[status]}
            </Text>
          ) : (
            <View style={styles.list}>
              {rekap.catatan.map(({ key, presensi }, idx) => {
                const hadir = presensi.statusKehadiran === "Hadir";
                return (
                  <View
                    key={key}
                    style={[styles.student, idx === 0 && styles.studentFirst]}
                  >
                    <View style={styles.studentInfo}>
                      <Text style={styles.name}>
                        {presensi.nama?.trim() || "Nama tidak tersedia"}
                      </Text>
                      <Text style={styles.secondary}>
                        {presensi.nim?.trim() || "NIM belum tersedia"} ·{" "}
                        {formatWaktuPresensi(presensi.waktu)}
                      </Text>
                      {typeof presensi.jarakMeter === "number" &&
                      Number.isFinite(presensi.jarakMeter) ? (
                        <Text style={styles.location}>
                          Jarak ke lab: {formatJarakPresensi(presensi.jarakMeter)}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.attendanceBadge,
                        hadir ? styles.present : styles.excused,
                      ]}
                    >
                      {presensi.statusKehadiran}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    backgroundColor: warna.kartuKaca,
    borderWidth: 1,
    borderColor: warna.garis,
    borderRadius: radius.kartu,
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { color: warna.teks, fontSize: 18, lineHeight: 26, fontWeight: "800" },
  ratioBadge: { color: warna.teks, fontSize: 18, fontWeight: "800" },
  summary: { marginTop: 14, gap: 14 },
  track: {
    height: 8,
    backgroundColor: warna.permukaan,
    borderRadius: 4,
    overflow: "hidden",
  },
  progress: { height: 8, backgroundColor: warna.utama, borderRadius: 4 },
  statGrid: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: warna.permukaanLembut,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 2,
  },
  statNumber: { color: warna.teks, fontSize: 22, fontWeight: "800" },
  statLabel: { color: warna.teksRedup, fontSize: 12 },
  secondary: { color: warna.teksRedup, fontSize: 13, lineHeight: 20 },
  warning: { color: warna.peringatanTeks, fontSize: 13, lineHeight: 22, marginTop: 14 },
  empty: { color: warna.teksRedup, fontSize: 14, lineHeight: 23, marginTop: 20 },
  list: { marginTop: 16 },
  student: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: warna.garis,
    paddingTop: 14,
    marginTop: 14,
  },
  studentFirst: {
    borderTopWidth: 0,
    paddingTop: 4,
    marginTop: 0,
  },
  studentInfo: { flex: 1, gap: 2 },
  name: { color: warna.teks, fontSize: 16, lineHeight: 22, fontWeight: "700" },
  location: { color: warna.teksRedup, fontSize: 12, lineHeight: 18 },
  attendanceBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pil,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    overflow: "hidden",
  },
  present: { color: warna.suksesTeks, backgroundColor: warna.suksesLatar },
  excused: { color: warna.peringatanTeks, backgroundColor: warna.peringatanLatar },
});