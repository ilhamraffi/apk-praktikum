// src/components/navigasi/IkonTab.tsx
// Ikon navbar yang digambar dari View biasa (tanpa paket ikon, jadi tidak butuh build ulang).
// Kanvas 24x24, gaya garis 2px.
import { StyleSheet, View } from "react-native";

export type NamaIkon = "beranda" | "kelas" | "izin" | "riwayat" | "profil";

type IkonTabProps = { nama: NamaIkon; warna: string; ukuran?: number };

export function IkonTab({ nama, warna, ukuran = 24 }: IkonTabProps) {
  const garis = { borderColor: warna };
  const isi = { backgroundColor: warna };

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.kanvas, { transform: [{ scale: ukuran / 24 }] }]}
    >
      {nama === "beranda" ? (
        <>
          <View style={[styles.atapKiri, isi]} />
          <View style={[styles.atapKanan, isi]} />
          <View style={[styles.badanRumah, garis]} />
          <View style={[styles.pintuRumah, garis]} />
        </>
      ) : null}

      {nama === "kelas" ? (
        <>
          <View style={[styles.buku, garis]} />
          <View style={[styles.jilidBuku, isi]} />
          <View style={[styles.barisBuku, isi, { top: 8 }]} />
          <View style={[styles.barisBuku, isi, { top: 13 }]} />
        </>
      ) : null}

      {nama === "izin" ? (
        <>
          <View style={[styles.dokumen, garis]} />
          <View style={[styles.baris, isi, { top: 8 }]} />
          <View style={[styles.baris, isi, { top: 13 }]} />
        </>
      ) : null}

      {nama === "riwayat" ? (
        <>
          <View style={[styles.jam, garis]} />
          <View style={[styles.jarumTegak, isi]} />
          <View style={[styles.jarumMendatar, isi]} />
        </>
      ) : null}

      {nama === "profil" ? (
        <>
          <View style={[styles.kepala, garis]} />
          <View style={[styles.bahu, garis]} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kanvas: { width: 24, height: 24 },
  // Rumah: dua bilah miring membentuk atap segitiga, badan rumah di bawah, dan pintu di tengah.
  atapKiri: {
    position: "absolute",
    left: 2,
    top: 7,
    width: 12,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: "-42deg" }],
  },
  atapKanan: {
    position: "absolute",
    left: 10,
    top: 7,
    width: 12,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: "42deg" }],
  },
  badanRumah: {
    position: "absolute",
    left: 5,
    top: 10,
    width: 14,
    height: 11,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  pintuRumah: {
    position: "absolute",
    left: 10,
    top: 15,
    width: 4,
    height: 6,
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  buku: {
    position: "absolute",
    left: 4,
    top: 2,
    width: 16,
    height: 20,
    borderWidth: 2,
    borderRadius: 3,
  },
  jilidBuku: { position: "absolute", left: 8, top: 4, width: 2, height: 16 },
  barisBuku: { position: "absolute", left: 12, width: 5, height: 2, borderRadius: 1 },
  dokumen: {
    position: "absolute",
    left: 4,
    top: 2,
    width: 16,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
  },
  baris: { position: "absolute", left: 8, width: 8, height: 2, borderRadius: 1 },
  jam: {
    position: "absolute",
    left: 2,
    top: 2,
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 10,
  },
  jarumTegak: { position: "absolute", left: 11, top: 6, width: 2, height: 7, borderRadius: 1 },
  jarumMendatar: { position: "absolute", left: 11, top: 11, width: 5, height: 2, borderRadius: 1 },
  kepala: {
    position: "absolute",
    left: 8,
    top: 2,
    width: 8,
    height: 8,
    borderWidth: 2,
    borderRadius: 4,
  },
  bahu: {
    position: "absolute",
    left: 4,
    top: 13,
    width: 16,
    height: 9,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
});