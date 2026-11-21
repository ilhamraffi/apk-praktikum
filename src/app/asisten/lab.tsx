// src/app/asisten/lab.tsx
// Kelola laboratorium (SRS-11): daftar, tambah, ubah, dan hapus laboratorium
// beserta koordinat & radius presensinya. Hanya untuk asisten.
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
import { FormLab } from "../../components/asisten/FormLab";
import { KonfirmasiHapus } from "../../components/asisten/KonfirmasiHapus";
import {
  Empty,
  ErrorBanner,
  Loading,
} from "../../components/shared/StatusLayar";
import { useWajibAsisten } from "../../hooks/useWajibAsisten";
import {
  buatLab,
  hapusLab,
  perbaruiLab,
  useDaftarLab,
} from "../../hooks/useLab";
import { pesanError } from "../../lib/errors";
import type { Lab } from "../../types";
import { warna } from "../../theme";

function formatKoordinat(nilai: number | null | undefined): string {
  if (nilai == null || !Number.isFinite(nilai)) return "-";
  return nilai.toFixed(5);
}

function formatRadius(nilai: number | null | undefined): string {
  if (nilai == null || !Number.isFinite(nilai)) return "-";
  const bulat = Math.round(nilai * 10) / 10;
  return `${Number.isInteger(bulat) ? String(bulat) : bulat.toFixed(1).replace(".", ",")} m`;
}

export default function KelolaLabScreen() {
  const { loading: loadingAuth, boleh } = useWajibAsisten();
  const { lab, loading, error } = useDaftarLab();

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [editLab, setEditLab] = useState<Lab | null>(null);
  const [labDihapus, setLabDihapus] = useState<Lab | null>(null);
  const [memprosesHapus, setMemprosesHapus] = useState(false);
  const [errorHapus, setErrorHapus] = useState<string | null>(null);

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

  const konfirmasiHapus = async () => {
    if (!labDihapus?.id) return;
    setMemprosesHapus(true);
    setErrorHapus(null);
    try {
      await hapusLab(labDihapus.id);
      setLabDihapus(null);
    } catch (e) {
      setErrorHapus(pesanError(e));
      setLabDihapus(null);
    } finally {
      setMemprosesHapus(false);
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <FlatList
        data={lab}
        keyExtractor={(item) => item.id ?? ""}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.nama}</Text>
                <Text style={styles.cardSub}>
                  {item.gedung?.trim()
                    ? `${item.gedung.trim()} · `
                    : ""}
                  Radius {formatRadius(item.radiusMeter)}
                </Text>
                <Text style={styles.cardSub}>
                  {formatKoordinat(item.latitude)}, {formatKoordinat(item.longitude)}
                </Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  setEditLab(item);
                  setFormTerbuka(true);
                }}
              >
                <Text style={styles.editText}>Ubah</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  setErrorHapus(null);
                  setLabDihapus(item);
                }}
              >
                <Text style={styles.deleteText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Link href="/asisten" dismissTo asChild>
                <TouchableOpacity accessibilityRole="link" style={styles.backLink}>
                  <Text style={styles.backArrow}>‹</Text>
                  <Text style={styles.backText}>Kembali ke jadwal</Text>
                </TouchableOpacity>
              </Link>
            </View>
            <View style={styles.headingRow}>
              <Text accessibilityRole="header" style={styles.title}>
                Laboratorium
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{lab.length} lab</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Atur nama, lokasi, dan radius presensi tiap laboratorium.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setEditLab(null);
                setFormTerbuka(true);
              }}
            >
              <Text style={styles.primaryText}>Tambah laboratorium</Text>
            </TouchableOpacity>
            {error ? <ErrorBanner message={error} /> : null}
            {errorHapus ? <ErrorBanner message={errorHapus} /> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : (
            <Empty
              title="Belum ada laboratorium"
              description="Tambahkan laboratorium beserta koordinat dan radius presensinya."
            />
          )
        }
      />

      {formTerbuka ? (
        <FormLab
          key={editLab?.id ?? "baru"}
          awal={editLab}
          onBatal={() => setFormTerbuka(false)}
          onSimpan={(input) =>
            editLab?.id ? perbaruiLab(editLab.id, input) : buatLab(input)
          }
        />
      ) : null}

      <KonfirmasiHapus
        visible={Boolean(labDihapus)}
        judul="Hapus laboratorium?"
        pesan={`Laboratorium ${labDihapus?.nama ?? ""} akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        memproses={memprosesHapus}
        onBatal={() => setLabDihapus(null)}
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
    paddingBottom: 32,
  },
  separator: { height: 16 },
  header: { marginBottom: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backLink: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, marginLeft: -8 },
  backArrow: { color: warna.utama, fontSize: 28, lineHeight: 32 },
  backText: { color: warna.utama, fontSize: 14, lineHeight: 22, fontWeight: "600" },
  headingRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 10 },
  title: { color: warna.teks, fontSize: 28, lineHeight: 36, fontWeight: "800" },
  countBadge: { backgroundColor: warna.permukaan, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  countText: { color: warna.utama, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  subtitle: { color: warna.teksRedup, fontSize: 15, lineHeight: 24 },
  primaryBtn: { minHeight: 48, paddingHorizontal: 20, borderRadius: 999, backgroundColor: warna.utama, alignItems: "center", justifyContent: "center", marginTop: 16, alignSelf: "flex-start" },
  primaryText: { color: warna.utamaTeks, fontSize: 14, fontWeight: "700" },
  card: {
    backgroundColor: warna.kartuKaca,
    borderWidth: 1,
    borderColor: warna.garis,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { color: warna.teks, fontSize: 18, lineHeight: 26, fontWeight: "800" },
  cardSub: { color: warna.teksRedup, fontSize: 13, lineHeight: 20 },
  cardActions: { flexDirection: "row", gap: 12 },
  editBtn: { flex: 1, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: warna.garis, backgroundColor: warna.kartu, alignItems: "center", justifyContent: "center" },
  editText: { color: warna.teksIsi, fontSize: 14, fontWeight: "700" },
  deleteBtn: { flex: 1, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: warna.errorGaris, backgroundColor: warna.errorLatar, alignItems: "center", justifyContent: "center" },
  deleteText: { color: warna.error, fontSize: 14, fontWeight: "700" },
  denied: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  deniedTitle: { color: warna.teks, fontSize: 22, fontWeight: "700" },
  deniedText: { color: warna.teksRedup, fontSize: 15, lineHeight: 24, textAlign: "center" },
  deniedBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: warna.utama },
  deniedBtnText: { color: warna.utamaTeks, fontWeight: "700" },
});
