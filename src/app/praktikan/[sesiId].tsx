import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InformasiSesi } from "../../components/asisten/InformasiSesi";
import { StatusSesi } from "../../components/asisten/StatusSesi";
import { FormPresensi } from "../../components/praktikan/FormPresensi";
import { useAttendance } from "../../context/DataSistem";

export default function DetailSesiPraktikanScreen() {
  const { sesiId } = useLocalSearchParams<{ sesiId?: string | string[] }>();
  const { currentUser, sessions, catatPresensi } = useAttendance();
  const [formVisible, setFormVisible] = useState(false);
  const id = Array.isArray(sesiId)
    ? sesiId[0]?.trim()
    : typeof sesiId === "string"
      ? sesiId.trim()
      : undefined;
  const sesi = id ? sessions.find((item) => item.id === id) : undefined;
  const catatanSaya = sesi?.presensi.find((item) => item.userId === currentUser?.id);
  const dapatPresensi = Boolean(sesi && sesi.status === "DIBUKA" && !catatanSaya);

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Link href="/praktikan/index" dismissTo asChild>
          <TouchableOpacity style={styles.backButton} accessibilityRole="link">
            <Text accessible={false} style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Kembali ke jadwal</Text>
          </TouchableOpacity>
        </Link>
        {sesi ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>DETAIL SESI</Text>
              <Text accessibilityRole="header" style={styles.title}>{sesi.namaPraktikum}</Text>
              <Text style={styles.subtitle}>{sesi.modul}</Text>
              <View style={styles.status}><StatusSesi status={sesi.status} /></View>
            </View>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Informasi praktikum</Text>
              <InformasiSesi sesi={sesi} />
            </View>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Status presensi saya</Text>
              {catatanSaya ? (
                <View style={styles.successBox}>
                  <Text style={styles.successTitle}>Presensi sudah tercatat</Text>
                  <Text style={styles.successText}>Waktu hadir: {catatanSaya.waktu}</Text>
                  <Text style={styles.successText}>Status: {catatanSaya.statusKehadiran}</Text>
                </View>
              ) : sesi.status === "BELUM_DIBUKA" ? (
                <Text style={styles.message}>Sesi belum dibuka. Tunggu sampai asisten membuka presensi.</Text>
              ) : sesi.status === "DITUTUP" ? (
                <Text style={styles.message}>Sesi sudah ditutup. Presensi tidak dapat dilakukan.</Text>
              ) : (
                <View style={styles.openBox}>
                  <Text style={styles.message}>Presensi tersedia. Isi form sebelum sesi ditutup.</Text>
                  <TouchableOpacity onPress={() => setFormVisible(true)} style={styles.primaryButton}>
                    <Text style={styles.primaryText}>Isi presensi</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Riwayat kehadiran saya</Text>
              {sesi.presensi.filter((item) => item.userId === currentUser?.id).length > 0 ? (
                <View style={styles.historyRow}>
                  <Text style={styles.historyStatus}>{catatanSaya?.statusKehadiran}</Text>
                  <Text style={styles.message}>{catatanSaya?.waktu}</Text>
                </View>
              ) : (
                <Text style={styles.message}>Belum ada catatan kehadiran untuk sesi ini.</Text>
              )}
            </View>
            <FormPresensi
              sesi={sesi}
              visible={formVisible && dapatPresensi}
              onClose={() => setFormVisible(false)}
              onSubmit={(status, catatan) => catatPresensi(sesi.id, status, catatan)}
            />
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>SESI PRAKTIKUM</Text>
            <Text accessibilityRole="header" style={styles.title}>Sesi tidak ditemukan</Text>
            <Text style={styles.subtitle}>Jadwal yang Anda cari tidak tersedia.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flexGrow: 1, width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, paddingBottom: 32 },
  backButton: { alignSelf: "flex-start", minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, marginLeft: -8, marginBottom: 24, borderRadius: 12 },
  backArrow: { color: "#4338CA", fontSize: 28, lineHeight: 32 },
  backText: { color: "#4338CA", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  hero: { marginBottom: 28 },
  eyebrow: { color: "#4338CA", fontSize: 12, lineHeight: 20, fontWeight: "700", letterSpacing: 1 },
  title: { color: "#0F172A", fontSize: 28, lineHeight: 38, fontWeight: "700", marginTop: 10 },
  subtitle: { color: "#64748B", fontSize: 15, lineHeight: 24, marginTop: 10 },
  status: { marginTop: 20 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 20, marginBottom: 16 },
  sectionTitle: { color: "#0F172A", fontSize: 17, lineHeight: 26, fontWeight: "700", marginBottom: 18 },
  successBox: { backgroundColor: "#F0FDF4", borderRadius: 14, padding: 14, gap: 4 },
  successTitle: { color: "#166534", fontSize: 16, lineHeight: 24, fontWeight: "700" },
  successText: { color: "#166534", fontSize: 14, lineHeight: 22 },
  openBox: { gap: 14 },
  message: { color: "#64748B", fontSize: 14, lineHeight: 23 },
  primaryButton: { minHeight: 50, borderRadius: 12, backgroundColor: "#1E1B4B", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  historyStatus: { color: "#166534", backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 12, fontWeight: "700" },
});
