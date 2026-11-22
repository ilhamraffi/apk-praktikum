// src/app/praktikan/index.tsx
// SRS-02 praktikan: jadwal hanya dari kelas yang diikuti pengguna.
// Beranda praktikan: sapaan, ringkasan sesi, dan jadwal. Riwayat, izin, dan profil ada di navbar.
import { Link } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KartuJadwalPraktikan } from "../../components/praktikan/KartuJadwal";
import { HeaderBeranda } from "../../components/shared/HeaderBeranda";
import { KartuStatistik } from "../../components/shared/KartuStatistik";
import { PeringatanNotifikasi } from "../../components/shared/PeringatanPerangkat";
import { Empty, ErrorBanner, Loading } from "../../components/shared/StatusLayar";
import { useAuth } from "../../context/AuthContext";
import { useJadwalPraktikan } from "../../hooks/useJadwalPraktikan";
import { radius, warna } from "../../theme";
import { ringkasSesi } from "../../utils/ringkasanSesi";

export default function JadwalPraktikanScreen() {
  const {
    user,
    role,
    loading: loadingAuth,
    statusNotifikasi,
    errorNotifikasi,
    aktifkanUlangNotifikasi,
  } = useAuth();
  const uid = !loadingAuth && role === "PRAKTIKAN" ? user?.uid : undefined;
  const { sesi, kelas, mapKelas, loading, error, dariCache, cobaLagi } = useJadwalPraktikan(uid);

  if (loadingAuth) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (!user || role !== "PRAKTIKAN" || !user.uid) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        <View style={styles.denied}>
          <Text style={styles.deniedTitle}>{!user ? "Belum masuk" : "Akses tidak tersedia"}</Text>
          <Text style={styles.deniedText}>
            {!user
              ? "Silakan masuk terlebih dahulu."
              : role !== "PRAKTIKAN"
                ? "Halaman ini hanya tersedia untuk akun praktikan."
                : "Identitas akun belum lengkap. Silakan masuk ulang."}
          </Text>
          <Link href="/" asChild>
            <TouchableOpacity style={styles.deniedBtn}>
              <Text style={styles.deniedBtnText}>{user ? "Kembali" : "Ke halaman masuk"}</Text>
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
  const ringkas = ringkasSesi(sesi, new Date());

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <FlatList
        data={loading || error ? [] : sesi}
        keyExtractor={(item) => item.id ?? ""}
        renderItem={({ item }) => (
          <KartuJadwalPraktikan sesi={item} kelasLabel={labelKelas(item.classId)} />
        )}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <HeaderBeranda nama={user.nama} peran="Ruang praktikan" />

            <View style={styles.statistik}>
              <KartuStatistik angka={ringkas.hariIni} label="Sesi hari ini" />
              <KartuStatistik angka={ringkas.dibuka} label="Sedang dibuka" />
              <KartuStatistik angka={ringkas.total} label="Total sesi" />
            </View>

            {statusNotifikasi ? (
              <PeringatanNotifikasi
                status={statusNotifikasi}
                pesanError={errorNotifikasi}
                onCobaLagi={() => void aktifkanUlangNotifikasi?.()}
              />
            ) : null}

            <Link href="/praktikan/peta" asChild>
              <TouchableOpacity
                accessibilityRole="link"
                activeOpacity={0.85}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>Lihat peta laboratorium</Text>
              </TouchableOpacity>
            </Link>

            <View style={styles.seksi}>
              <Text accessibilityRole="header" style={styles.seksiJudul}>Jadwal saya</Text>
              <Text style={styles.seksiKet}>Pilih sesi untuk presensi</Text>
            </View>

            {dariCache && !error ? (
              <Text style={styles.cacheNotice}>
                Menampilkan data tersimpan di perangkat. Data terbaru akan dimuat saat terhubung ke server.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.feedback}>
              <ErrorBanner message={error} />
              <TouchableOpacity onPress={cobaLagi} style={styles.secondaryButton} accessibilityRole="button">
                <Text style={styles.secondaryText}>Coba lagi</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <Loading label="Memuat kelas dan jadwalmu..." />
          ) : (
            <Empty
              title={kelas.length ? "Belum ada jadwal" : "Belum terdaftar di kelas"}
              description={kelas.length
                ? "Belum ada sesi praktikum untuk kelas yang kamu ikuti."
                : "Hubungi asisten untuk menambahkan akunmu sebagai peserta kelas."}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: warna.latar },
  content: { flexGrow: 1, width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, paddingBottom: 112 },
  separator: { height: 16 },
  header: { marginBottom: 20, gap: 20 },
  statistik: { flexDirection: "row", gap: 10 },
  seksi: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  seksiJudul: { flexShrink: 1, color: warna.teks, fontSize: 20, lineHeight: 28, fontWeight: "700" },
  seksiKet: { flexShrink: 1, color: warna.teksRedup, fontSize: 13, lineHeight: 20, textAlign: "right" },
  secondaryButton: { minHeight: 48, paddingHorizontal: 12, borderRadius: radius.pil, borderWidth: 1, borderColor: warna.garis, backgroundColor: warna.kartu, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: warna.utama, fontSize: 13, lineHeight: 20, fontWeight: "600" },
  cacheNotice: { color: warna.peringatanTeks, fontSize: 13, lineHeight: 21 },
  feedback: { gap: 12 },
  denied: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  deniedTitle: { color: warna.teks, fontSize: 22, fontWeight: "700" },
  deniedText: { color: warna.teksRedup, fontSize: 15, lineHeight: 24, textAlign: "center" },
  deniedBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pil, backgroundColor: warna.utama },
  deniedBtnText: { color: warna.utamaTeks, fontWeight: "700" },
});