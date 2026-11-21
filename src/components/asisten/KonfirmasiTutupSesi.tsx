import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { warna } from "../../theme";

type KonfirmasiTutupSesiProps = {
  visible: boolean;
  namaPraktikum: string;
  onBatal: () => void;
  onKonfirmasi: () => void;
};

export function KonfirmasiTutupSesi({
  visible,
  namaPraktikum,
  onBatal,
  onKonfirmasi,
}: KonfirmasiTutupSesiProps) {
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
              Tutup Sesi Praktikum?
            </Text>
            <Text style={styles.sessionName}>{namaPraktikum}</Text>
            <Text style={styles.description}>
              Apakah Anda yakin ingin menutup sesi ini? Praktikan tidak dapat melakukan
              presensi setelah sesi ditutup.
            </Text>
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
                <Text style={styles.confirmText}>Ya, Tutup Sesi</Text>
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
  description: { color: warna.teksRedup, fontSize: 15, lineHeight: 24, marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 24 },
  button: { flexGrow: 1, flexBasis: 140, minHeight: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", padding: 12 },
  cancel: { backgroundColor: warna.permukaanLembut, borderWidth: 1, borderColor: warna.garis },
  confirm: { backgroundColor: warna.error },
  pressed: { opacity: 0.75 },
  cancelText: { color: warna.teksIsi, fontSize: 14, lineHeight: 22, fontWeight: "600" },
  confirmText: { color: warna.utamaTeks, fontSize: 14, lineHeight: 22, fontWeight: "700" },
});