// SRS-04 praktikan — riwayat pribadi pada sesi kelas yang masih dapat diakses.
import { Link } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RingkasanPresensi } from "../../components/praktikan/RingkasanPresensi";
import { Empty, ErrorBanner, Loading } from "../../components/shared/StatusLayar";
import { useAuth } from "../../context/AuthContext";
import { useJadwalPraktikan } from "../../hooks/useJadwalPraktikan";
import { usePresensiPraktikan } from "../../hooks/usePresensiPraktikan";

export default function RiwayatPraktikanScreen() {
  const { user, role, loading: loadingAuth } = useAuth();
  const uid = !loadingAuth && role === "PRAKTIKAN" ? user?.uid : undefined;
  const jadwal = useJadwalPraktikan(uid);
  const ids = !jadwal.loading && !jadwal.error ? jadwal.sesi.flatMap((sesi) => sesi.id ? [sesi.id] : []) : [];
  const hasil = usePresensiPraktikan(uid, ids);

  if (loadingAuth) return <SafeAreaView style={styles.page}><Loading /></SafeAreaView>;
  if (!user || role !== "PRAKTIKAN" || !user.uid) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.content}>
          <Empty title={!user ? "Belum masuk" : "Akses tidak tersedia"} description="Riwayat ini hanya tersedia untuk akun praktikan yang sudah masuk dengan profil lengkap." />
          <Link href="/" replace asChild>
            <TouchableOpacity style={styles.button} accessibilityRole="link"><Text style={styles.buttonText}>{user ? "Ke dashboard" : "Ke halaman masuk"}</Text></TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  const error = jadwal.error ?? hasil.error;
  const loading = jadwal.loading || hasil.loading;
  const riwayat = jadwal.sesi.flatMap((sesi) => {
    const presensi = sesi.id ? hasil.catatan.get(sesi.id) : undefined;
    return presensi && sesi.id ? [{ sesi, presensi, id: sesi.id }] : [];
  });

  return (
    <SafeAreaView style={styles.page}>
      <FlatList
        data={error || loading ? [] : riwayat}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Link href="/praktikan" replace asChild>
              <TouchableOpacity style={styles.button} accessibilityRole="link"><Text style={styles.buttonText}>‹ Kembali ke jadwal</Text></TouchableOpacity>
            </Link>
            <Text accessibilityRole="header" style={styles.title}>Riwayat kehadiran</Text>
            <Text style={styles.subtitle}>Kehadiranmu pada sesi kelas yang saat ini kamu ikuti.</Text>
            {(jadwal.dariCache || hasil.dariCache) && !error ? (
              <Text accessibilityRole="status" style={styles.cacheNotice}>Menampilkan data tersimpan di perangkat. Data terbaru akan dimuat saat terhubung ke server.</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const kelas = jadwal.mapKelas.get(item.sesi.classId);
          return (
            <View style={styles.card}>
              <Text style={styles.sessionTitle}>{item.sesi.namaPraktikum}</Text>
              <Text style={styles.subtitle}>{kelas ? `${kelas.nama} (${kelas.kode})` : "Kelas tidak tersedia"} · {item.sesi.modul}</Text>
              <RingkasanPresensi presensi={item.presensi} tertunda={hasil.tertunda.has(item.id)} />
              <Link href={{ pathname: "/praktikan/[sesiId]", params: { sesiId: item.id } }} asChild>
                <TouchableOpacity style={styles.button} accessibilityRole="link"><Text style={styles.buttonText}>Lihat sesi</Text></TouchableOpacity>
              </Link>
            </View>
          );
        }}
        ListEmptyComponent={error ? (
          <View style={styles.feedback}>
            <ErrorBanner message={error} />
            <TouchableOpacity onPress={() => { jadwal.cobaLagi(); hasil.cobaLagi(); }} style={styles.button} accessibilityRole="button">
              <Text style={styles.buttonText}>Coba lagi</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <Loading label="Memuat riwayat kehadiranmu..." />
        ) : (
          <Empty title="Belum ada riwayat kehadiran" description={jadwal.kelas.length ? "Kehadiran yang tersimpan akan ditampilkan di sini." : "Kamu belum terdaftar sebagai peserta kelas. Hubungi asisten."} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flexGrow: 1, width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, paddingBottom: 32 },
  header: { gap: 10, marginBottom: 24 },
  title: { color: "#0F172A", fontSize: 28, lineHeight: 36, fontWeight: "700" },
  subtitle: { color: "#64748B", fontSize: 14, lineHeight: 23 },
  card: { padding: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, gap: 14 },
  sessionTitle: { color: "#0F172A", fontSize: 19, lineHeight: 28, fontWeight: "700" },
  button: { alignSelf: "flex-start", minHeight: 48, justifyContent: "center", paddingHorizontal: 8 },
  buttonText: { color: "#4338CA", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  separator: { height: 16 },
  feedback: { gap: 12 },
  cacheNotice: { color: "#92400E", fontSize: 13, lineHeight: 21 },
});
