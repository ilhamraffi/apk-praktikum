// src/components/asisten/InformasiSesi.tsx
import { StyleSheet, Text, View } from "react-native";
import type { Sesi } from "../../types";
import { teksWaktuSesi } from "../../utils/waktuSesi";
import { warna } from "../../theme";

type InformasiSesiProps = {
  sesi: Pick<Sesi, "mulai" | "selesai" | "waktu" | "ruangan">;
  kelasLabel?: string;
};

export function InformasiSesi({ sesi, kelasLabel }: InformasiSesiProps) {
  const lokasi = [sesi.ruangan?.trim(), kelasLabel?.trim()]
    .filter(Boolean)
    .join(" · ");
  const informasi = [
    { label: "Waktu", nilai: teksWaktuSesi(sesi) },
    { label: "Lokasi", nilai: lokasi || sesi.ruangan },
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
  container: {
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: warna.garis,
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