import { Link } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Session } from "../../context/DataSistem";
import { InformasiSesi } from "./InformasiSesi";
import { StatusSesi } from "./StatusSesi";

export function KartuJadwal({ sesi }: { sesi: Session }) {
  const nama = sesi.namaPraktikum?.trim() || "Praktikum";
  const modul = sesi.modul?.trim();

  return (
    <Link
      href={{ pathname: "/asisten/[sesiId]", params: { sesiId: sesi.id } }}
      asChild
    >
      <TouchableOpacity
        accessibilityRole="link"
        accessibilityLabel={`Lihat detail ${nama}, kelas ${sesi.kelas}`}
        accessibilityHint="Menampilkan informasi sesi praktikum."
        activeOpacity={0.85}
        style={styles.card}
      >
        <StatusSesi status={sesi.status} />
        <View style={styles.heading}>
          <Text style={styles.title}>{nama}</Text>
          {modul ? <Text style={styles.module}>{modul}</Text> : null}
        </View>
        <InformasiSesi sesi={sesi} />
        <View style={styles.action}>
          <Text style={styles.actionText}>Lihat detail sesi</Text>
          <Text accessible={false} style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 20,
    gap: 20,
  },
  heading: { gap: 8 },
  title: { color: "#0F172A", fontSize: 20, lineHeight: 28, fontWeight: "700" },
  module: { color: "#64748B", fontSize: 14, lineHeight: 22 },
  action: {
    minHeight: 48,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  actionText: {
    flex: 1,
    color: "#4338CA",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
  },
  arrow: { color: "#4338CA", fontSize: 28, lineHeight: 32 },
});