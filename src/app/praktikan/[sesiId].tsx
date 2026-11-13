// src/app/praktikan/[sesiId].tsx
// NOTE: adaptasi minimal ke Sprint 2. Alur presensi & riwayat praktikan
// (SRS-03, 04, 05) menjadi tanggung jawab Fauzan.
import { Link, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InformasiSesi } from "../../components/asisten/InformasiSesi";
import { StatusSesi } from "../../components/asisten/StatusSesi";
import { Loading } from "../../components/shared/StatusLayar";
import { useAuth } from "../../context/AuthContext";
import { useSesiDetail } from "../../hooks/useSesi";

export default function DetailSesiPraktikanScreen() {
  const { sesiId } = useLocalSearchParams<{ sesiId?: string | string[] }>();
  const id = typeof sesiId === "string" ? sesiId.trim() : undefined;
  const { user, loading: loadingAuth } = useAuth();
  const { sesi, kelas, loading } = useSesiDetail(id);

  if (loadingAuth || (loading && !sesi)) {
    return (
      <SafeAreaView style={styles.page}>
        <Loading />
      </SafeAreaView>
    );
  }

  const kelasLabel = kelas ? `${kelas.nama} (${kelas.kode})` : undefined;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Link href="/praktikan/index" replace asChild>
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
              <InformasiSesi sesi={sesi} kelasLabel={kelasLabel} />
            </View>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Presensi</Text>
              <Text style={styles.message}>
                {user
                  ? "Fitur presensi praktikan sedang disiapkan (bagian Fauzan)."
                  : "Silakan masuk untuk melakukan presensi."}
              </Text>
            </View>
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
  message: { color: "#64748B", fontSize: 14, lineHeight: 23 },
});
