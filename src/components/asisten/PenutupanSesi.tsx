import { useEffect, useRef, useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAttendance, type Session } from "../../context/DataSistem";
import { KonfirmasiTutupSesi } from "./KonfirmasiTutupSesi";

export function PenutupanSesi({ sesi }: { sesi: Session }) {
  const { currentUser, sessions, tutupSesi } = useAttendance();
  const [konfirmasiTerbuka, setKonfirmasiTerbuka] = useState(false);
  const [penutupanDiminta, setPenutupanDiminta] = useState(false);
  const [gagalMenutup, setGagalMenutup] = useState(false);
  const penutupanTerkunci = useRef(false);
  const asisten = currentUser?.role === "ASISTEN";
  const bolehMenutup = asisten && sesi.status === "DIBUKA";

  useEffect(() => {
    if (!bolehMenutup) setKonfirmasiTerbuka(false);
  }, [bolehMenutup]);

  const tampilkanKonfirmasi = () => {
    if (!bolehMenutup || penutupanTerkunci.current) return;
    setGagalMenutup(false);
    setKonfirmasiTerbuka(true);
  };

  const konfirmasiPenutupan = () => {
    if (penutupanTerkunci.current) return;
    const terkini = sessions.find((item) => item.id === sesi.id);
    if (currentUser?.role !== "ASISTEN" || terkini?.status !== "DIBUKA") {
      setKonfirmasiTerbuka(false);
      return;
    }

    // Cegah dua event konfirmasi sebelum pembaruan context selesai dirender.
    penutupanTerkunci.current = true;
    try {
      tutupSesi(sesi.id);
      setPenutupanDiminta(true);
      setKonfirmasiTerbuka(false);
    } catch {
      penutupanTerkunci.current = false;
      setPenutupanDiminta(false);
      setKonfirmasiTerbuka(false);
      setGagalMenutup(true);
    }
  };

  if (sesi.status === "BELUM_DIBUKA") return null;

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {sesi.status === "DITUTUP" ? "Sesi telah ditutup" : "Penutupan sesi"}
      </Text>
      {sesi.status === "DIBUKA" ? (
        <>
          <Text style={styles.description}>
            Tutup sesi setelah praktikum selesai. Presensi baru tidak dapat
            dikirim setelah sesi ditutup, dan rekap yang sudah tercatat tetap tersedia.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !asisten || penutupanDiminta }}
            disabled={!asisten || penutupanDiminta}
            onPress={tampilkanKonfirmasi}
            style={({ pressed }) => [
              styles.button,
              (!asisten || penutupanDiminta) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>Tutup Sesi</Text>
          </Pressable>
          {!asisten ? (
            <Text style={styles.description}>
              Masuk sebagai asisten untuk menutup sesi.
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
      ) : (
        <View accessibilityLiveRegion="polite" style={styles.closed}>
          <Text style={styles.closedText}>
            {penutupanDiminta
              ? "Sesi berhasil ditutup. Praktikan tidak dapat melakukan presensi lagi."
              : "Sesi ini sudah ditutup. Praktikan tidak dapat melakukan presensi lagi."}
          </Text>
          <Text style={styles.closedText}>
            Rekap kehadiran tetap tersedia di bawah. Sesi tidak dapat dibuka kembali.
          </Text>
        </View>
      )}

      {gagalMenutup && sesi.status === "DIBUKA" ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Sesi belum berhasil ditutup. Silakan coba lagi.
        </Text>
      ) : null}

      <KonfirmasiTutupSesi
        visible={konfirmasiTerbuka && bolehMenutup}
        namaPraktikum={sesi.namaPraktikum?.trim() || "Praktikum"}
        onBatal={() => setKonfirmasiTerbuka(false)}
        onKonfirmasi={konfirmasiPenutupan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 20 },
  title: { color: "#0F172A", fontSize: 17, lineHeight: 26, fontWeight: "700" },
  description: { color: "#64748B", fontSize: 14, lineHeight: 23, marginTop: 10 },
  button: { minHeight: 48, backgroundColor: "#B91C1C", borderRadius: 12, padding: 14, alignItems: "center", justifyContent: "center", marginTop: 18 },
  buttonText: { color: "#FFFFFF", fontSize: 15, lineHeight: 22, fontWeight: "700" },
  disabled: { backgroundColor: "#94A3B8" },
  pressed: { opacity: 0.8 },
  closed: { backgroundColor: "#F1F5F9", borderRadius: 12, padding: 14, marginTop: 14, gap: 8 },
  closedText: { color: "#475569", fontSize: 14, lineHeight: 23 },
  error: { color: "#B91C1C", fontSize: 14, lineHeight: 23, marginTop: 12 },
  loginLink: { minHeight: 48, justifyContent: "center", alignSelf: "flex-start", paddingVertical: 10 },
  linkText: { color: "#4338CA", fontSize: 14, lineHeight: 22, fontWeight: "600" },
});
