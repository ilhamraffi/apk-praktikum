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
import { ErrorBanner, Loading } from "../../components/shared/StatusLayar";
import { useWajibAsisten } from "../../hooks/useWajibAsisten";
import { useDaftarKelas } from "../../hooks/useKelas";
import { useDaftarLab } from "../../hooks/useLab";
import { usePresensiSesi } from "../../hooks/usePresensi";
import {
  hapusSesi,
  perbaruiSesi,
  useSesiDetail,
} from "../../hooks/useSesi";
import { pesanError } from "../../lib/errors";
import { warna } from "../../theme";

export default function DetailSesiAsistenScreen() {
  const { sesiId } = useLocalSearchParams<{ sesiId?: string | string[] }>();
  const id = typeof sesiId === "string" ? sesiId.trim() : undefined;

  const { loading: loadingAuth, boleh } = useWajibAsisten();
  const { sesi, kelas, totalPraktikan, loading } = useSesiDetail(id);
  const { catatan, loading: loadingPresensi, error: errorPresensi } =
    usePresensiSesi(id);
  const { mapKelas } = useDaftarKelas();
  const { mapLab } = useDaftarLab();

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [hapusTerbuka, setHapusTerbuka] = useState(false);
  const [memprosesHapus, setMemprosesHapus] = useState(false);
  const [errorHapus, setErrorHapus] = useState<string | null>(null);

  if (loadingAuth || (loading && !sesi)) {
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
    setErrorHapus(null);
    try {
      await hapusSesi(sesi.id);
      setHapusTerbuka(false);
      router.replace("/asisten");
    } catch (err) {
      setHapusTerbuka(false);
      setErrorHapus(pesanError(err));
    } finally {
      setMemprosesHapus(false);
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Kembali ke jadwal praktikum"
            activeOpacity={0.75}
            onPress={() => router.replace("/asisten")}
            style={styles.backCircle}
          >
            <Text accessible={false} style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.topTitle}>
            {sesi?.status === "DIBUKA"
              ? "Sesi presensi"
              : sesi?.status === "DITUTUP"
                ? "Rekap kehadiran"
                : "Detail praktikum"}
          </Text>
          <View style={styles.topSpacer} />
        </View>

        {errorHapus ? <ErrorBanner message={errorHapus} /> : null}

        {sesi ? (
          <>
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Text style={styles.eyebrow}>
                  {kelasLabel ? kelasLabel.toUpperCase() : "DETAIL SESI"}
                </Text>
                <StatusSesi status={sesi.status} />
              </View>
              <Text accessibilityRole="header" style={styles.title}>
                {sesi.namaPraktikum?.trim() || "Praktikum"}
              </Text>
              {modul ? <Text style={styles.subtitle}>{modul}</Text> : null}

              <View style={styles.infoBody}>
                <InformasiSesi sesi={sesi} kelasLabel={kelasLabel} />
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setFormTerbuka(true)}
                >
                  <Text style={styles.editText}>Ubah sesi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => setHapusTerbuka(true)}
                >
                  <Text style={styles.deleteText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>

            <PembukaanSesi key={`pembukaan-${sesi.id}`} sesi={sesi} />
            {sesi.status === "DIBUKA" ? (
              <PenutupanSesi key={`penutupan-${sesi.id}`} sesi={sesi} />
            ) : null}
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
          daftarLab={Array.from(mapLab.values())}
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
  page: { flex: 1, backgroundColor: warna.latar },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 116,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: warna.kartuKaca,
    borderWidth: 1,
    borderColor: warna.garis,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: warna.utama, fontSize: 26, lineHeight: 28, marginTop: -2 },
  topTitle: {
    flex: 1,
    color: warna.teks,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  topSpacer: { width: 44 },
  eyebrow: {
    color: warna.teksRedup,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  title: { color: warna.teks, fontSize: 24, lineHeight: 32, fontWeight: "800" },
  subtitle: { color: warna.teksIsi, fontSize: 15, lineHeight: 22, marginTop: 4 },
  infoCard: {
    backgroundColor: warna.kartuKaca,
    borderWidth: 1,
    borderColor: warna.garis,
    borderRadius: 24,
    padding: 20,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  infoBody: { marginTop: 14 },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: warna.garis,
  },
  editBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: warna.garis,
    backgroundColor: warna.kartu,
    alignItems: "center",
    justifyContent: "center",
  },
  editText: { color: warna.teks, fontSize: 13, fontWeight: "700" },
  deleteBtn: {
    paddingHorizontal: 18,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: warna.errorGaris,
    backgroundColor: warna.errorLatar,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { color: warna.error, fontSize: 13, fontWeight: "700" },
  emptyTitle: { color: warna.teks, fontSize: 22, lineHeight: 30, fontWeight: "700", marginTop: 10 },
  denied: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  deniedTitle: { color: warna.teks, fontSize: 22, fontWeight: "700" },
  deniedText: { color: warna.teksRedup, fontSize: 15, lineHeight: 24, textAlign: "center" },
  deniedBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999, backgroundColor: warna.utama },
  deniedBtnText: { color: warna.utamaTeks, fontWeight: "700" },
});