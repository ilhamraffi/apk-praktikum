import { useEffect, useRef, useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAttendance, type Session } from "../../context/DataSistem";
import { KonfirmasiBukaSesi } from "./KonfirmasiBukaSesi";

export function PembukaanSesi({ sesi }: { sesi: Session }) {
  const { currentUser, sessions, bukaSesi } = useAttendance();
  const [konfirmasiTerbuka, setKonfirmasiTerbuka] = useState(false);
  const [pembukaanDiminta, setPembukaanDiminta] = useState(false);
  const [gagalMembuka, setGagalMembuka] = useState(false);
  const pembukaanTerkunci = useRef(false);
  const asisten = currentUser?.role === "ASISTEN";
  const bolehMembuka = asisten && sesi.status === "BELUM_DIBUKA";

  useEffect(() => {
    if (!bolehMembuka) setKonfirmasiTerbuka(false);
  }, [bolehMembuka]);

  const tampilkanKonfirmasi = () => {
    if (!bolehMembuka || pembukaanTerkunci.current) return;
    setGagalMembuka(false);
    setKonfirmasiTerbuka(true);
  };

  const konfirmasiPembukaan = () => {
    if (pembukaanTerkunci.current) return;
    const terkini = sessions.find((item) => item.id === sesi.id);
    if (currentUser?.role !== "ASISTEN" || terkini?.status !== "BELUM_DIBUKA") {
      setKonfirmasiTerbuka(false);
      return;
    }

    // Cegah dua event konfirmasi sebelum pembaruan context selesai dirender.
    pembukaanTerkunci.current = true;
    try {
      bukaSesi(sesi.id);
      setPembukaanDiminta(true);
      setKonfirmasiTerbuka(false);
    } catch {
      pembukaanTerkunci.current = false;
      setPembukaanDiminta(false);
      setKonfirmasiTerbuka(false);
      setGagalMembuka(true);
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
            accessibilityState={{ disabled: !asisten || pembukaanDiminta }}
            disabled={!asisten || pembukaanDiminta}
            onPress={tampilkanKonfirmasi}
            style={({ pressed }) => [
              styles.button,
              (!asisten || pembukaanDiminta) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>Buka Sesi</Text>
          </Pressable>
          {!asisten ? (
            <Text style={styles.description}>
              Masuk sebagai asisten untuk membuka sesi.
            </Text>
          ) : null}
          {!currentUser ? (
            <Link href="/" push asChild>
              <Pressable accessibilityRole="link" style={styles.loginLink}>
                <Text style={styles.linkText}>Ke halaman masuk</Text>
              </Pressable>
            </Link>
          ) : null}
        </>
      ) : sesi.status === "DIBUKA" ? (
        <Text accessibilityLiveRegion="polite" style={styles.active}>
          {pembukaanDiminta
            ? "Sesi berhasil dibuka. Praktikan sekarang dapat melakukan presensi."
            : "Sesi sedang aktif. Praktikan dapat melakukan presensi."}
        </Text>
      ) : (
        <Text style={styles.description}>
          Sesi ini telah ditutup dan tidak dapat dibuka kembali.
        </Text>
      )}

      {gagalMembuka && sesi.status === "BELUM_DIBUKA" ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Sesi belum berhasil dibuka. Silakan coba lagi.
        </Text>
      ) : null}

      <KonfirmasiBukaSesi
        visible={konfirmasiTerbuka && bolehMembuka}
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