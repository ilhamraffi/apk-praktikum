// src/app/register.tsx
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormField } from "../components/shared/FormField";
import { Loading } from "../components/shared/StatusLayar";
import { useAuth } from "../context/AuthContext";
import { pesanError } from "../lib/errors";
import { radius, warna } from "../theme";
import type { Role } from "../types";
import { errEmail, errNim, errSandi, errWajib } from "../utils/validasiAkun";

const SANDI_MINIMAL = 6;

export default function RegisterScreen() {
  const { signUp, loading } = useAuth();
  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [peran, setPeran] = useState<Role>("PRAKTIKAN");
  const [dicoba, setDicoba] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [memproses, setMemproses] = useState(false);

  const errorNama = dicoba ? errWajib(nama, "Nama lengkap") : "";
  const errorNim = dicoba ? errNim(nim) : "";
  const errorEmail = dicoba ? errEmail(email) : "";
  const errorSandi = dicoba ? errSandi(password, SANDI_MINIMAL) : "";

  const handleDaftar = async () => {
    setDicoba(true);
    setErrorMessage("");
    if (
      errWajib(nama, "Nama lengkap") ||
      errNim(nim) ||
      errEmail(email) ||
      errSandi(password, SANDI_MINIMAL)
    ) {
      return;
    }

    setMemproses(true);
    try {
      await signUp({ nama, nim, email, password, role: peran });
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
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>H</Text>
          </View>
          <View>
            <Text style={styles.brand}>HadirLab</Text>
            <Text style={styles.tagline}>Hadir. Belajar. Berkembang.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Buat akun</Text>
          <Text style={styles.cardSub}>Pilih peran akun yang ingin didaftarkan.</Text>
          <Text style={styles.catatan}>
            <Text style={styles.bintang}>*</Text> wajib diisi
          </Text>

          <Text style={styles.roleLabel}>Daftar sebagai</Text>
          <View style={styles.roleRow}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: peran === "PRAKTIKAN" }}
              onPress={() => setPeran("PRAKTIKAN")}
              style={[styles.roleChip, peran === "PRAKTIKAN" && styles.roleChipActive]}
            >
              <Text style={[styles.roleChipText, peran === "PRAKTIKAN" && styles.roleChipTextActive]}>
                Praktikan
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: peran === "ASISTEN" }}
              onPress={() => setPeran("ASISTEN")}
              style={[styles.roleChip, peran === "ASISTEN" && styles.roleChipActive]}
            >
              <Text style={[styles.roleChipText, peran === "ASISTEN" && styles.roleChipTextActive]}>
                Asisten
              </Text>
            </Pressable>
          </View>

          <FormField
            label="Nama lengkap"
            wajib
            value={nama}
            onChangeText={setNama}
            placeholder="Nama sesuai KTM"
            autoCapitalize="words"
            error={errorNama}
          />
          <FormField
            label="NIM"
            wajib
            value={nim}
            onChangeText={(t) => setNim(t.replace(/\D/g, ""))}
            placeholder="Contoh: 24060124130110"
            keyboardType="number-pad"
            error={errorNim}
          />
          <FormField
            label="Email"
            wajib
            value={email}
            onChangeText={setEmail}
            placeholder="nama@example.com"
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
            placeholder={`Minimal ${SANDI_MINIMAL} karakter`}
            secureTextEntry
            error={errorSandi}
          />

          {errorMessage ? <Text style={styles.errorBox}>{errorMessage}</Text> : null}

          <Pressable
            accessibilityRole="button"
            onPress={handleDaftar}
            disabled={memproses}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>{memproses ? "Memproses..." : "Daftar"}</Text>
          </Pressable>
        </View>

        <Link href="/login" style={styles.link}>
          Sudah punya akun? Masuk
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: warna.latar },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, paddingBottom: 56 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: warna.permukaan,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: warna.utama, fontSize: 24, fontWeight: "800" },
  brand: { color: warna.teks, fontSize: 28, fontWeight: "800" },
  tagline: { color: warna.teksRedup, fontSize: 13, marginTop: 2 },
  card: {
    backgroundColor: warna.kartuKaca,
    borderRadius: radius.kartu,
    padding: 22,
    borderWidth: 1,
    borderColor: warna.garis,
  },
  cardTitle: { color: warna.teks, fontSize: 18, fontWeight: "800" },
  cardSub: { color: warna.teksRedup, fontSize: 13, marginTop: 4 },
  catatan: { color: warna.teksRedup, fontSize: 12, marginTop: 10 },
  bintang: { color: warna.error, fontWeight: "700" },
  roleLabel: { color: warna.teksIsi, fontSize: 13, fontWeight: "600", marginTop: 14, marginBottom: 8 },
  roleRow: { flexDirection: "row", gap: 10 },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pil,
    borderWidth: 1,
    borderColor: warna.garis,
    backgroundColor: warna.permukaanLembut,
    alignItems: "center",
  },
  roleChipActive: {
    backgroundColor: warna.utama,
    borderColor: warna.utama,
  },
  roleChipText: { color: warna.teksIsi, fontSize: 14, fontWeight: "700" },
  roleChipTextActive: { color: warna.utamaTeks },
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
  link: {
    color: warna.tautan,
    textAlign: "center",
    marginTop: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "700",
  },
});