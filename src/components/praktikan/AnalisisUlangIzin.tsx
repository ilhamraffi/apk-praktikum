import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { analisisUlangIzinPraktikan } from "../../hooks/useIzinPraktikan";
import { pesanError } from "../../lib/errors";
import type { PengajuanIzin } from "../../types";

export function AnalisisUlangIzin({ uid, pengajuan, dariCache }: { uid: string; pengajuan: PengajuanIzin; dariCache: boolean }) {
  const [memproses, setMemproses] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const kunci = useRef(false);
  const aktif = useRef(true);
  useEffect(() => {
    aktif.current = true;
    return () => { aktif.current = false; };
  }, []);
  const boleh = pengajuan.status === "pending" && pengajuan.uid === uid && Boolean(pengajuan.id) && !dariCache;
  const analisis = async () => {
    if (!boleh || kunci.current) return;
    kunci.current = true;
    setMemproses(true);
    setPesan(null);
    setError(null);
    try {
      await analisisUlangIzinPraktikan({ uid, izinId: pengajuan.id! });
      if (aktif.current) setPesan("Hasil analisis diperbarui.");
    } catch (kesalahan) {
      if (aktif.current) setError(pesanError(kesalahan));
    } finally {
      if (aktif.current) { kunci.current = false; setMemproses(false); }
    }
  };
  if (pengajuan.status !== "pending" || pengajuan.uid !== uid) return null;
  return (
    <View style={styles.section}>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !boleh || memproses, busy: memproses }} disabled={!boleh || memproses} onPress={analisis} style={[styles.button, (!boleh || memproses) && styles.disabled]}>
        {memproses ? <ActivityIndicator color="#4338CA" /> : null}
        <Text style={styles.buttonText}>{memproses ? "Menganalisis..." : "Analisis ulang alasan"}</Text>
      </TouchableOpacity>
      {dariCache ? <Text style={styles.description}>Hubungkan ke server untuk menyimpan hasil analisis.</Text> : null}
      {pesan ? <Text accessibilityLiveRegion="polite" style={styles.description}>{pesan}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  button: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 10 },
  buttonText: { color: "#4338CA", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  description: { color: "#64748B", fontSize: 13, lineHeight: 21 },
  error: { color: "#B91C1C", fontSize: 13, lineHeight: 21 },
});
