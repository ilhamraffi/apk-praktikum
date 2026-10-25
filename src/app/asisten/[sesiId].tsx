import { Link, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InformasiSesi } from "../../components/asisten/InformasiSesi";
import { StatusSesi } from "../../components/asisten/StatusSesi";
import { PembukaanSesi } from "../../components/asisten/PembukaanSesi";
import { PenutupanSesi } from "../../components/asisten/PenutupanSesi";
import { RekapPresensi } from "../../components/asisten/RekapPresensi";
import { useAttendance } from "../../context/DataSistem";

export default function DetailSesiAsistenScreen() {
  const { sesiId } = useLocalSearchParams<{ sesiId?: string | string[] }>();
  const { sessions } = useAttendance();
  const id = typeof sesiId === "string" ? sesiId.trim() : undefined;
  const sesi = id ? sessions.find((item) => item.id === id) : undefined;
  const modul = sesi?.modul?.trim();

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Link href="/asisten" dismissTo asChild>
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel="Kembali ke jadwal praktikum"
            activeOpacity={0.75}
            style={styles.backButton}
          >
            <Text accessible={false} style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Kembali ke jadwal</Text>
          </TouchableOpacity>
        </Link>

        {sesi ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>DETAIL SESI</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {sesi.namaPraktikum?.trim() || "Praktikum"}
              </Text>
              {modul ? <Text style={styles.subtitle}>{modul}</Text> : null}
              <View style={styles.status}>
                <StatusSesi status={sesi.status} />
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Informasi praktikum
              </Text>
              <InformasiSesi sesi={sesi} />
            </View>

            {sesi.status !== "DITUTUP" ? (
              <PembukaanSesi key={`pembukaan-${sesi.id}`} sesi={sesi} />
            ) : null}
            <PenutupanSesi key={`penutupan-${sesi.id}`} sesi={sesi} />
            <RekapPresensi sesi={sesi} />
          </>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.eyebrow}>SESI PRAKTIKUM</Text>
            <Text accessibilityRole="header" style={styles.emptyTitle}>
              Sesi tidak ditemukan
            </Text>
            <Text style={styles.subtitle}>
              Jadwal yang Anda cari tidak tersedia. Kembali ke daftar untuk
              memilih sesi lain.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: "flex-start",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    marginLeft: -8,
    marginBottom: 24,
    borderRadius: 12,
  },
  backArrow: { color: "#4338CA", fontSize: 28, lineHeight: 32 },
  backText: { flexShrink: 1, color: "#4338CA", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  hero: { marginBottom: 28 },
  eyebrow: { color: "#4338CA", fontSize: 12, lineHeight: 20, fontWeight: "700", letterSpacing: 1 },
  title: { color: "#0F172A", fontSize: 28, lineHeight: 38, fontWeight: "700", marginTop: 10 },
  subtitle: { color: "#64748B", fontSize: 15, lineHeight: 24, marginTop: 10 },
  status: { marginTop: 20 },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: { color: "#0F172A", fontSize: 17, lineHeight: 26, fontWeight: "700", marginBottom: 22 },
  emptyTitle: { color: "#0F172A", fontSize: 22, lineHeight: 30, fontWeight: "700", marginTop: 10 },
});