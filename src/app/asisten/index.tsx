import { Link } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KartuJadwal } from "../../components/asisten/KartuJadwal";
import { useAttendance } from "../../context/DataSistem";

export default function JadwalAsistenScreen() {
  const { currentUser, sessions } = useAttendance();

  return (
    <SafeAreaView style={styles.page}>
      <FlatList
        data={sessions}
        keyExtractor={(sesi) => sesi.id}
        renderItem={({ item }) => <KartuJadwal sesi={item} />}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Text style={styles.brandLetter}>H</Text>
              </View>
              <View style={styles.brandText}>
                <Text style={styles.brandName}>HadirLab</Text>
                <Text style={styles.brandCaption}>Ruang asisten</Text>
              </View>
              <Link href="/" dismissTo asChild>
                <TouchableOpacity
                  accessibilityRole="link"
                  accessibilityLabel={currentUser ? "Kembali ke dashboard" : "Ke halaman masuk"}
                  activeOpacity={0.75}
                  style={styles.dashboardButton}
                >
                  <Text style={styles.dashboardText}>
                    {currentUser ? "Dashboard" : "Masuk"}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
            <View style={styles.headingRow}>
              <Text accessibilityRole="header" style={styles.title}>
                Jadwal praktikum
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{sessions.length} sesi</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Pilih sesi untuk melihat informasi praktikum.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View accessibilityLiveRegion="polite" style={styles.emptyCard}>
            <Text accessibilityRole="header" style={styles.emptyTitle}>
              Belum ada jadwal
            </Text>
            <Text style={styles.emptyText}>
              Jadwal praktikum akan ditampilkan di sini setelah tersedia.
            </Text>
          </View>
        }
      />
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
  separator: { height: 16 },
  header: { marginBottom: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 32 },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#1E1B4B",
    alignItems: "center",
    justifyContent: "center",
  },
  brandLetter: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  brandText: { flex: 1 },
  dashboardButton: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  dashboardText: { color: "#4338CA", fontSize: 13, lineHeight: 20, fontWeight: "600" },
  brandName: { color: "#0F172A", fontSize: 18, lineHeight: 24, fontWeight: "700" },
  brandCaption: { color: "#64748B", fontSize: 13, lineHeight: 20 },
  headingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  title: { color: "#0F172A", fontSize: 28, lineHeight: 36, fontWeight: "700" },
  countBadge: { backgroundColor: "#E0E7FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  countText: { color: "#3730A3", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  subtitle: { color: "#64748B", fontSize: 15, lineHeight: 24 },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 24,
    gap: 10,
  },
  emptyTitle: { color: "#0F172A", fontSize: 18, lineHeight: 26, fontWeight: "700" },
  emptyText: { color: "#64748B", fontSize: 15, lineHeight: 24 },
});