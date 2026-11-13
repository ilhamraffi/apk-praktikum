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
import { FormKelas } from "../../components/asisten/FormKelas";
import { KelolaPeserta } from "../../components/asisten/KelolaPeserta";
import { KonfirmasiHapus } from "../../components/asisten/KonfirmasiHapus";
import {
  Empty,
  ErrorBanner,
  Loading,
} from "../../components/shared/StatusLayar";
import { useWajibAsisten } from "../../hooks/useWajibAsisten";
import {
  buatKelas,
  hapusKelas,
  hapusPeserta,
  perbaruiKelas,
  tambahPeserta,
  useDaftarKelas,
} from "../../hooks/useKelas";
import { useDaftarPraktikan } from "../../hooks/usePeserta";
import type { Kelas } from "../../types";

export default function KelolaKelasScreen() {
  const { loading: loadingAuth, boleh } = useWajibAsisten();
  const { kelas, loading, error } = useDaftarKelas();
  const { pengguna: daftarPraktikan } = useDaftarPraktikan();

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [editKelas, setEditKelas] = useState<Kelas | null>(null);
  const [kelasDihapus, setKelasDihapus] = useState<Kelas | null>(null);
  const [kelasPeserta, setKelasPeserta] = useState<Kelas | null>(null);
  const [memprosesHapus, setMemprosesHapus] = useState(false);

  if (loadingAuth) {
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

  const konfirmasiHapus = async () => {
    if (!kelasDihapus?.id) return;
    setMemprosesHapus(true);
    try {
      await hapusKelas(kelasDihapus.id);
      setKelasDihapus(null);
    } finally {
      setMemprosesHapus(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <FlatList
        data={kelas}
        keyExtractor={(item) => item.id ?? ""}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.nama}</Text>
                <Text style={styles.cardSub}>
                  Kode {item.kode} · {item.pesertaUids?.length ?? 0} peserta
                </Text>
              </View>
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => setKelasPeserta(item)}
              >
                <Text style={styles.manageText}>Peserta</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  setEditKelas(item);
                  setFormTerbuka(true);
                }}
              >
                <Text style={styles.editText}>Ubah</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => setKelasDihapus(item)}
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
                Kelas praktikum
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{kelas.length} kelas</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Kelola kelas dan daftar pesertanya.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setEditKelas(null);
                setFormTerbuka(true);
              }}
            >
              <Text style={styles.primaryText}>Tambah kelas</Text>
            </TouchableOpacity>
            {error ? <ErrorBanner message={error} /> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : (
            <Empty
              title="Belum ada kelas"
              description="Tambahkan kelas untuk mengelompokkan praktikan."
            />
          )
        }
      />

      {formTerbuka ? (
        <FormKelas
          key={editKelas?.id ?? "baru"}
          awal={editKelas}
          onBatal={() => setFormTerbuka(false)}
          onSimpan={(input) =>
            editKelas?.id ? perbaruiKelas(editKelas.id, input) : buatKelas(input)
          }
        />
      ) : null}

      <KonfirmasiHapus
        visible={Boolean(kelasDihapus)}
        judul="Hapus kelas?"
        pesan={`Kelas ${kelasDihapus?.nama ?? ""} beserta semua sesinya akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        memproses={memprosesHapus}
        onBatal={() => setKelasDihapus(null)}
        onKonfirmasi={konfirmasiHapus}
      />

      {kelasPeserta ? (
        <KelolaPeserta
          visible={Boolean(kelasPeserta)}
          kelas={kelasPeserta}
          daftarPraktikan={daftarPraktikan}
          onBatal={() => setKelasPeserta(null)}
          onTambah={(uid) => tambahPeserta(kelasPeserta.id!, uid)}
          onHapus={(uid) => hapusPeserta(kelasPeserta.id!, uid)}
        />
      ) : null}
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
  separator: { height: 16 },
  header: { marginBottom: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backLink: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, marginLeft: -8 },
  backArrow: { color: "#4338CA", fontSize: 28, lineHeight: 32 },
  backText: { color: "#4338CA", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  headingRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 10 },
  title: { color: "#0F172A", fontSize: 28, lineHeight: 36, fontWeight: "700" },
  countBadge: { backgroundColor: "#E0E7FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  countText: { color: "#3730A3", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  subtitle: { color: "#64748B", fontSize: 15, lineHeight: 24 },
  primaryBtn: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#4338CA", alignItems: "center", justifyContent: "center", marginTop: 16, alignSelf: "flex-start" },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { color: "#0F172A", fontSize: 18, lineHeight: 26, fontWeight: "700" },
  cardSub: { color: "#64748B", fontSize: 14, lineHeight: 22 },
  manageBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: "#E0E7FF" },
  manageText: { color: "#3730A3", fontSize: 13, fontWeight: "700" },
  cardActions: { flexDirection: "row", gap: 12 },
  editBtn: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  editText: { color: "#334155", fontSize: 14, fontWeight: "600" },
  deleteBtn: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
  deleteText: { color: "#B91C1C", fontSize: 14, fontWeight: "700" },
  denied: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  deniedTitle: { color: "#0F172A", fontSize: 22, fontWeight: "700" },
  deniedText: { color: "#64748B", fontSize: 15, lineHeight: 24, textAlign: "center" },
  deniedBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: "#4338CA" },
  deniedBtnText: { color: "#FFFFFF", fontWeight: "700" },
});
