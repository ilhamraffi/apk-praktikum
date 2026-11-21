// src/app/asisten/index.tsx
// Beranda asisten: sapaan, ringkasan sesi, dan jadwal. Kelas, izin, dan profil ada di navbar.
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
import { HeaderBeranda } from "../../components/shared/HeaderBeranda";
import { KartuStatistik } from "../../components/shared/KartuStatistik";
import {
  Empty,
  ErrorBanner,
  Loading,
} from "../../components/shared/StatusLayar";
import { useAuth } from "../../context/AuthContext";
import { useWajibAsisten } from "../../hooks/useWajibAsisten";
import { useDaftarKelas } from "../../hooks/useKelas";
import { buatSesi, useDaftarSesi } from "../../hooks/useSesi";
import { radius, warna } from "../../theme";
import { ringkasSesi } from "../../utils/ringkasanSesi";

export default function JadwalAsistenScreen() {
  const { user } = useAuth();
  const { loading: loadingAuth, boleh } = useWajibAsisten();
  const { sesi, loading, error } = useDaftarSesi();
  const { mapKelas } = useDaftarKelas();
  const [formTerbuka, setFormTerbuka] = useState(false);

  if (loadingAuth) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (!boleh) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
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
  const ringkas = ringkasSesi(sesi, new Date());

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <FlatList
        data={sesi}
        keyExtractor={(item, index) => item.id || `sesi-${index}`}
        renderItem={({ item }) => (
          <KartuJadwal sesi={item} kelasLabel={labelKelas(item.classId)} />
        )}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <HeaderBeranda nama={user?.nama} peran="Ruang asisten" />

            <View style={styles.statistik}>
              <KartuStatistik angka={ringkas.hariIni} label="Sesi hari ini" />
              <KartuStatistik angka={ringkas.dibuka} label="Sedang dibuka" />
              <KartuStatistik angka={ringkas.total} label="Total sesi" />
            </View>

            <View style={styles.seksi}>
              <Text accessibilityRole="header" style={styles.seksiJudul}>
                Jadwal praktikum
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.85}
                style={styles.tombolTambah}
                onPress={() => setFormTerbuka(true)}
              >
                <Text style={styles.tombolTambahTeks}>+ Tambah sesi</Text>
              </TouchableOpacity>
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
  page: { flex: 1, backgroundColor: warna.latar },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 32,
  },
  separator: { height: 16 },
  header: { marginBottom: 20, gap: 20 },
  statistik: { flexDirection: "row", gap: 10 },
  seksi: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  seksiJudul: { flexShrink: 1, color: warna.teks, fontSize: 20, lineHeight: 28, fontWeight: "700" },
  tombolTambah: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: radius.pil,
    backgroundColor: warna.utama,
    alignItems: "center",
    justifyContent: "center",
  },
  tombolTambahTeks: { color: warna.utamaTeks, fontSize: 14, fontWeight: "700" },
  denied: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  deniedTitle: { color: warna.teks, fontSize: 22, fontWeight: "700" },
  deniedText: { color: warna.teksRedup, fontSize: 15, lineHeight: 24, textAlign: "center" },
  deniedBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pil, backgroundColor: warna.utama },
  deniedBtnText: { color: warna.utamaTeks, fontWeight: "700" },
});