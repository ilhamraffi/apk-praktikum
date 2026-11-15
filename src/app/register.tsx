import { Link } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Loading } from "../components/shared/StatusLayar";
import { useAuth } from "../context/AuthContext";
import { pesanError } from "../lib/errors";

export default function RegisterScreen() {
  const { signUp, loading } = useAuth();
  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [memproses, setMemproses] = useState(false);

  const handleDaftar = async () => {
    if (!nama.trim() || !nim.trim() || !email.trim() || !password) {
      setErrorMessage("Nama, NIM, email, dan kata sandi wajib diisi.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Kata sandi minimal 6 karakter.");
      return;
    }
    setErrorMessage("");
    setMemproses(true);
    try { await signUp({ nama, nim, email, password }); }
    catch (error) { setErrorMessage(pesanError(error)); }
    finally { setMemproses(false); }
  };

  if (loading) return <Loading label="Memuat..." />;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Buat akun</Text>
          <Text style={styles.subtitle}>Akun baru dibuat sebagai Praktikan.</Text>
          <Text style={styles.label}>Nama lengkap</Text>
          <TextInput style={styles.input} value={nama} onChangeText={setNama} />
          <Text style={styles.label}>NIM</Text>
          <TextInput style={styles.input} value={nim} onChangeText={setNim} keyboardType="numeric" />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.label}>Kata sandi</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={handleDaftar} disabled={memproses}>
            <Text style={styles.buttonText}>{memproses ? "Memproses..." : "Daftar"}</Text>
          </TouchableOpacity>
          <Link href="./login" style={styles.link}>Sudah punya akun? Masuk</Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E2E8F0" },
  title: { fontSize: 26, fontWeight: "bold", color: "#0F172A" },
  subtitle: { color: "#64748B", marginTop: 8, marginBottom: 16 },
  label: { fontWeight: "bold", color: "#0F172A", marginTop: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, padding: 14, backgroundColor: "#F8FAFC" },
  error: { color: "#DC2626", marginTop: 10 },
  button: { backgroundColor: "#0F172A", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 18 },
  buttonText: { color: "#FFFFFF", fontWeight: "bold" },
  link: { color: "#2563EB", textAlign: "center", marginTop: 18 },
});
