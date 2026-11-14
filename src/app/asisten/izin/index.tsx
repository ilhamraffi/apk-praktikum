// SRS-07 — area Fauzan; tautan masuk dari menu Ilham disiapkan dalam handoff.
import { Link } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AksesIzinAsisten } from "../../../components/asisten/izin/AksesIzinAsisten";
import { AlasanPengajuanIzin, IdentitasPengajuanIzin, StatusPengajuanIzin } from "../../../components/asisten/izin/InformasiPengajuanIzin";
import { Empty, ErrorBanner, Loading } from "../../../components/shared/StatusLayar";
import { useDaftarIzinAsisten } from "../../../hooks/useIzinAsisten";
import type { StatusIzin } from "../../../types";
import { formatWaktuIzin, LABEL_STATUS_IZIN } from "../../../utils/izinAsisten";

const FILTER: StatusIzin[] = ["pending", "approved", "rejected"];

export default function DaftarIzinAsistenScreen() {
  return <AksesIzinAsisten>{(uid) => <DaftarIzin key={uid} asistenUid={uid} />}</AksesIzinAsisten>;
}

function DaftarIzin({ asistenUid }: { asistenUid: string }) {
  const [status, setStatus] = useState<StatusIzin>("pending");
  const hasil = useDaftarIzinAsisten(asistenUid, status);
  return (
    <SafeAreaView style={styles.page}>
      <FlatList
        data={hasil.loading || hasil.error ? [] : hasil.izin}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Link href="/asisten" dismissTo asChild>
              <TouchableOpacity accessibilityRole="link" style={styles.linkButton}><Text style={styles.link}>Kembali ke jadwal asisten</Text></TouchableOpacity>
            </Link>
            <Text accessibilityRole="header" style={styles.title}>Pemeriksaan izin</Text>
            <Text style={styles.subtitle}>Baca alasan dan kategori AI, lalu berikan keputusan pada detail pengajuan.</Text>
            <View style={styles.filters}>
              {FILTER.map((nilai) => (
                <TouchableOpacity key={nilai} accessibilityRole="button" accessibilityState={{ selected: status === nilai }} onPress={() => setStatus(nilai)} style={[styles.filter, status === nilai && styles.activeFilter]}>
                  <Text style={[styles.filterText, status === nilai && styles.activeFilterText]}>{LABEL_STATUS_IZIN[nilai]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {hasil.dariCache && !hasil.error ? <Text accessibilityRole="status" style={styles.notice}>Menampilkan data tersimpan di perangkat. Tunggu koneksi server untuk memberikan keputusan.</Text> : null}
            {hasil.tertunda && !hasil.error ? <Text accessibilityRole="status" style={styles.notice}>Ada perubahan yang sedang disinkronkan.</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <StatusPengajuanIzin status={item.status} />
            <IdentitasPengajuanIzin asistenUid={asistenUid} pengajuan={item} />
            <Text style={styles.subtitle}>Diajukan: {formatWaktuIzin(item.dibuatPada)}</Text>
            <AlasanPengajuanIzin pengajuan={item} ringkas />
            <Link href={{ pathname: "/asisten/izin/[izinId]", params: { izinId: item.id! } }} asChild>
              <TouchableOpacity accessibilityRole="link" style={styles.detailButton}><Text style={styles.link}>Lihat detail pengajuan</Text></TouchableOpacity>
            </Link>
          </View>
        )}
        ListEmptyComponent={hasil.error ? (
          <View style={styles.feedback}>
            <ErrorBanner message={hasil.error} />
            <TouchableOpacity accessibilityRole="button" onPress={hasil.cobaLagi} style={styles.linkButton}><Text style={styles.link}>Coba lagi</Text></TouchableOpacity>
          </View>
        ) : hasil.loading ? <Loading label="Memuat pengajuan izin..." /> : (
          <Empty title={`Belum ada izin ${LABEL_STATUS_IZIN[status].toLowerCase()}`} description="Perubahan pengajuan akan muncul otomatis di daftar ini." />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flexGrow: 1, width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, paddingBottom: 32 },
  header: { gap: 12, marginBottom: 24 },
  title: { color: "#0F172A", fontSize: 28, lineHeight: 36, fontWeight: "700" },
  subtitle: { color: "#64748B", fontSize: 14, lineHeight: 23 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filter: { minHeight: 48, paddingHorizontal: 16, justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" },
  activeFilter: { backgroundColor: "#4338CA", borderColor: "#4338CA" },
  filterText: { color: "#334155", fontSize: 14, fontWeight: "600" },
  activeFilterText: { color: "#FFFFFF" },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 20, gap: 16 },
  separator: { height: 16 },
  linkButton: { alignSelf: "flex-start", minHeight: 48, justifyContent: "center" },
  detailButton: { minHeight: 48, justifyContent: "center", alignItems: "center", padding: 12, borderRadius: 12, backgroundColor: "#EEF2FF" },
  link: { color: "#4338CA", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  notice: { color: "#92400E", fontSize: 13, lineHeight: 21 },
  feedback: { gap: 12 },
});
