import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { pesanError } from "../../lib/errors";
import { ajukanIzinPraktikan, BATAS_ALASAN } from "../../hooks/useIzinPraktikan";

export function FormIzin({ uid, sessionId, onSelesai }: { uid: string; sessionId: string; onSelesai: () => void }) {
  const [alasan, setAlasan] = useState("");
  const [error, setError] = useState("");
  const [memproses, setMemproses] = useState(false);

  const simpan = async () => {
    setError("");
    setMemproses(true);
    try {
      await ajukanIzinPraktikan({ uid, sessionId, alasan });
      onSelesai();
    } catch (err) {
      setError(pesanError(err));
    } finally {
      setMemproses(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Ajukan izin</Text>
      <Text style={styles.subtitle}>Tulis alasan ketidakhadiran untuk sesi ini.</Text>
      <TextInput
        value={alasan}
        onChangeText={setAlasan}
        editable={!memproses}
        multiline
        maxLength={BATAS_ALASAN}
        placeholder="Contoh: sedang sakit..."
        style={styles.input}
      />
      <Text style={styles.counter}>{alasan.length}/{BATAS_ALASAN}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <TouchableOpacity onPress={simpan} disabled={memproses} style={styles.button}>
        {memproses ? <ActivityIndicator color="#FFFFFF" /> : null}
        <Text style={styles.buttonText}>{memproses ? "Menyimpan..." : "Kirim pengajuan"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", gap: 10 },
  title: { color: "#0F172A", fontSize: 19, fontWeight: "700" },
  subtitle: { color: "#64748B", lineHeight: 21 },
  input: { minHeight: 110, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, padding: 12, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", color: "#64748B", fontSize: 12 },
  error: { color: "#B91C1C", lineHeight: 20 },
  button: { minHeight: 48, borderRadius: 10, backgroundColor: "#4338CA", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  buttonText: { color: "#FFFFFF", fontWeight: "700" },
});
