import { StyleSheet, Text, View } from "react-native";
import type { CatatanPresensi } from "../../types";
import { formatWaktuPresensiPraktikan } from "../../utils/presensiPraktikan";
import { radius, warna } from "../../theme";

export function RingkasanPresensi({ presensi, tertunda = false }: { presensi: CatatanPresensi; tertunda?: boolean }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>BUKTI PRESENSI</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {tertunda ? "Menunggu sinkronisasi" : presensi.statusKehadiran}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Nama</Text>
        <Text style={styles.value}>{presensi.nama}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>NIM</Text>
        <Text style={styles.value}>{presensi.nim}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Waktu tercatat</Text>
        <Text style={styles.value}>{formatWaktuPresensiPraktikan(presensi.waktu)}</Text>
      </View>
      {presensi.catatan ? (
        <View style={styles.row}>
          <Text style={styles.label}>Catatan</Text>
          <Text style={styles.value}>{presensi.catatan}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  eyebrow: {
    color: warna.teksRedup,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  badge: {
    backgroundColor: warna.suksesLatar,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pil,
  },
  badgeText: {
    color: warna.suksesTeks,
    fontSize: 12,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: { color: warna.teksRedup, fontSize: 14, lineHeight: 20 },
  value: {
    flex: 1,
    color: warna.teks,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "right",
  },
});