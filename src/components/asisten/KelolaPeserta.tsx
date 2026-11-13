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
  const peserta = daftarPraktikan.filter((u) => u.uid && setUid.includes(u.uid));
  const tersedia = daftarPraktikan.filter((u) => u.uid && !setUid.includes(u.uid));

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
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.45)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  title: { color: "#0F172A", fontSize: 22, lineHeight: 30, fontWeight: "700" },
  subtitle: { color: "#64748B", fontSize: 14, lineHeight: 22, marginTop: 6 },
  scroll: { marginTop: 16 },
  scrollContent: { paddingBottom: 8 },
  section: { color: "#334155", fontSize: 14, lineHeight: 22, fontWeight: "700", marginBottom: 10, marginTop: 6 },
  empty: { color: "#64748B", fontSize: 14, lineHeight: 22, marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { color: "#0F172A", fontSize: 15, lineHeight: 22, fontWeight: "600" },
  rowNim: { color: "#64748B", fontSize: 13, lineHeight: 20 },
  addBtn: {
    backgroundColor: "#4338CA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  removeBtn: {
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  removeText: { color: "#B91C1C", fontSize: 13, fontWeight: "700" },
  close: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  closeText: { color: "#334155", fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.8 },
});
