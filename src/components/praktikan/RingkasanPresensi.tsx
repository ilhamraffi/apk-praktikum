import { StyleSheet, Text, View } from "react-native";
import type { CatatanPresensi } from "../../types";
import { formatWaktuPresensiPraktikan } from "../../utils/presensiPraktikan";

export function RingkasanPresensi({ presensi, tertunda = false }: { presensi: CatatanPresensi; tertunda?: boolean }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      <Text style={styles.status}>{tertunda ? "Menunggu sinkronisasi" : `Tercatat: ${presensi.statusKehadiran}`}</Text>
      <Text style={styles.text}>{presensi.nama} · {presensi.nim}</Text>
      <Text style={styles.text}>{formatWaktuPresensiPraktikan(presensi.waktu)}</Text>
      {presensi.catatan ? <Text style={styles.text}>Catatan: {presensi.catatan}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  status: { color: "#166534", fontSize: 15, lineHeight: 24, fontWeight: "700" },
  text: { color: "#475569", fontSize: 14, lineHeight: 23 },
});
