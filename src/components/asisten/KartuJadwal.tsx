// src/components/asisten/KartuJadwal.tsx
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Sesi } from "../../types";
import { InformasiSesi } from "./InformasiSesi";
import { StatusSesi } from "./StatusSesi";
import { radius, warna } from "../../theme";

export function KartuJadwal({
  sesi,
  kelasLabel,
}: {
  sesi: Sesi;
  kelasLabel?: string;
}) {
  const router = useRouter();
  const nama = sesi.namaPraktikum?.trim() || "Praktikum";
  const modul = sesi.modul?.trim();
  const bukaDetail = () => {
    const id = sesi.id?.trim();
    if (!id) return;
    router.navigate({ pathname: "/asisten/[sesiId]", params: { sesiId: id } });
  };

  return (
    <TouchableOpacity
      accessibilityRole="link"
      accessibilityLabel={`Lihat detail ${nama}, kelas ${kelasLabel ?? "-"}`}
      accessibilityHint="Menampilkan informasi sesi praktikum."
      activeOpacity={0.85}
      onPress={bukaDetail}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <Text style={styles.topLabel}>Sesi praktikum</Text>
        <StatusSesi status={sesi.status} />
      </View>
      <View style={styles.heading}>
        <Text style={styles.title}>{nama}</Text>
        {modul ? <Text style={styles.module}>{modul}</Text> : null}
      </View>
      <InformasiSesi sesi={sesi} kelasLabel={kelasLabel} />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Kelola presensi ${nama}`}
        activeOpacity={0.85}
        onPress={bukaDetail}
        style={styles.action}
      >
        <Text style={styles.actionText}>Kelola presensi</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: warna.kartuKaca,
    borderWidth: 1,
    borderColor: warna.garis,
    borderRadius: radius.kartu,
    padding: 20,
    gap: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  topLabel: { color: warna.teksRedup, fontSize: 13, fontWeight: "500" },
  heading: { gap: 6 },
  title: { color: warna.teks, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  module: { color: warna.teksIsi, fontSize: 14, lineHeight: 22 },
  action: {
    minHeight: 50,
    borderRadius: radius.pil,
    backgroundColor: warna.utama,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  actionText: {
    color: warna.utamaTeks,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
});