import type { ReactNode } from "react";
import { Link, Redirect } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../context/AuthContext";
import { Loading } from "../../shared/StatusLayar";

/** Anak baru dipasang setelah identitas dan role siap; listener ikut dilepas saat logout. */
export function AksesIzinAsisten({ children }: { children: (uid: string) => ReactNode }) {
  const { user, role, loading } = useAuth();
  if (loading) return <SafeAreaView style={styles.page}><Loading label="Memeriksa akun..." /></SafeAreaView>;
  if (!user) return <Redirect href="/" />;
  if (role !== "ASISTEN" || !user.uid) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.denied}>
          <Text accessibilityRole="header" style={styles.title}>Akses tidak tersedia</Text>
          <Text style={styles.text}>{role !== "ASISTEN" ? "Pemeriksaan izin hanya tersedia untuk akun asisten." : "Identitas akun belum lengkap. Silakan masuk ulang."}</Text>
          <Link href="/" asChild>
            <TouchableOpacity accessibilityRole="link" style={styles.button}><Text style={styles.link}>Ke dashboard</Text></TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    );
  }
  return children(user.uid);
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  denied: { flex: 1, padding: 24, gap: 12, justifyContent: "center", alignItems: "center" },
  title: { color: "#0F172A", fontSize: 22, fontWeight: "700" },
  text: { color: "#64748B", fontSize: 15, lineHeight: 24, textAlign: "center" },
  button: { minHeight: 48, justifyContent: "center", paddingHorizontal: 16 },
  link: { color: "#4338CA", fontWeight: "600" },
});
