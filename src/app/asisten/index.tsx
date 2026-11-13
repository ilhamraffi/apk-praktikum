import { Link } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormSesi } from "../../components/asisten/FormSesi";
import { KartuJadwal } from "../../components/asisten/KartuJadwal";
import {
  Empty,
  ErrorBanner,
  Loading,
} from "../../components/shared/StatusLayar";
import { useWajibAsisten } from "../../hooks/useWajibAsisten";
import { useDaftarKelas } from "../../hooks/useKelas";
import { buatSesi, useDaftarSesi } from "../../hooks/useSesi";

export default function JadwalAsistenScreen() {
  const { loading: loadingAuth, boleh } = useWajibAsisten();
  const { sesi, loading, error } = useDaftarSesi();
  const { mapKelas } = useDaftarKelas();
  const [formTerbuka, setFormTerbuka] = useState(false);

  if (loadingAuth) {
    return (
      <SafeAreaView style={styles.page}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (!boleh) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.denied}>
          <Text style={styles.deniedTitle}>Akses ditolak</Text>
          <Text style={styles.deniedText}>
            Halaman ini hanya untuk asisten. Silakan masuk sebagai asisten.
          </Text>
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
          <KartuJadwal sesi={item} kelasLabel={labelKelas(item.classId)} />
        )}
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
                <TouchableOpacity accessibilityRole="link" style={styles.dashboardButton}>
                  <Text style={styles.dashboardText}>Dashboard</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <View style={styles.headingRow}>
              <Text accessibilityRole="header" style={styles.title}>
                Jadwal praktikum
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{sesi.length} sesi</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Kelola sesi praktikum: buka/tutup sesi dan pantau rekap kehadiran.
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setFormTerbuka(true)}
              >
                <Text style={styles.primaryText}>Tambah sesi</Text>
              </TouchableOpacity>
              <Link href="/asisten/kelas" asChild>
                <TouchableOpacity accessibilityRole="link" style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>Kelola kelas & peserta</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {error ? <ErrorBanner message={error} /> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : (
            <Empty
              title="Belum ada jadwal"
              description="Tambahkan sesi praktikum untuk memulai."
            />
          )
        }
      />

      {formTerbuka ? (
        <FormSesi
          daftarKelas={Array.from(mapKelas.values())}
          onBatal={() => setFormTerbuka(false)}
          onSimpan={buatSesi}
        />
      ) : null}
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
  headingRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 10 },
  title: { color: "#0F172A", fontSize: 28, lineHeight: 36, fontWeight: "700" },
  countBadge: { backgroundColor: "#E0E7FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  countText: { color: "#3730A3", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  subtitle: { color: "#64748B", fontSize: 15, lineHeight: 24 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  primaryBtn: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#4338CA", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  secondaryBtn: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#4338CA", fontSize: 14, fontWeight: "600" },
  denied: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  deniedTitle: { color: "#0F172A", fontSize: 22, fontWeight: "700" },
  deniedText: { color: "#64748B", fontSize: 15, lineHeight: 24, textAlign: "center" },
  deniedBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: "#4338CA" },
  deniedBtnText: { color: "#FFFFFF", fontWeight: "700" },
});
