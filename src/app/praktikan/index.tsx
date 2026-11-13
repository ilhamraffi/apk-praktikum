// src/app/praktikan/index.tsx
// NOTE: adaptasi minimal ke Sprint 2. Pemfilteran jadwal per kelas praktikan
// dan riwayat kehadiran menjadi tanggung jawab Fauzan.
import { Link } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KartuJadwalPraktikan } from "../../components/praktikan/KartuJadwal";
import { Empty, Loading } from "../../components/shared/StatusLayar";
import { useAuth } from "../../context/AuthContext";
import { useDaftarKelas } from "../../hooks/useKelas";
import { useDaftarSesi } from "../../hooks/useSesi";

export default function JadwalPraktikanScreen() {
  const { user, loading: loadingAuth } = useAuth();
  const { sesi, loading } = useDaftarSesi();
  const { mapKelas } = useDaftarKelas();

  if (loadingAuth) {
    return (
      <SafeAreaView style={styles.page}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.denied}>
          <Text style={styles.deniedTitle}>Belum masuk</Text>
          <Text style={styles.deniedText}>Silakan masuk terlebih dahulu.</Text>
          <Link href="/" asChild>
            <TouchableOpacity style={styles.deniedBtn}>
              <Text style={styles.deniedBtnText}>Ke halaman masuk</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  const labelKelas = (classId: string) => {
    const k = mapKelas.get(classId);
    return k ? `${k.nama} (${k.kode})` : undefined;
  };

  return (
    <SafeAreaView style={styles.page}>
      <FlatList
        data={sesi}
        keyExtractor={(item) => item.id ?? ""}
        renderItem={({ item }) => (
          <KartuJadwalPraktikan sesi={item} kelasLabel={labelKelas(item.classId)} />
        )}
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
                  <Text style={styles.dashboardText}>Dashboard</Text>
                </TouchableOpacity>
              </Link>
            </View>
            <View style={styles.headingRow}>
              <Text accessibilityRole="header" style={styles.title}>Jadwal saya</Text>
              <View style={styles.countBadge}><Text style={styles.countText}>{sesi.length} sesi</Text></View>
            </View>
            <Text style={styles.subtitle}>Pilih sesi untuk melihat detail.</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : (
            <Empty
              title="Belum ada jadwal"
              description="Jadwal praktikum akan ditampilkan di sini setelah tersedia."
            />
          )
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
  denied: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  deniedTitle: { color: "#0F172A", fontSize: 22, fontWeight: "700" },
  deniedText: { color: "#64748B", fontSize: 15, lineHeight: 24, textAlign: "center" },
  deniedBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: "#4338CA" },
  deniedBtnText: { color: "#FFFFFF", fontWeight: "700" },
});
