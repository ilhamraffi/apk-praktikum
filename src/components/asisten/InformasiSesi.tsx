// src/components/asisten/InformasiSesi.tsx
import { StyleSheet, Text, View } from "react-native";
import type { Sesi } from "../../types";
import { teksWaktuSesi } from "../../utils/waktuSesi";

type InformasiSesiProps = {
  sesi: Pick<Sesi, "mulai" | "selesai" | "waktu" | "ruangan">;
  kelasLabel?: string;
};

export function InformasiSesi({ sesi, kelasLabel }: InformasiSesiProps) {
  const informasi = [
    { label: "Kelas", nilai: kelasLabel ?? "" },
    { label: "Ruangan", nilai: sesi.ruangan },
    { label: "Waktu", nilai: teksWaktuSesi(sesi) },
  ];

  return (
    <View style={styles.container}>
      {informasi.map(({ label, nilai }) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>
            {nilai?.trim() || "Belum tersedia"}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  label: { width: 68, color: "#64748B", fontSize: 14, lineHeight: 22 },
  value: {
    flex: 1,
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
});
