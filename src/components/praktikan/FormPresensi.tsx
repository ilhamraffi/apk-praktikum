import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { Session } from "../../context/DataSistem";

type Props = { sesi: Session; visible: boolean; onClose: () => void; onSubmit: (status: "Hadir" | "Izin", catatan: string) => boolean };

export function FormPresensi({ sesi, visible, onClose, onSubmit }: Props) {
  const [status, setStatus] = useState<"Hadir" | "Izin">("Hadir");
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    setError("");
    if (onSubmit(status, catatan)) {
      setCatatan("");
      onClose();
    } else {
      setError("Presensi tidak dapat dicatat. Periksa status sesi atau riwayat presensimu.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Tutup form presensi" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text accessibilityRole="header" style={styles.title}>Form presensi</Text>
          <Text style={styles.subtitle}>{sesi.namaPraktikum}</Text>
          <Text style={styles.label}>Status kehadiran</Text>
          <View style={styles.statusRow}>
            {(["Hadir", "Izin"] as const).map((item) => (
              <TouchableOpacity key={item} onPress={() => setStatus(item)} style={[styles.statusButton, status === item && styles.statusButtonActive]}>
                <Text style={[styles.statusText, status === item && styles.statusTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Catatan (opsional)</Text>
          <TextInput value={catatan} onChangeText={setCatatan} placeholder="Tambahkan catatan" multiline style={styles.input} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity onPress={submit} style={styles.submitButton}>
            <Text style={styles.submitText}>Kirim presensi</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.45)" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32, gap: 10 },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: "#CBD5E1", marginBottom: 10 },
  title: { color: "#0F172A", fontSize: 22, lineHeight: 30, fontWeight: "700" },
  subtitle: { color: "#64748B", fontSize: 14, lineHeight: 22, marginBottom: 8 },
  label: { color: "#334155", fontSize: 14, lineHeight: 22, fontWeight: "600", marginTop: 6 },
  statusRow: { flexDirection: "row", gap: 10 },
  statusButton: { flex: 1, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  statusButtonActive: { backgroundColor: "#4338CA", borderColor: "#4338CA" },
  statusText: { color: "#334155", fontWeight: "600" },
  statusTextActive: { color: "#FFFFFF" },
  input: { minHeight: 72, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 12, textAlignVertical: "top", color: "#0F172A" },
  error: { color: "#B91C1C", fontSize: 13, lineHeight: 20 },
  submitButton: { minHeight: 50, borderRadius: 12, backgroundColor: "#1E1B4B", alignItems: "center", justifyContent: "center", marginTop: 8 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cancelButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#4338CA", fontWeight: "600" },
});
