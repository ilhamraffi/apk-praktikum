import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormSesi } from "../../components/asisten/FormSesi";
import { InformasiSesi } from "../../components/asisten/InformasiSesi";
import { KonfirmasiHapus } from "../../components/asisten/KonfirmasiHapus";
import { PembukaanSesi } from "../../components/asisten/PembukaanSesi";
import { PenutupanSesi } from "../../components/asisten/PenutupanSesi";
import { RekapPresensi } from "../../components/asisten/RekapPresensi";
import { StatusSesi } from "../../components/asisten/StatusSesi";
import { Loading } from "../../components/shared/StatusLayar";
import { useWajibAsisten } from "../../hooks/useWajibAsisten";
import { useDaftarKelas } from "../../hooks/useKelas";
import { usePresensiSesi } from "../../hooks/usePresensi";
import {
  hapusSesi,
  perbaruiSesi,
  useSesiDetail,
} from "../../hooks/useSesi";

export default function DetailSesiAsistenScreen() {
  const { sesiId } = useLocalSearchParams<{ sesiId?: string | string[] }>();
  const id = typeof sesiId === "string" ? sesiId.trim() : undefined;

  const { loading: loadingAuth, boleh } = useWajibAsisten();
  const { sesi, kelas, totalPraktikan, loading } = useSesiDetail(id);
  const { catatan, loading: loadingPresensi, error: errorPresensi } =
    usePresensiSesi(id);
  const { mapKelas } = useDaftarKelas();

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [hapusTerbuka, setHapusTerbuka] = useState(false);
  const [memprosesHapus, setMemprosesHapus] = useState(false);

  if (loadingAuth || (loading && !sesi)) {
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
            Halaman ini hanya untuk asisten.
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

  const kelasLabel = kelas ? `${kelas.nama} (${kelas.kode})` : undefined;
  const modul = sesi?.modul?.trim();

  const konfirmasiHapus = async () => {
    if (!sesi?.id) return;
    setMemprosesHapus(true);
    try {
      await hapusSesi(sesi.id);
      router.replace("/asisten");
    } finally {
      setMemprosesHapus(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Link href="/asisten" dismissTo asChild>
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel="Kembali ke jadwal praktikum"
            activeOpacity={0.75}
            style={styles.backButton}
          >
            <Text accessible={false} style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Kembali ke jadwal</Text>
          </TouchableOpacity>
        </Link>

        {sesi ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>DETAIL SESI</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {sesi.namaPraktikum?.trim() || "Praktikum"}
              </Text>
              {modul ? <Text style={styles.subtitle}>{modul}</Text> : null}
              <View style={styles.status}>
                <StatusSesi status={sesi.status} />
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Informasi praktikum
                </Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => setFormTerbuka(true)}
                  >
                    <Text style={styles.editText}>Ubah</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => setHapusTerbuka(true)}
                  >
                    <Text style={styles.deleteText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <InformasiSesi sesi={sesi} kelasLabel={kelasLabel} />
            </View>

            {sesi.status !== "DITUTUP" ? (
              <PembukaanSesi key={`pembukaan-${sesi.id}`} sesi={sesi} />
            ) : null}
            <PenutupanSesi key={`penutupan-${sesi.id}`} sesi={sesi} />
            <RekapPresensi
              catatan={catatan}
              totalPraktikan={totalPraktikan}
              status={sesi.status}
              loading={loadingPresensi}
              error={errorPresensi}
            />
          </>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.eyebrow}>SESI PRAKTIKUM</Text>
            <Text accessibilityRole="header" style={styles.emptyTitle}>
              Sesi tidak ditemukan
            </Text>
            <Text style={styles.subtitle}>
              Jadwal yang Anda cari tidak tersedia. Kembali ke daftar untuk
              memilih sesi lain.
            </Text>
          </View>
        )}
      </ScrollView>

      {formTerbuka && sesi ? (
        <FormSesi
          key={sesi.id}
          awal={sesi}
          daftarKelas={Array.from(mapKelas.values())}
          onBatal={() => setFormTerbuka(false)}
          onSimpan={(input) => perbaruiSesi(sesi.id!, input)}
        />
      ) : null}

      <KonfirmasiHapus
        visible={hapusTerbuka}
        judul="Hapus sesi?"
        pesan={`Sesi ${sesi?.namaPraktikum ?? ""} beserta seluruh presensinya akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        memproses={memprosesHapus}
        onBatal={() => setHapusTerbuka(false)}
        onKonfirmasi={konfirmasiHapus}
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
  backButton: {
    alignSelf: "flex-start",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    marginLeft: -8,
    marginBottom: 24,
    borderRadius: 12,
  },
  backArrow: { color: "#4338CA", fontSize: 28, lineHeight: 32 },
  backText: { flexShrink: 1, color: "#4338CA", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  hero: { marginBottom: 28 },
  eyebrow: { color: "#4338CA", fontSize: 12, lineHeight: 20, fontWeight: "700", letterSpacing: 1 },
  title: { color: "#0F172A", fontSize: 28, lineHeight: 38, fontWeight: "700", marginTop: 10 },
  subtitle: { color: "#64748B", fontSize: 15, lineHeight: 24, marginTop: 10 },
  status: { marginTop: 20 },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 20,
  },
  infoHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 22 },
  sectionTitle: { color: "#0F172A", fontSize: 17, lineHeight: 26, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 8 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
  editText: { color: "#334155", fontSize: 13, fontWeight: "600" },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  deleteText: { color: "#B91C1C", fontSize: 13, fontWeight: "700" },
  emptyTitle: { color: "#0F172A", fontSize: 22, lineHeight: 30, fontWeight: "700", marginTop: 10 },
  denied: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  deniedTitle: { color: "#0F172A", fontSize: 22, fontWeight: "700" },
  deniedText: { color: "#64748B", fontSize: 15, lineHeight: 24, textAlign: "center" },
  deniedBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: "#4338CA" },
  deniedBtnText: { color: "#FFFFFF", fontWeight: "700" },
});
