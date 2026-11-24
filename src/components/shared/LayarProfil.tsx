// src/components/shared/LayarProfil.tsx
// Tab Profil untuk kedua peran: identitas akun dan tombol Keluar.
// Menggantikan bar identitas atas dan tombol Keluar melayang (TampilanBersama).
import { router } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { pesanError } from "../../lib/errors";
import { radius, warna } from "../../theme";
import { PeringatanNotifikasi } from "./PeringatanPerangkat";

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={styles.baris}>
      <Text style={styles.barisLabel}>{label}</Text>
      <Text style={styles.barisNilai}>{nilai || "-"}</Text>
    </View>
  );
}

export function LayarProfil() {
  const {
    user,
    role,
    signOut,
    statusNotifikasi,
    errorNotifikasi,
    aktifkanUlangNotifikasi,
  } = useAuth();
  if (!user) return null;

  const peran = (role ?? user.role) === "ASISTEN" ? "Asisten" : "Praktikan";
  const inisial = user.nama?.trim().charAt(0).toUpperCase() || "?";

  const konfirmasiKeluar = () => {
    Alert.alert("Keluar dari akun?", "Kamu perlu masuk lagi untuk memakai aplikasi.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: () => {
          Promise.resolve(signOut()).catch((error) =>
            Alert.alert("Gagal keluar", pesanError(error)),
          );
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.judul}>Profil</Text>

        <View style={styles.kartuProfil}>
          <View style={styles.avatar}>
            <Text style={styles.inisial}>{inisial}</Text>
          </View>
          <Text style={styles.nama}>{user.nama}</Text>
          <View style={styles.lencana}>
            <Text style={styles.lencanaTeks}>{peran}</Text>
          </View>
        </View>

        <View style={styles.kartu}>
          <Text style={styles.judulKartu}>Informasi akun</Text>
          <Baris label="NIM" nilai={user.nim} />
          <Baris label="Email" nilai={user.email} />
          <Baris label="Peran aktif" nilai={peran} />
        </View>

        {statusNotifikasi ? (
          <PeringatanNotifikasi
            status={statusNotifikasi}
            pesanError={errorNotifikasi}
            onCobaLagi={() => void aktifkanUlangNotifikasi?.()}
          />
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Buka peta laboratorium"
          activeOpacity={0.85}
          onPress={() => router.push("/peta")}
          style={styles.tombolPeta}
        >
          <Text style={styles.tombolPetaTeks}>Buka peta laboratorium</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Ganti peran ruang kerja"
          activeOpacity={0.85}
          onPress={() => router.push("/pilih-peran")}
          style={styles.gantiPeran}
        >
          <Text style={styles.gantiPeranTeks}>Pilih / Ganti peran</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Keluar dari akun"
          activeOpacity={0.85}
          onPress={konfirmasiKeluar}
          style={styles.keluar}
        >
          <Text style={styles.keluarTeks}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: warna.latar },
  content: { width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, paddingBottom: 124, gap: 16 },
  judul: { color: warna.teks, fontSize: 28, lineHeight: 36, fontWeight: "700", marginBottom: 4 },
  kartuProfil: {
    alignItems: "center",
    gap: 10,
    padding: 24,
    borderRadius: radius.kartu,
    borderWidth: 1,
    borderColor: warna.garis,
    backgroundColor: warna.kartuKaca,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: warna.utama,
    alignItems: "center",
    justifyContent: "center",
  },
  inisial: { color: warna.utamaTeks, fontSize: 30, fontWeight: "700" },
  nama: { color: warna.teks, fontSize: 20, lineHeight: 28, fontWeight: "700", textAlign: "center" },
  lencana: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pil,
    backgroundColor: warna.permukaan,
  },
  lencanaTeks: { color: warna.utama, fontSize: 13, fontWeight: "700" },
  kartu: {
    padding: 20,
    gap: 4,
    borderRadius: radius.kartu,
    borderWidth: 1,
    borderColor: warna.garis,
    backgroundColor: warna.kartuKaca,
  },
  judulKartu: { color: warna.teks, fontSize: 16, lineHeight: 24, fontWeight: "700", marginBottom: 6 },
  baris: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: warna.garis,
  },
  barisLabel: { color: warna.teksRedup, fontSize: 14 },
  barisNilai: { flex: 1, color: warna.teks, fontSize: 14, fontWeight: "600", textAlign: "right" },
  tombolPeta: {
    minHeight: 52,
    borderRadius: radius.pil,
    borderWidth: 1,
    borderColor: warna.garis,
    backgroundColor: warna.kartuKaca,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  tombolPetaTeks: { color: warna.utama, fontSize: 15, fontWeight: "700" },
  gantiPeran: {
    minHeight: 52,
    borderRadius: radius.pil,
    backgroundColor: warna.utama,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  gantiPeranTeks: { color: warna.utamaTeks, fontSize: 15, fontWeight: "700" },
  keluar: {
    minHeight: 52,
    borderRadius: radius.pil,
    borderWidth: 1,
    borderColor: warna.errorGaris,
    backgroundColor: warna.kartu,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  keluarTeks: { color: warna.error, fontSize: 15, fontWeight: "700" },
});