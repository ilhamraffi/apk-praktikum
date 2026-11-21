// SRS-04 praktikan — riwayat pribadi pada sesi kelas yang masih dapat diakses.
import { Link } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RingkasanPresensi } from "../../components/praktikan/RingkasanPresensi";
import { Empty, ErrorBanner, Loading } from "../../components/shared/StatusLayar";
import { useAuth } from "../../context/AuthContext";
import { useJadwalPraktikan } from "../../hooks/useJadwalPraktikan";
import { usePresensiPraktikan } from "../../hooks/usePresensiPraktikan";
import { warna } from "../../theme";

export default function RiwayatPraktikanScreen() {
  const { user, role, loading: loadingAuth } = useAuth();
  const uid = !loadingAuth && role === "PRAKTIKAN" ? user?.uid : undefined;
  const jadwal = useJadwalPraktikan(uid);
  const ids = !jadwal.loading && !jadwal.error ? jadwal.sesi.flatMap((sesi) => sesi.id ? [sesi.id] : []) : [];
  const hasil = usePresensiPraktikan(uid, ids);

  if (loadingAuth) return <SafeAreaView style={styles.page} edges={["top"]}><Loading /></SafeAreaView>;
  if (!user || role !== "PRAKTIKAN" || !user.uid) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        <View style={styles.content}>
          <Empty title={!user ? "Belum masuk" : "Akses tidak tersedia"} description="Riwayat ini hanya tersedia untuk akun praktikan yang sudah masuk dengan profil lengkap." />
          <Link href="/" replace asChild>
            <TouchableOpacity style={styles.button} accessibilityRole="link"><Text style={styles.buttonText}>{user ? "Kembali" : "Ke halaman masuk"}</Text></TouchableOpacity>
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
  const jumlahHadir = riwayat.filter((r) => r.presensi.statusKehadiran === "Hadir").length;
  const tingkat = jadwal.sesi.length > 0 ? `${Math.round((jumlahHadir / jadwal.sesi.length) * 100)}%` : "0%";

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <FlatList
        data={error || loading ? [] : riwayat}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topBar}>
              <Link href="/praktikan" replace asChild>
                <TouchableOpacity style={styles.backCircle} accessibilityRole="link" accessibilityLabel="Kembali ke jadwal">
                  <Text accessible={false} style={styles.backArrow}>‹</Text>
                </TouchableOpacity>
              </Link>
              <Text accessibilityRole="header" style={styles.topTitle}>Riwayat presensi</Text>
            </View>
            <Text style={styles.title}>Jejak kehadiranmu</Text>
            <Text style={styles.subtitle}>Kehadiranmu pada sesi kelas yang saat ini kamu ikuti.</Text>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{jumlahHadir}</Text>
                <Text style={styles.statLabel}>Kehadiran</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{tingkat}</Text>
                <Text style={styles.statLabel}>Tingkat kehadiran</Text>
              </View>
            </View>
            {(jadwal.dariCache || hasil.dariCache) && !error ? (
              <Text style={styles.cacheNotice}>Menampilkan data tersimpan di perangkat. Data terbaru akan dimuat saat terhubung ke server.</Text>
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
                <TouchableOpacity style={styles.detailButton} accessibilityRole="link">
                  <Text style={styles.buttonText}>Lihat sesi</Text>
                </TouchableOpacity>
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
  page: { flex: 1, backgroundColor: warna.latar },
  content: { flexGrow: 1, width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, paddingBottom: 32 },
  header: { gap: 10, marginBottom: 20 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  backCircle: { width: 44, height: 44, borderRadius: 999, backgroundColor: warna.kartuKaca, borderWidth: 1, borderColor: warna.garis, alignItems: "center", justifyContent: "center" },
  backArrow: { color: warna.utama, fontSize: 26, lineHeight: 28, marginTop: -2 },
  topTitle: { flex: 1, color: warna.teks, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  title: { color: warna.teks, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  subtitle: { color: warna.teksRedup, fontSize: 14, lineHeight: 22 },
  statRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  statCard: { flex: 1, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1, borderColor: warna.garis, backgroundColor: warna.kartuKaca, gap: 4 },
  statNumber: { color: warna.teks, fontSize: 28, lineHeight: 34, fontWeight: "800" },
  statLabel: { color: warna.teksRedup, fontSize: 13, lineHeight: 18 },
  card: { padding: 20, backgroundColor: warna.kartuKaca, borderWidth: 1, borderColor: warna.garis, borderRadius: 24, gap: 12 },
  sessionTitle: { color: warna.teks, fontSize: 20, lineHeight: 26, fontWeight: "800" },
  button: { alignSelf: "flex-start", minHeight: 48, justifyContent: "center", paddingHorizontal: 8 },
  detailButton: { alignSelf: "flex-start", minHeight: 40, justifyContent: "center", paddingHorizontal: 16, borderRadius: 999, backgroundColor: warna.permukaanLembut },
  buttonText: { color: warna.utama, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  separator: { height: 14 },
  feedback: { gap: 12 },
  cacheNotice: { color: warna.peringatanTeks, fontSize: 13, lineHeight: 21 },
});