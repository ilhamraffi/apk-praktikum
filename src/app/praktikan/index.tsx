import { Link } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KartuJadwalPraktikan } from "../../components/praktikan/KartuJadwal";
import { useAttendance } from "../../context/DataSistem";

export default function JadwalPraktikanScreen() {
  const { currentUser, sessions } = useAttendance();

  return (
    <SafeAreaView style={styles.page}>
      <FlatList
        data={sessions}
        keyExtractor={(sesi) => sesi.id}
        renderItem={({ item }) => <KartuJadwalPraktikan sesi={item} />}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}><Text style={styles.brandLetter}>H</Text></View>
              <View style={styles.brandText}>
                <Text style={styles.brandName}>HadirLab</Text>
                <Text style={styles.brandCaption}>Ruang praktikan</Text>
              </View>
              <Link href="/" dismissTo asChild>
                <TouchableOpacity style={styles.dashboardButton} accessibilityRole="link">
                  <Text style={styles.dashboardText}>{currentUser ? "Dashboard" : "Masuk"}</Text>
                </TouchableOpacity>
              </Link>
            </View>
            <View style={styles.headingRow}>
              <Text accessibilityRole="header" style={styles.title}>Jadwal saya</Text>
              <View style={styles.countBadge}><Text style={styles.countText}>{sessions.length} sesi</Text></View>
            </View>
            <Text style={styles.subtitle}>Pilih sesi untuk melihat detail dan riwayat kehadiranmu.</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text accessibilityRole="header" style={styles.emptyTitle}>Belum ada jadwal</Text>
            <Text style={styles.emptyText}>Jadwal praktikum akan ditampilkan di sini setelah tersedia.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.historyCard}>
            <Text accessibilityRole="header" style={styles.historyTitle}>Riwayat kehadiran saya</Text>
            {sessions.flatMap((sesi) =>
              sesi.presensi
                .filter((record) => record.userId === currentUser?.id)
                .map((record) => (
                  <View key={`${sesi.id}-${record.waktu}`} style={styles.historyRow}>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historySession}>{sesi.namaPraktikum}</Text>
                      <Text style={styles.historyTime}>{record.waktu}</Text>
                    </View>
                    <Text style={styles.historyStatus}>{record.statusKehadiran}</Text>
                  </View>
                )),
            ).length > 0 ? null : (
              <Text style={styles.emptyText}>Belum ada catatan kehadiran.</Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flexGrow: 1, width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, paddingBottom: 32 },
  separator: { height: 16 },
  header: { marginBottom: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 32 },
  brandMark: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#1E1B4B", alignItems: "center", justifyContent: "center" },
  brandLetter: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  brandText: { flex: 1 },
  brandName: { color: "#0F172A", fontSize: 18, lineHeight: 24, fontWeight: "700" },
  brandCaption: { color: "#64748B", fontSize: 13, lineHeight: 20 },
  dashboardButton: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  dashboardText: { color: "#4338CA", fontSize: 13, lineHeight: 20, fontWeight: "600" },
  headingRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 10 },
  title: { color: "#0F172A", fontSize: 28, lineHeight: 36, fontWeight: "700" },
  countBadge: { backgroundColor: "#E0E7FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  countText: { color: "#3730A3", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  subtitle: { color: "#64748B", fontSize: 15, lineHeight: 24 },
  emptyCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 24, gap: 10 },
  emptyTitle: { color: "#0F172A", fontSize: 18, lineHeight: 26, fontWeight: "700" },
  emptyText: { color: "#64748B", fontSize: 15, lineHeight: 24 },
  historyCard: { marginTop: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 20, gap: 14 },
  historyTitle: { color: "#0F172A", fontSize: 17, lineHeight: 26, fontWeight: "700" },
  historyRow: { borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  historyInfo: { flex: 1, gap: 2 },
  historySession: { color: "#0F172A", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  historyTime: { color: "#64748B", fontSize: 13, lineHeight: 20 },
  historyStatus: { color: "#166534", backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 12, fontWeight: "700" },
});
