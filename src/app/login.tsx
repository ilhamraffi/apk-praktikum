// src/app/login.tsx
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormField } from "../components/shared/FormField";
import { Loading } from "../components/shared/StatusLayar";
import { useAuth } from "../context/AuthContext";
import { pesanError } from "../lib/errors";
import { radius, warna } from "../theme";
import { errEmail, errSandi } from "../utils/validasiAkun";

export default function LoginScreen() {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dicoba, setDicoba] = useState(false); // sudah menekan Masuk sekali
  const [errorMessage, setErrorMessage] = useState("");
  const [memproses, setMemproses] = useState(false);

  // Error kolom baru tampil setelah tombol ditekan, lalu ikut berubah saat mengetik.
  const errorEmail = dicoba ? errEmail(email) : "";
  const errorSandi = dicoba ? errSandi(password) : "";

  const handleMasuk = async () => {
    setDicoba(true);
    setErrorMessage("");
    if (errEmail(email) || errSandi(password)) return;

    setMemproses(true);
    try {
      await signIn(email, password);
    } catch (error) {
      setErrorMessage(pesanError(error));
    } finally {
      setMemproses(false);
    }
  };

  if (loading) return <Loading label="Memuat..." />;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sapaan}>Selamat datang</Text>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <View style={styles.labuLeher} />
            <View style={styles.labuBadan} />
          </View>
          <View>
            <Text style={styles.brand}>HadirLab</Text>
            <Text style={styles.tagline}>Hadir. Belajar. Berkembang.</Text>
          </View>
        </View>
        <Text style={styles.headline}>Praktikum tertata,{"\n"}kehadiran tercatat.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Masuk ke akun kampus</Text>
          <Text style={styles.cardSub}>Gunakan akun yang terdaftar di kampus.</Text>

          <FormField
            label="Email kampus"
            wajib
            value={email}
            onChangeText={setEmail}
            placeholder="nama@mahasiswa.ac.id"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errorEmail}
          />
          <FormField
            label="Kata sandi"
            wajib
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={errorSandi}
          />

          {errorMessage ? <Text style={styles.errorBox}>{errorMessage}</Text> : null}

          <Pressable
            accessibilityRole="button"
            onPress={handleMasuk}
            disabled={memproses}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>{memproses ? "Memproses..." : "Masuk"}</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLabel}>Belum memiliki akses?</Text>
          <Link href="/register" style={styles.link}>
            Daftar akun praktikan
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: warna.latar },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, paddingBottom: 48 },
  sapaan: { color: warna.teks, fontSize: 22, fontWeight: "800", marginBottom: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: warna.permukaan,
    alignItems: "center",
    justifyContent: "center",
  },
  labuLeher: {
    width: 8,
    height: 10,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: warna.utama,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  labuBadan: {
    width: 22,
    height: 14,
    borderWidth: 2,
    borderColor: warna.utama,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  brand: { color: warna.teks, fontSize: 28, fontWeight: "800" },
  tagline: { color: warna.teksRedup, fontSize: 13, marginTop: 2 },
  headline: {
    color: warna.teks,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 22,
  },
  card: {
    backgroundColor: warna.kartuKaca,
    borderRadius: radius.kartu,
    padding: 22,
    borderWidth: 1,
    borderColor: warna.garis,
  },
  cardTitle: { color: warna.teks, fontSize: 18, fontWeight: "800" },
  cardSub: { color: warna.teksRedup, fontSize: 13, marginTop: 6, marginBottom: 4 },
  errorBox: {
    color: warna.error,
    backgroundColor: warna.errorLatar,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    marginTop: 14,
  },
  button: {
    backgroundColor: warna.utama,
    paddingVertical: 16,
    borderRadius: radius.pil,
    alignItems: "center",
    marginTop: 22,
  },
  buttonText: { color: warna.utamaTeks, fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.85 },
  footer: { alignItems: "center", marginTop: 20, gap: 4 },
  footerLabel: { color: warna.teksRedup, fontSize: 13 },
  link: {
    color: warna.tautan,
    textAlign: "center",
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: "700",
  },
});