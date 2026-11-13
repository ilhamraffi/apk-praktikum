// src/components/asisten/KonfirmasiHapus.tsx
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type KonfirmasiHapusProps = {
  visible: boolean;
  judul: string;
  pesan: string;
  memproses?: boolean;
  onBatal: () => void;
  onKonfirmasi: () => void;
};

export function KonfirmasiHapus({
  visible,
  judul,
  pesan,
  memproses,
  onBatal,
  onKonfirmasi,
}: KonfirmasiHapusProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onBatal}>
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
            <Text style={styles.description}>{pesan}</Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onBatal}
                disabled={memproses}
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
                disabled={memproses}
                style={({ pressed }) => [
                  styles.button,
                  styles.confirm,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.confirmText}>
                  {memproses ? "Menghapus..." : "Ya, Hapus"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)" },
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 440, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24 },
  title: { color: "#0F172A", fontSize: 22, lineHeight: 30, fontWeight: "700" },
  description: { color: "#64748B", fontSize: 15, lineHeight: 24, marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 24 },
  button: { flexGrow: 1, flexBasis: 140, minHeight: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", padding: 12 },
  cancel: { backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  confirm: { backgroundColor: "#B91C1C" },
  pressed: { opacity: 0.75 },
  cancelText: { color: "#334155", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  confirmText: { color: "#FFFFFF", fontSize: 14, lineHeight: 22, fontWeight: "700" },
});
