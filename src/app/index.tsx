import { Link } from "expo-router";
import { useState } from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActiveUserBar } from "../components/TampilanBersama";
import { Loading } from "../components/shared/StatusLayar";
import { useAuth } from "../context/AuthContext";
import { pesanError } from "../lib/errors";

export default function RoleSelectionScreen() {
  const { user, loading, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memproses, setMemproses] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleMasuk = async () => {
    setErrorMessage("");
    if (!email.trim() || !password) {
      setErrorMessage("Email dan kata sandi tidak boleh kosong.");
      return;
    }
    setMemproses(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setErrorMessage(pesanError(e));
    } finally {
      setMemproses(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading label="Memuat..." />
      </SafeAreaView>
    );
  }

  // HALAMAN KEDUA (DASHBOARD)
  if (user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActiveUserBar />
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            Halo, {user.nama}!
          </Text>
          <Text style={{ marginTop: 8, color: "#475569" }}>
            Pilih jadwal dan Kelas Praktikum
          </Text>
          {user.role === "ASISTEN" ? (
            <Link href="/asisten" asChild>
              <TouchableOpacity accessibilityRole="link" style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Ruang Asisten</Text>
              </TouchableOpacity>
            </Link>
          ) : (
            <Link href="/praktikan/index" asChild>
              <TouchableOpacity accessibilityRole="link" style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Lihat Jadwal Saya</Text>
              </TouchableOpacity>
            </Link>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // HALAMAN PERTAMA (LOGIN)
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.page} contentContainerStyle={styles.container}>
        <View style={styles.brandHeader}>
          <View>
            <Text style={styles.brandTitle}>HadirLab</Text>
            <Text style={styles.brandSub}>
              Presensi praktikum cepat & terintegrasi
            </Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>H</Text>
          </View>
        </View>

        <Text style={styles.sprintTag}>Hallo</Text>
        <Text style={styles.heroTitle}>Masuk ke HadirLab</Text>
        <Text style={styles.heroSub}>
          Masuk menggunakan email dan kata sandi yang terdaftar.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.inputField}
            placeholder="nama@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Kata Sandi</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Masukkan kata sandi"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleMasuk}
            disabled={memproses}
          >
            <Text style={styles.submitBtnText}>
              {memproses ? "Memproses..." : "Masuk"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20 },
  brandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  brandTitle: { fontSize: 22, fontWeight: "bold", color: "#0F172A" },
  brandSub: { fontSize: 13, color: "#64748B", marginTop: 2 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "bold", color: "#0F172A", fontSize: 16 },
  sprintTag: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1E293B",
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 6,
  },
  heroSub: { fontSize: 15, color: "#64748B", marginTop: 8, marginBottom: 24 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 8,
    marginTop: 12,
  },
  inputField: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#F8FAFC",
    marginBottom: 8,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },
  submitBtn: {
    backgroundColor: "#0F172A",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold" },
});
