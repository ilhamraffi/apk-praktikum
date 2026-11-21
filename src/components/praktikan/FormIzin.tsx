import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { pesanError } from "../../lib/errors";
import { ajukanIzinPraktikan, BATAS_ALASAN } from "../../hooks/useIzinPraktikan";
import { warna } from "../../theme";

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
      <Text style={styles.subtitle}>Model lokal mengategorikan alasan menjadi sakit, keluarga, atau keperluan. Hasil hanya informasi pendukung; keputusan izin tetap oleh asisten.</Text>
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
        {memproses ? <ActivityIndicator color={warna.utamaTeks} /> : null}
        <Text style={styles.buttonText}>{memproses ? "Menyimpan..." : "Kirim pengajuan"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 16, backgroundColor: warna.kartu, borderWidth: 1, borderColor: warna.garis, gap: 10 },
  title: { color: warna.teks, fontSize: 19, fontWeight: "700" },
  subtitle: { color: warna.teksRedup, lineHeight: 21 },
  input: { minHeight: 110, borderWidth: 1, borderColor: warna.garisKuat, borderRadius: 10, padding: 12, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", color: warna.teksRedup, fontSize: 12 },
  error: { color: warna.error, lineHeight: 20 },
  button: { minHeight: 48, borderRadius: 10, backgroundColor: warna.utama, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  buttonText: { color: warna.utamaTeks, fontWeight: "700" },
});
