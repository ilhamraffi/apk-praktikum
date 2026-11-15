import { Link } from "expo-router";
import { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Loading } from "../components/shared/StatusLayar";
import { useAuth } from "../context/AuthContext";
import { pesanError } from "../lib/errors";

export default function LoginScreen() {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [memproses, setMemproses] = useState(false);

  const handleMasuk = async () => {
    if (!email.trim() || !password) {
      setErrorMessage("Email dan kata sandi wajib diisi.");
      return;
    }
    setErrorMessage("");
    setMemproses(true);
    try { await signIn(email, password); }
    catch (error) { setErrorMessage(pesanError(error)); }
    finally { setMemproses(false); }
  };

  if (loading) return <Loading label="Memuat..." />;

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Masuk ke HadirLab</Text>
        <Text style={styles.subtitle}>Gunakan akun yang sudah terdaftar.</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="nama@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.label}>Kata sandi</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Minimal 6 karakter" secureTextEntry />
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleMasuk} disabled={memproses}>
          <Text style={styles.buttonText}>{memproses ? "Memproses..." : "Masuk"}</Text>
        </TouchableOpacity>
        <Link href="./register" style={styles.link}>Belum punya akun? Daftar</Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", backgroundColor: "#F8FAFC", padding: 20 },
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
