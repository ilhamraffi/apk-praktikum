import { Link, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AksesIzinAsisten } from "../../../components/asisten/izin/AksesIzinAsisten";
import { AlasanPengajuanIzin, IdentitasPengajuanIzin, StatusPengajuanIzin } from "../../../components/asisten/izin/InformasiPengajuanIzin";
import { KeputusanPengajuanIzin } from "../../../components/asisten/izin/KeputusanPengajuanIzin";
import { Empty, ErrorBanner, Loading } from "../../../components/shared/StatusLayar";
import { useDetailIzinAsisten } from "../../../hooks/useIzinAsisten";
import { formatWaktuIzin, teksIzin } from "../../../utils/izinAsisten";

export default function DetailIzinAsistenScreen() {
  const { izinId } = useLocalSearchParams<{ izinId?: string | string[] }>();
  const id = typeof izinId === "string" ? izinId : "";
  return <AksesIzinAsisten>{(uid) => <DetailIzin key={`${uid}:${id}`} asistenUid={uid} izinId={id} />}</AksesIzinAsisten>;
}

function DetailIzin({ asistenUid, izinId }: { asistenUid: string; izinId: string }) {
  const hasil = useDetailIzinAsisten(asistenUid, izinId);
  const pengajuan = hasil.pengajuan;
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Link href="/asisten/izin" dismissTo asChild>
          <TouchableOpacity accessibilityRole="link" style={styles.linkButton}><Text style={styles.link}>Kembali ke daftar izin</Text></TouchableOpacity>
        </Link>
        <Text accessibilityRole="header" style={styles.title}>Detail pengajuan izin</Text>
        {hasil.error ? (
          <View style={styles.section}>
            <ErrorBanner message={hasil.error} />
            <TouchableOpacity accessibilityRole="button" onPress={hasil.cobaLagi} style={styles.linkButton}><Text style={styles.link}>Coba lagi</Text></TouchableOpacity>
          </View>
        ) : hasil.loading ? <Loading label="Memuat pengajuan izin..." /> : !pengajuan ? (
          <Empty title="Pengajuan tidak ditemukan" description="Pengajuan mungkin sudah dihapus. Kembali ke daftar untuk melihat pengajuan lainnya." />
        ) : (
          <>
            {hasil.dariCache ? <Text accessibilityRole="status" style={styles.notice}>Menampilkan data tersimpan di perangkat. Menunggu data terbaru dari server.</Text> : null}
            {hasil.tertunda ? <Text accessibilityRole="status" style={styles.notice}>Perubahan belum dikonfirmasi server.</Text> : null}
            <View style={styles.card}>
              <StatusPengajuanIzin status={pengajuan.status} />
              <IdentitasPengajuanIzin asistenUid={asistenUid} pengajuan={pengajuan} />
              <Text style={styles.muted}>Diajukan: {formatWaktuIzin(pengajuan.dibuatPada)}</Text>
              <AlasanPengajuanIzin pengajuan={pengajuan} />
              {pengajuan.status !== "pending" ? (
                <View style={styles.section}>
                  <Text style={styles.muted}>Diputuskan: {formatWaktuIzin(pengajuan.diputuskanPada)}</Text>
                  <Text selectable style={styles.muted}>UID asisten: {teksIzin(pengajuan.diputuskanOleh, "Belum tersedia")}</Text>
                </View>
              ) : null}
            </View>
            <KeputusanPengajuanIzin key={`${asistenUid}:${pengajuan.id}`} asistenUid={asistenUid} pengajuan={pengajuan} dariCache={hasil.dariCache} tertunda={hasil.tertunda} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flexGrow: 1, width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, paddingBottom: 32, gap: 16 },
  title: { color: "#0F172A", fontSize: 27, lineHeight: 36, fontWeight: "700" },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 20, gap: 16 },
  section: { gap: 8 },
  muted: { color: "#64748B", fontSize: 14, lineHeight: 23 },
  notice: { color: "#92400E", fontSize: 13, lineHeight: 21 },
  linkButton: { alignSelf: "flex-start", minHeight: 48, justifyContent: "center" },
  link: { color: "#4338CA", fontSize: 14, lineHeight: 22, fontWeight: "600" },
});
