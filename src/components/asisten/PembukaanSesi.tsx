// src/components/asisten/PembukaanSesi.tsx
import { useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { bukaSesi } from "../../hooks/useSesi";
import { pesanError } from "../../lib/errors";
import type { Sesi } from "../../types";
import { KonfirmasiBukaSesi } from "./KonfirmasiBukaSesi";

export function PembukaanSesi({ sesi }: { sesi: Sesi }) {
  const { user, role } = useAuth();
  const [konfirmasiTerbuka, setKonfirmasiTerbuka] = useState(false);
  const [memproses, setMemproses] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);

  const asisten = role === "ASISTEN";
  const bolehMembuka = asisten && sesi.status === "BELUM_DIBUKA";

  const konfirmasiPembukaan = async () => {
    if (!sesi.id || sesi.status !== "BELUM_DIBUKA") {
      setKonfirmasiTerbuka(false);
      return;
    }
    setMemproses(true);
    setGagal(null);
    try {
      await bukaSesi(sesi.id);
      setKonfirmasiTerbuka(false);
    } catch (e) {
      setGagal(pesanError(e));
    } finally {
      setMemproses(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>Kelola sesi</Text>
      {sesi.status === "BELUM_DIBUKA" ? (
        <>
          <Text style={styles.description}>
            Buka sesi saat praktikum dimulai agar praktikan dapat melakukan presensi.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !asisten || memproses }}
            disabled={!asisten || memproses}
            onPress={() => setKonfirmasiTerbuka(true)}
            style={({ pressed }) => [
              styles.button,
              (!asisten || memproses) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {memproses ? "Membuka..." : "Buka Sesi"}
            </Text>
          </Pressable>
          {!asisten ? (
            <Text style={styles.description}>
              Masuk sebagai asisten untuk membuka sesi.
            </Text>
          ) : null}
          {!user ? (
            <Link href="/" push asChild>
              <Pressable accessibilityRole="link" style={styles.loginLink}>
                <Text style={styles.linkText}>Ke halaman masuk</Text>
              </Pressable>
            </Link>
          ) : null}
        </>
      ) : sesi.status === "DIBUKA" ? (
        <Text accessibilityLiveRegion="polite" style={styles.active}>
          Sesi sedang aktif. Praktikan dapat melakukan presensi.
        </Text>
      ) : (
        <Text style={styles.description}>
          Sesi ini telah ditutup dan tidak dapat dibuka kembali.
        </Text>
      )}

      {gagal && sesi.status === "BELUM_DIBUKA" ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {gagal}
        </Text>
      ) : null}

      <KonfirmasiBukaSesi
        visible={konfirmasiTerbuka && bolehMembuka && !memproses}
        namaPraktikum={sesi.namaPraktikum?.trim() || "Praktikum"}
        onBatal={() => setKonfirmasiTerbuka(false)}
        onKonfirmasi={konfirmasiPembukaan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 20 },
  title: { color: "#0F172A", fontSize: 17, lineHeight: 26, fontWeight: "700" },
  description: { color: "#64748B", fontSize: 14, lineHeight: 23, marginTop: 10 },
  button: { minHeight: 48, backgroundColor: "#4338CA", borderRadius: 12, padding: 14, alignItems: "center", justifyContent: "center", marginTop: 18 },
  buttonText: { color: "#FFFFFF", fontSize: 15, lineHeight: 22, fontWeight: "700" },
  disabled: { backgroundColor: "#94A3B8" },
  pressed: { opacity: 0.8 },
  active: { color: "#166534", backgroundColor: "#F0FDF4", borderRadius: 12, padding: 14, marginTop: 14, fontSize: 14, lineHeight: 23 },
  error: { color: "#B91C1C", fontSize: 14, lineHeight: 23, marginTop: 12 },
  loginLink: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingVertical: 10 },
  linkText: { color: "#4338CA", fontSize: 14, lineHeight: 22, fontWeight: "600" },
});
