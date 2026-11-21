// src/components/asisten/KelolaPeserta.tsx
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Kelas, ProfilUser } from "../../types";
import { warna } from "../../theme";

type KelolaPesertaProps = {
  visible: boolean;
  kelas: Kelas;
  daftarPraktikan: ProfilUser[];
  onBatal: () => void;
  onTambah: (uid: string) => Promise<void>;
  onHapus: (uid: string) => Promise<void>;
};

export function KelolaPeserta({
  visible,
  kelas,
  daftarPraktikan,
  onBatal,
  onTambah,
  onHapus,
}: KelolaPesertaProps) {
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const setUid = kelas.pesertaUids ?? [];
  const hanyaPraktikan = daftarPraktikan.filter((u) => u.role === "PRAKTIKAN");
  const peserta = hanyaPraktikan.filter((u) => u.uid && setUid.includes(u.uid));
  const tersedia = hanyaPraktikan.filter((u) => u.uid && !setUid.includes(u.uid));

  const aksi = async (uid: string, fn: () => Promise<void>) => {
    setBusyUid(uid);
    try {
      await fn();
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onBatal}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.sheet}>
          <Text accessibilityRole="header" style={styles.title}>
            Peserta kelas {kelas.nama} ({kelas.kode})
          </Text>
          <Text style={styles.subtitle}>
            {peserta.length} dari {setUid.length} peserta terdaftar ditemukan.
          </Text>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.section}>Peserta saat ini</Text>
            {peserta.length === 0 ? (
              <Text style={styles.empty}>Belum ada peserta.</Text>
            ) : (
              peserta.map((u) => (
                <View key={u.uid} style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{u.nama}</Text>
                    <Text style={styles.rowNim}>{u.nim}</Text>
                  </View>
                  <TouchableOpacity
                    disabled={busyUid === u.uid}
                    onPress={() => aksi(u.uid!, () => onHapus(u.uid!))}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeText}>
                      {busyUid === u.uid ? "..." : "Hapus"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <Text style={styles.section}>Tambah praktikan</Text>
            {tersedia.length === 0 ? (
              <Text style={styles.empty}>
                Tidak ada praktikan lain yang bisa ditambahkan.
              </Text>
            ) : (
              tersedia.map((u) => (
                <View key={u.uid} style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{u.nama}</Text>
                    <Text style={styles.rowNim}>{u.nim}</Text>
                  </View>
                  <TouchableOpacity
                    disabled={busyUid === u.uid}
                    onPress={() => aksi(u.uid!, () => onTambah(u.uid!))}
                    style={styles.addBtn}
                  >
                    <Text style={styles.addText}>
                      {busyUid === u.uid ? "..." : "Tambah"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={onBatal}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Text style={styles.closeText}>Tutup</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: warna.overlay },
  sheet: {
    backgroundColor: warna.kartu,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  title: { color: warna.teks, fontSize: 22, lineHeight: 30, fontWeight: "700" },
  subtitle: { color: warna.teksRedup, fontSize: 14, lineHeight: 22, marginTop: 6 },
  scroll: { marginTop: 16 },
  scrollContent: { paddingBottom: 8 },
  section: { color: warna.teksIsi, fontSize: 14, lineHeight: 22, fontWeight: "700", marginBottom: 10, marginTop: 6 },
  empty: { color: warna.teksRedup, fontSize: 14, lineHeight: 22, marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: warna.permukaanLembut,
  },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { color: warna.teks, fontSize: 15, lineHeight: 22, fontWeight: "600" },
  rowNim: { color: warna.teksRedup, fontSize: 13, lineHeight: 20 },
  addBtn: {
    backgroundColor: warna.utama,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addText: { color: warna.utamaTeks, fontSize: 13, fontWeight: "700" },
  removeBtn: {
    borderWidth: 1,
    borderColor: warna.errorGaris,
    backgroundColor: warna.errorLatar,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  removeText: { color: warna.error, fontSize: 13, fontWeight: "700" },
  close: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: warna.permukaanLembut,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  closeText: { color: warna.teksIsi, fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.8 },
});