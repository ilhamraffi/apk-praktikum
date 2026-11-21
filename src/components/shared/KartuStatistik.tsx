// src/components/shared/KartuStatistik.tsx
// Kartu angka besar + label, disusun sebaris di beranda.
import { StyleSheet, Text, View } from "react-native";
import { radius, warna } from "../../theme";

type KartuStatistikProps = { angka: number | string; label: string };

export function KartuStatistik({ angka, label }: KartuStatistikProps) {
  return (
    <View accessible accessibilityLabel={`${angka} ${label}`} style={styles.kartu}>
      <Text style={styles.angka}>{angka}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kartu: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 4,
    borderRadius: radius.kartu,
    borderWidth: 1,
    borderColor: warna.garis,
    backgroundColor: warna.kartuKaca,
  },
  angka: { color: warna.teks, fontSize: 28, lineHeight: 34, fontWeight: "800" },
  label: { color: warna.teksRedup, fontSize: 13, lineHeight: 18 },
});