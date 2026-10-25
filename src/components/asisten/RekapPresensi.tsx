import { StyleSheet, Text, View } from "react-native";
import type { Session, SessionStatus } from "../../context/DataSistem";
import { formatWaktuPresensi, hitungRekapPresensi } from "./dataRekapPresensi";

const pesanKosong: Record<SessionStatus, string> = {
  BELUM_DIBUKA:
    "Sesi belum dibuka. Rekap kehadiran akan tersedia setelah praktikan mulai melakukan presensi.",
  DIBUKA: "Belum ada praktikan yang melakukan presensi.",
  DITUTUP: "Tidak ada presensi yang tercatat pada sesi ini.",
};

export function RekapPresensi({ sesi }: { sesi: Session }) {
  const rekap = hitungRekapPresensi(sesi.presensi, sesi.totalPraktikan);

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        Rekap Kehadiran
      </Text>
      <Text style={styles.total}>
        Total praktikan terdaftar: {rekap.total ?? "belum tersedia"}
      </Text>
      <View accessibilityLiveRegion="polite" style={styles.summary}>
        <Text style={styles.ratio}>
          {rekap.total === null
            ? `${rekap.jumlahHadir} praktikan hadir`
            : `${rekap.jumlahHadir} dari ${rekap.total} praktikan hadir`}
        </Text>
        {rekap.persentase !== null ? (
          <>
            <Text style={styles.percentage}>
              {rekap.persentase}% Kehadiran
            </Text>
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
          </>
        ) : null}
        {rekap.jumlahIzin > 0 ? (
          <Text style={styles.secondary}>
            {rekap.jumlahIzin} praktikan izin, tidak dihitung sebagai hadir.
          </Text>
        ) : null}
      </View>

      {rekap.jumlahDiabaikan > 0 ? (
        <Text style={styles.warning}>
          {rekap.jumlahDiabaikan} catatan duplikat atau tidak valid tidak dihitung.
        </Text>
      ) : null}
      {rekap.total !== null && rekap.jumlahHadir > rekap.total ? (
        <Text style={styles.warning}>
          Jumlah hadir melebihi total praktikan. Data sesi perlu diperiksa.
        </Text>
      ) : null}

      {rekap.catatan.length === 0 ? (
        <Text accessibilityLiveRegion="polite" style={styles.empty}>
          {pesanKosong[sesi.status]}
        </Text>
      ) : (
        <View style={styles.list}>
          {rekap.catatan.map(({ key, presensi }) => {
            const hadir = presensi.statusKehadiran === "Hadir";
            return (
              <View key={key} style={styles.student}>
                <Text style={styles.name}>
                  {presensi.nama?.trim() || "Nama tidak tersedia"}
                </Text>
                <Text style={styles.secondary}>
                  {presensi.nim?.trim() || "NIM belum tersedia"}
                </Text>
                <View style={styles.recordMeta}>
                  <Text
                    style={[
                      styles.attendanceBadge,
                      hadir ? styles.present : styles.excused,
                    ]}
                  >
                    {presensi.statusKehadiran}
                  </Text>
                  <Text style={styles.time}>
                    Waktu presensi: {formatWaktuPresensi(presensi.waktu)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 20,
  },
  title: { color: "#0F172A", fontSize: 17, lineHeight: 26, fontWeight: "700" },
  total: { color: "#64748B", fontSize: 13, lineHeight: 22, marginTop: 6 },
  summary: { marginTop: 20, gap: 8 },
  ratio: { color: "#0F172A", fontSize: 20, lineHeight: 28, fontWeight: "700" },
  percentage: { color: "#4338CA", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  track: { height: 6, backgroundColor: "#E0E7FF", borderRadius: 3, overflow: "hidden" },
  progress: { height: 6, backgroundColor: "#6366F1", borderRadius: 3 },
  secondary: { color: "#64748B", fontSize: 13, lineHeight: 22 },
  warning: { color: "#92400E", fontSize: 13, lineHeight: 22, marginTop: 14 },
  empty: { color: "#64748B", fontSize: 14, lineHeight: 23, marginTop: 20 },
  list: { marginTop: 12 },
  student: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 16,
    marginTop: 16,
    gap: 4,
  },
  name: { color: "#0F172A", fontSize: 15, lineHeight: 24, fontWeight: "600" },
  recordMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 6 },
  attendanceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  present: { color: "#166534", backgroundColor: "#DCFCE7" },
  excused: { color: "#92400E", backgroundColor: "#FEF3C7" },
  time: { color: "#475569", fontSize: 13, lineHeight: 22, flexShrink: 1 },
});