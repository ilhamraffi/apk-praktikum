// src/components/asisten/PenutupanSesi.tsx
import { useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { tutupSesi } from "../../hooks/useSesi";
import { pesanError } from "../../lib/errors";
import type { Sesi } from "../../types";
import { KonfirmasiTutupSesi } from "./KonfirmasiTutupSesi";
import { warna } from "../../theme";

export function PenutupanSesi({ sesi }: { sesi: Sesi }) {
  const { user, role } = useAuth();
  const [konfirmasiTerbuka, setKonfirmasiTerbuka] = useState(false);
  const [memproses, setMemproses] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);

  const asisten = role === "ASISTEN";
  const bolehMenutup = asisten && sesi.status === "DIBUKA";

  const konfirmasiPenutupan = async () => {
    if (!sesi.id || sesi.status !== "DIBUKA") {
      setKonfirmasiTerbuka(false);
      return;
    }
    setMemproses(true);
    setGagal(null);
    try {
      await tutupSesi(sesi.id);
      setKonfirmasiTerbuka(false);
    } catch (e) {
      setGagal(pesanError(e));
    } finally {
      setMemproses(false);
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
              {memproses ? "Menutup..." : "Tutup Sesi"}
            </Text>
          </Pressable>
          {!asisten ? (
            <Text style={styles.description}>
              Masuk sebagai asisten untuk menutup sesi.
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
      ) : (
        <View accessibilityLiveRegion="polite" style={styles.closed}>
          <Text style={styles.closedText}>
            Sesi ini sudah ditutup. Praktikan tidak dapat melakukan presensi lagi.
          </Text>
          <Text style={styles.closedText}>
            Rekap kehadiran tetap tersedia di bawah. Anda dapat membuka kembali sesi jika masih ada praktikan yang belum melakukan presensi.
          </Text>
        </View>
      )}

      {gagal && sesi.status === "DIBUKA" ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {gagal}
        </Text>
      ) : null}

      <KonfirmasiTutupSesi
        visible={konfirmasiTerbuka && bolehMenutup && !memproses}
        namaPraktikum={sesi.namaPraktikum?.trim() || "Praktikum"}
        onBatal={() => setKonfirmasiTerbuka(false)}
        onKonfirmasi={konfirmasiPenutupan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, backgroundColor: warna.kartuKaca, borderWidth: 1, borderColor: warna.garis, borderRadius: 24, padding: 20 },
  title: { color: warna.teks, fontSize: 18, lineHeight: 26, fontWeight: "800" },
  description: { color: warna.teksRedup, fontSize: 14, lineHeight: 23, marginTop: 10 },
  button: { minHeight: 52, backgroundColor: warna.kartu, borderWidth: 1, borderColor: warna.garis, borderRadius: 999, padding: 14, alignItems: "center", justifyContent: "center", marginTop: 18 },
  buttonText: { color: warna.utama, fontSize: 15, lineHeight: 22, fontWeight: "700" },
  disabled: { backgroundColor: warna.placeholder },
  pressed: { opacity: 0.8 },
  closed: { backgroundColor: warna.permukaanLembut, borderRadius: 16, padding: 14, marginTop: 14, gap: 8 },
  closedText: { color: warna.teksIsi, fontSize: 14, lineHeight: 23 },
  error: { color: warna.error, fontSize: 14, lineHeight: 23, marginTop: 12 },
  loginLink: { minHeight: 48, justifyContent: "center", alignSelf: "flex-start", paddingVertical: 10 },
  linkText: { color: warna.utama, fontSize: 14, lineHeight: 22, fontWeight: "600" },
});