// src/app/pilih-peran.tsx
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Loading } from "../components/shared/StatusLayar";
import { useAuth } from "../context/AuthContext";
import { radius, warna } from "../theme";
import type { Role } from "../types";

export default function PilihPeranScreen() {
  const { user, role, loading, pilihPeran } = useAuth();
  const bisaAsisten = user?.role === "ASISTEN";
  const [pilihan, setPilihan] = useState<Role>(
    role ?? (bisaAsisten ? "ASISTEN" : "PRAKTIKAN"),
  );
  const [pesan, setPesan] = useState("");

  if (loading) return <Loading label="Memuat peran..." />;

  const kembali = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(role === "ASISTEN" ? "/asisten" : "/praktikan");
    }
  };

  const pilihKartu = (target: Role) => {
    setPesan("");
    if (target === "ASISTEN" && !bisaAsisten) {
      setPesan("Akun kampus Anda terdaftar sebagai Praktikan dan tidak memiliki akses ruang Asisten.");
      return;
    }
    setPilihan(target);
  };

  const lanjut = () => {
    if (pilihan === "ASISTEN" && !bisaAsisten) {
      setPesan("Akun kampus Anda hanya memiliki akses sebagai Praktikan.");
      return;
    }
    pilihPeran(pilihan);
    router.replace(pilihan === "ASISTEN" ? "/asisten" : "/praktikan");
  };

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            onPress={kembali}
            style={styles.backCircle}
          >
            <Text accessible={false} style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.topTitle}>Pilih peran</Text>
        </View>

        <Text style={styles.headline}>Satu akun,{"\n"}dua ruang berkarya.</Text>
        <Text style={styles.subheadline}>
          Pilih peran untuk melanjutkan. Anda dapat berganti peran melalui menu Profil.
        </Text>

        <View style={styles.cardList}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: pilihan === "ASISTEN", disabled: !bisaAsisten }}
            onPress={() => pilihKartu("ASISTEN")}
            style={[
              styles.roleCard,
              pilihan === "ASISTEN" && styles.roleCardActive,
              !bisaAsisten && styles.roleCardDisabled,
            ]}
          >
            <View style={styles.roleHeader}>
              <View style={styles.iconBox}>
                <View style={styles.iconPersonHead} />
                <View style={styles.iconPersonBody} />
              </View>
              <Text style={styles.roleTitle}>Asisten</Text>
              <View style={[styles.radioOuter, pilihan === "ASISTEN" && styles.radioOuterActive]}>
                {pilihan === "ASISTEN" ? <View style={styles.radioInner} /> : null}
              </View>
            </View>
            <Text style={styles.roleDesc}>
              Kelola sesi praktikum dan pantau kehadiran praktikan. Asisten tidak dapat masuk sebagai peserta ke kelas/sesi yang dibuat.
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: pilihan === "PRAKTIKAN" }}
            onPress={() => pilihKartu("PRAKTIKAN")}
            style={[
              styles.roleCard,
              pilihan === "PRAKTIKAN" && styles.roleCardActive,
            ]}
          >
            <View style={styles.roleHeader}>
              <View style={styles.iconBox}>
                <View style={styles.iconCapTop} />
                <View style={styles.iconCapBase} />
              </View>
              <Text style={styles.roleTitle}>Praktikan</Text>
              <View style={[styles.radioOuter, pilihan === "PRAKTIKAN" && styles.radioOuterActive]}>
                {pilihan === "PRAKTIKAN" ? <View style={styles.radioInner} /> : null}
              </View>
            </View>
            <Text style={styles.roleDesc}>
              Lihat jadwal dan catat kehadiran praktikum Anda.
            </Text>
          </Pressable>
        </View>

        {pesan ? <Text style={styles.warning}>{pesan}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={lanjut}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>
            {pilihan === "ASISTEN" ? "Lanjut sebagai Asisten" : "Lanjut sebagai Praktikan"}
          </Text>
        </Pressable>

        <Text style={styles.footerNote}>Peran tersedia sesuai akses akun kampus.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: warna.latar },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pil,
    backgroundColor: warna.kartuKaca,
    borderWidth: 1,
    borderColor: warna.garis,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: warna.utama, fontSize: 26, lineHeight: 28, marginTop: -2 },
  topTitle: { color: warna.teks, fontSize: 22, fontWeight: "800" },
  headline: {
    color: warna.teks,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
    marginBottom: 12,
  },
  subheadline: {
    color: warna.teksRedup,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  cardList: { gap: 16 },
  roleCard: {
    backgroundColor: warna.kartuKaca,
    borderRadius: radius.kartu,
    padding: 20,
    borderWidth: 1.5,
    borderColor: warna.garis,
    gap: 14,
  },
  roleCardActive: {
    borderColor: warna.utama,
    backgroundColor: warna.kartu,
  },
  roleCardDisabled: { opacity: 0.65 },
  roleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: warna.permukaan,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPersonHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: warna.utama,
    marginBottom: 2,
  },
  iconPersonBody: {
    width: 16,
    height: 8,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: warna.utama,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  iconCapTop: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: warna.utama,
    transform: [{ rotate: "45deg" }],
  },
  iconCapBase: {
    width: 12,
    height: 5,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: warna.utama,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    marginTop: -3,
  },
  roleTitle: {
    flex: 1,
    color: warna.teks,
    fontSize: 18,
    fontWeight: "800",
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: warna.placeholder,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: {
    borderColor: warna.utama,
    borderWidth: 2,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: warna.utama,
  },
  roleDesc: {
    color: warna.teksIsi,
    fontSize: 14,
    lineHeight: 22,
  },
  warning: {
    color: warna.peringatanTeks,
    backgroundColor: warna.peringatanLatar,
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
  },
  primaryButton: {
    backgroundColor: warna.utama,
    paddingVertical: 16,
    borderRadius: radius.pil,
    alignItems: "center",
    marginTop: 24,
  },
  primaryButtonText: {
    color: warna.utamaTeks,
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: { opacity: 0.85 },
  footerNote: {
    color: warna.teksRedup,
    fontSize: 13,
    textAlign: "center",
    marginTop: 18,
  },
});
