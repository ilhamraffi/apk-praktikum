// src/components/shared/HeaderBeranda.tsx
// Kepala beranda: merek, sapaan sesuai jam, dan tanggal hari ini.
import { StyleSheet, Text, View } from "react-native";
import { namaDepan, sapaanWaktu, tanggalLengkap } from "../../utils/ringkasanSesi";
import { radius, warna } from "../../theme";

type HeaderBerandaProps = {
  nama?: string;
  /** Keterangan peran, mis. "ASISTEN" atau "PRAKTIKAN". */
  peran: string;
};

export function HeaderBeranda({ nama, peran }: HeaderBerandaProps) {
  const sekarang = new Date();
  const depan = namaDepan(nama);
  const labelPeran = peran.replace(/^Ruang\s+/i, "").toUpperCase();

  return (
    <View style={styles.wadah}>
      <View style={styles.barAtas}>
        <Text style={styles.namaApp}>HadirLab</Text>
        <View accessible={false} style={styles.loncengTombol}>
          <View style={styles.loncengBadan} />
          <View style={styles.loncengAlas} />
          <View style={styles.loncengBandul} />
        </View>
      </View>

      <Text accessibilityRole="header" style={styles.sapaan}>
        {sapaanWaktu(sekarang)}
        {depan ? `, ${depan}` : ""}
      </Text>
      <Text style={styles.subjudul}>
        <Text style={styles.peran}>{labelPeran}</Text>
        {"  •  "}
        {tanggalLengkap(sekarang)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wadah: { gap: 4 },
  barAtas: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  namaApp: {
    color: warna.teks,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  loncengTombol: {
    width: 44,
    height: 44,
    borderRadius: radius.pil,
    backgroundColor: warna.kartuKaca,
    borderWidth: 1,
    borderColor: warna.garis,
    alignItems: "center",
    justifyContent: "center",
  },
  loncengBadan: {
    width: 14,
    height: 12,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: warna.utama,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  loncengAlas: {
    width: 18,
    height: 2,
    backgroundColor: warna.utama,
    borderRadius: 1,
  },
  loncengBandul: {
    width: 4,
    height: 2.5,
    backgroundColor: warna.utama,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    marginTop: 1.5,
  },
  sapaan: {
    color: warna.teks,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
  },
  subjudul: {
    color: warna.teksRedup,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  peran: {
    color: warna.teksRedup,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
});