import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { warna } from "../../theme";

type KonfirmasiBukaSesiProps = {
  visible: boolean;
  namaPraktikum: string;
  judul?: string;
  deskripsi?: string;
  labelKonfirmasi?: string;
  peringatan?: string | null;
  onBatal: () => void;
  onKonfirmasi: () => void;
};

export function KonfirmasiBukaSesi({
  visible,
  namaPraktikum,
  judul = "Mulai Sesi Praktikum?",
  deskripsi = "Apakah Anda yakin ingin membuka sesi ini? Praktikan dapat melakukan presensi setelah sesi dibuka.",
  labelKonfirmasi = "Ya, Buka Sesi",
  peringatan = null,
  onBatal,
  onKonfirmasi,
}: KonfirmasiBukaSesiProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onBatal}
    >
      <SafeAreaView style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.container}>
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={onBatal}
            style={styles.dialog}
          >
            <Text accessibilityRole="header" style={styles.title}>
              {judul}
            </Text>
            <Text style={styles.sessionName}>{namaPraktikum}</Text>
            {peringatan ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{peringatan}</Text>
              </View>
            ) : null}
            <Text style={styles.description}>{deskripsi}</Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onBatal}
                style={({ pressed }) => [
                  styles.button,
                  styles.cancel,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.cancelText}>Batal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onKonfirmasi}
                style={({ pressed }) => [
                  styles.button,
                  styles.confirm,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.confirmText}>{labelKonfirmasi}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: warna.overlay },
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 440, backgroundColor: warna.kartu, borderRadius: 20, padding: 24 },
  title: { color: warna.teks, fontSize: 22, lineHeight: 30, fontWeight: "700" },
  sessionName: { color: warna.utama, fontSize: 14, lineHeight: 22, fontWeight: "600", marginTop: 14 },
  warningBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: warna.peringatanLatar,
  },
  warningText: {
    color: warna.peringatanTeks,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  description: { color: warna.teksRedup, fontSize: 15, lineHeight: 24, marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 24 },
  button: { flexGrow: 1, flexBasis: 140, minHeight: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", padding: 12 },
  cancel: { backgroundColor: warna.permukaanLembut, borderWidth: 1, borderColor: warna.garis },
  confirm: { backgroundColor: warna.utama },
  pressed: { opacity: 0.75 },
  cancelText: { color: warna.teksIsi, fontSize: 14, lineHeight: 22, fontWeight: "600" },
  confirmText: { color: warna.utamaTeks, fontSize: 14, lineHeight: 22, fontWeight: "700" },
});