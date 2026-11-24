import { Link, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormIzin } from "../../components/praktikan/FormIzin";
import { AnalisisUlangIzin } from "../../components/praktikan/AnalisisUlangIzin";
import { HasilAnalisisIzin } from "../../components/izin/HasilAnalisisIzin";
import { Empty, ErrorBanner, Loading } from "../../components/shared/StatusLayar";
import { useAuth } from "../../context/AuthContext";
import { useDaftarIzinPraktikan } from "../../hooks/useIzinPraktikan";
import { useJadwalPraktikan } from "../../hooks/useJadwalPraktikan";
import { LABEL_STATUS_IZIN } from "../../utils/izinAsisten";
import { teksWaktuSesi } from "../../utils/waktuSesi";
import { warna } from "../../theme";


export default function IzinPraktikanScreen() {
  const { sesiId } = useLocalSearchParams<{ sesiId?: string | string[] }>();
  const targetId = typeof sesiId === "string" ? sesiId : undefined;
  const { user, role, loading: loadingAuth } = useAuth();
  const uid = !loadingAuth && role === "PRAKTIKAN" ? user?.uid : undefined;
  const jadwal = useJadwalPraktikan(uid);
  const izin = useDaftarIzinPraktikan(uid);

  if (loadingAuth) return <SafeAreaView style={styles.page} edges={["top"]}><Loading /></SafeAreaView>;
  if (!user || role !== "PRAKTIKAN" || !user.uid) {
    return <SafeAreaView style={styles.page} edges={["top"]}><View style={styles.content}><Empty title="Akses tidak tersedia" description="Halaman izin hanya tersedia untuk Praktikan." /></View></SafeAreaView>;
  }

  const sesiTarget = targetId ? jadwal.sesi.find((item) => item.id === targetId) : undefined;
  const sudahMengajukan = targetId ? izin.izin.some((item) => item.sessionId === targetId) : false;

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <FlatList
        data={jadwal.sesi}
        keyExtractor={(item) => item.id ?? item.namaPraktikum}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Link href="/praktikan" replace asChild>
              <TouchableOpacity style={styles.back}><Text style={styles.link}>‹ Kembali ke jadwal</Text></TouchableOpacity>
            </Link>
            <Text style={styles.title}>Pengajuan izin</Text>
            <Text style={styles.subtitle}>Pilih sesi untuk mengirim alasan ketidakhadiran dan pantau statusnya.</Text>
            {izin.dariCache ? <Text style={styles.notice}>Menampilkan data tersimpan di perangkat.</Text> : null}
            {izin.error ? <ErrorBanner message={izin.error} /> : null}
            {jadwal.error ? <ErrorBanner message={jadwal.error} /> : null}
            {targetId && !jadwal.loading && !sesiTarget ? <ErrorBanner message="Sesi tidak ditemukan atau bukan bagian dari kelasmu." /> : null}
            {sesiTarget && targetId && !sudahMengajukan ? (
              <FormIzin uid={user.uid} sessionId={targetId} onSelesai={() => {}} />
            ) : null}
            {sesiTarget && sudahMengajukan ? <Text style={styles.notice}>Pengajuan untuk sesi ini sudah tersimpan.</Text> : null}
            <Text style={styles.sectionTitle}>Status pengajuan saya</Text>
          </View>
        }
        renderItem={({ item }) => {
          const itemIzin = izin.izin.find((pengajuan) => pengajuan.sessionId === item.id);
          return (
            <View style={styles.card}>
              <Text style={styles.session}>{item.namaPraktikum}</Text>
              <Text style={styles.subtitle}>{item.modul} · {teksWaktuSesi(item)}</Text>
              {itemIzin ? (
                <>
                  <Text style={[styles.status, styles[itemIzin.status]]}>{LABEL_STATUS_IZIN[itemIzin.status]}</Text>
                  <Text style={styles.reason} numberOfLines={3}>{itemIzin.alasan}</Text>
                  <HasilAnalisisIzin pengajuan={itemIzin} />
                  <AnalisisUlangIzin key={`${user.uid}:${itemIzin.id}`} uid={user.uid!} pengajuan={itemIzin} dariCache={izin.dariCache} />
                </>
              ) : (
                <Link href={{ pathname: "/praktikan/izin", params: { sesiId: item.id ?? "" } }} asChild>
                  <TouchableOpacity style={styles.action}><Text style={styles.actionText}>Ajukan izin untuk sesi ini</Text></TouchableOpacity>
                </Link>
              )}
            </View>
          );
        }}
        ListEmptyComponent={jadwal.error || izin.error ? (
          <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => { jadwal.cobaLagi(); izin.cobaLagi(); }}>
            <Text style={styles.actionText}>Coba lagi</Text>
          </TouchableOpacity>
        ) : jadwal.loading || izin.loading ? <Loading label="Memuat sesi dan pengajuan..." /> : <Empty title="Belum ada sesi" description="Pengajuan izin hanya tersedia untuk sesi dari kelas yang kamu ikuti." />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: warna.latar },
  content: { flexGrow: 1, width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, paddingBottom: 112 },
  header: { gap: 12, marginBottom: 16 },
  back: { minHeight: 40, justifyContent: "center" },
  link: { color: warna.utama, fontWeight: "700" },
  title: { color: warna.teks, fontSize: 28, fontWeight: "800" },
  subtitle: { color: warna.teksRedup, lineHeight: 22 },
  sectionTitle: { color: warna.teks, fontSize: 18, fontWeight: "800", marginTop: 10 },
  notice: { color: warna.peringatanTeks, backgroundColor: warna.peringatanLatar, padding: 12, borderRadius: 12 },
  card: { padding: 20, borderRadius: 24, backgroundColor: warna.kartuKaca, borderWidth: 1, borderColor: warna.garis, gap: 10 },
  session: { color: warna.teks, fontSize: 19, fontWeight: "800" },
  reason: { color: warna.teksIsi, lineHeight: 21 },
  status: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, fontWeight: "700", fontSize: 12, overflow: "hidden" },
  pending: { backgroundColor: warna.peringatanLatar, color: warna.peringatanTeks },
  approved: { backgroundColor: warna.suksesLatar, color: warna.suksesTeks },
  rejected: { backgroundColor: warna.errorLatar, color: warna.errorTeks },
  action: { minHeight: 44, justifyContent: "center" },
  actionText: { color: warna.utama, fontWeight: "700" },
  separator: { height: 14 },
});