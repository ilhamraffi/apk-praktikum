// src/components/praktikan/KartuJadwal.tsx
// NOTE: adaptasi minimal agar kompatibel dengan tipe Sprint 2. Pemfilteran
// jadwal per kelas praktikan menjadi tanggung jawab Fauzan.
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Sesi } from "../../types";
import { InformasiSesi } from "../asisten/InformasiSesi";
import { StatusSesi } from "../asisten/StatusSesi";
import { radius, warna } from "../../theme";

export function KartuJadwalPraktikan({
  sesi,
  kelasLabel,
}: {
  sesi: Sesi;
  kelasLabel?: string;
}) {
  const router = useRouter();
  const bukaDetail = () => {
    const id = sesi.id?.trim();
    if (!id) return;
    router.navigate({ pathname: "/praktikan/[sesiId]", params: { sesiId: id } });
  };
  const bukaPresensi = () => {
    const id = sesi.id?.trim();
    if (!id) return;
    router.navigate({
      pathname: "/praktikan/presensi/[sessionId]",
      params: { sessionId: id },
    });
  };
  const sesiDibuka = sesi.status === "DIBUKA";

  return (
    <TouchableOpacity
      accessibilityRole="link"
      accessibilityLabel={`Lihat detail ${sesi.namaPraktikum}, kelas ${kelasLabel ?? "-"}`}
      activeOpacity={0.85}
      onPress={bukaDetail}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <Text style={styles.topLabel}>
          {sesiDibuka ? "Praktikum hari ini" : "Jadwal praktikum"}
        </Text>
        <StatusSesi status={sesi.status} />
      </View>
      <View style={styles.heading}>
        <Text style={styles.title}>{sesi.namaPraktikum}</Text>
        <Text style={styles.module}>{sesi.modul}</Text>
      </View>
      <InformasiSesi sesi={sesi} kelasLabel={kelasLabel} />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          sesiDibuka
            ? `Buka presensi ${sesi.namaPraktikum}`
            : `Lihat detail ${sesi.namaPraktikum}`
        }
        activeOpacity={0.85}
        onPress={sesiDibuka ? bukaPresensi : bukaDetail}
        style={styles.action}
      >
        <Text style={styles.actionText}>
          {sesiDibuka ? "Isi presensi" : "Lihat detail sesi"}
        </Text>
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
  actionText: { color: warna.utamaTeks, fontSize: 15, lineHeight: 22, fontWeight: "700" },
});