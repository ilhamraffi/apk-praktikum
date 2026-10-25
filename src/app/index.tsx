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
import { DUMMY_USERS, Role, useAttendance } from "../context/DataSistem";

export default function RoleSelectionScreen() {
  const { currentUser, pilihPeran } = useAttendance();

  const [selectedRole, setSelectedRole] = useState<Role>("ASISTEN");
  const [nimInput, setNimInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    setErrorMessage("");
    setNimInput("");
    setPasswordInput("");
  };

  const handleMasuk = () => {
    setErrorMessage("");

    if (!nimInput || !passwordInput) {
      setErrorMessage("NIM dan Kata Sandi tidak boleh kosong.");
      return;
    }

    const nimBersih = nimInput.trim();
    const passwordBersih = passwordInput.trim();

    const userValid = DUMMY_USERS.find(
      (u) =>
        u.role === selectedRole &&
        u.nim === nimBersih &&
        u.password === passwordBersih,
    );

    if (userValid) {
      pilihPeran(userValid);
    } else {
      setErrorMessage("NIM atau Kata Sandi salah, atau peran tidak sesuai.");
    }
  };

  // HALAMAN KEDUA (DASHBOARD)
  if (currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActiveUserBar />
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            Halo, {currentUser.nama}!
          </Text>
          <Text style={{ marginTop: 8, color: "#475569" }}>
            Pilih jadwal dan Kelas Praktikum
          </Text>
          {currentUser.role === "ASISTEN" ? (
            <Link href="/asisten" asChild>
              <TouchableOpacity accessibilityRole="link" style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Lihat Jadwal Praktikum</Text>
              </TouchableOpacity>
            </Link>
          ) : null}
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
        <Text style={styles.heroTitle}>Pilih Peran Mu</Text>
        <Text style={styles.heroSub}>
          Masuk menggunakan NIM dan kata sandi yang terdaftar.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Pilih Peran</Text>
          <View style={styles.roleRow}>
            {(["ASISTEN", "PRAKTIKAN"] as Role[]).map((r) => {
              const active = selectedRole === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBox, active && styles.roleBoxActive]}
                  onPress={() => handleRoleChange(r)}
                >
                  <Text
                    style={[
                      styles.roleBoxText,
                      active && styles.roleBoxTextActive,
                    ]}
                  >
                    {r === "ASISTEN" ? "Asisten" : "Praktikan"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>NIM</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Masukkan NIM kamu"
            keyboardType="numeric"
            value={nimInput}
            onChangeText={setNimInput}
          />

          <Text style={styles.label}>Kata Sandi</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Masukkan kata sandi"
            secureTextEntry
            value={passwordInput}
            onChangeText={setPasswordInput}
          />

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <TouchableOpacity style={styles.submitBtn} onPress={handleMasuk}>
            <Text style={styles.submitBtnText}>Masuk</Text>
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
    // Memberikan jarak sebesar tinggi status bar HP
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
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  roleBox: {
    flex: 1,
    paddingVertical: 10, // Dikurangi dari 14 agar lebih ramping
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
  },
  roleBoxActive: { backgroundColor: "#6366F1", borderColor: "#4338CA" },
  roleBoxText: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  roleBoxTextActive: { color: "#FFFFFF" },
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
