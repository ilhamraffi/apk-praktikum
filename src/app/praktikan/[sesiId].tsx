// src/app/praktikan/[sesiId].tsx
// SRS-02 praktikan: detail hanya diambil dari jadwal kelas pengguna.
import { Link, Redirect, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InformasiSesi } from "../../components/asisten/InformasiSesi";
import { StatusSesi } from "../../components/asisten/StatusSesi";
import { ErrorBanner, Loading } from "../../components/shared/StatusLayar";
import { useAuth } from "../../context/AuthContext";
import { useJadwalPraktikan } from "../../hooks/useJadwalPraktikan";
import { catatPresensiPraktikan, usePresensiPraktikan } from "../../hooks/usePresensiPraktikan";
import { FormPresensi } from "../../components/praktikan/FormPresensi";
import { RingkasanPresensi } from "../../components/praktikan/RingkasanPresensi";
import type { Sesi } from "../../types";

export default function DetailSesiPraktikanScreen() {
  const { sesiId } = useLocalSearchParams<{ sesiId?: string | string[] }>();
  const id = typeof sesiId === "string" ? sesiId.trim() : undefined;
  const { user, role, loading: loadingAuth } = useAuth();
  const uid = !loadingAuth && role === "PRAKTIKAN" && id && id !== "index"
    ? user?.uid
    : undefined;
  const { sesi: daftarSesi, mapKelas, loading, error, dariCache, cobaLagi } = useJadwalPraktikan(uid);
  // /praktikan/index masih dipakai dashboard scaffold milik Rajib.
  // Pertahankan kompatibilitas tanpa mengubah file milik anggota lain.
  if (id === "index") return <Redirect href="/praktikan" />;

  if (loadingAuth) {
    return (
      <SafeAreaView style={styles.page}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (!user || role !== "PRAKTIKAN" || !user.uid) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.content}>
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>{!user ? "Belum masuk" : "Akses tidak tersedia"}</Text>
            <Text style={styles.subtitle}>
              {!user
                ? "Silakan masuk terlebih dahulu."
                : role !== "PRAKTIKAN"
                  ? "Halaman ini hanya tersedia untuk akun praktikan."
                  : "Identitas akun belum lengkap. Silakan masuk ulang."}
            </Text>
          </View>
          <Link href="/" replace asChild>
            <TouchableOpacity style={styles.backButton} accessibilityRole="link">
              <Text style={styles.backText}>{user ? "Ke dashboard" : "Ke halaman masuk"}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  // Tidak membaca dokumen sesi asing meskipun id dibuka lewat deep link.
  const sesi = daftarSesi.find((item) => item.id === id);
  const kelas = sesi ? mapKelas.get(sesi.classId) : undefined;
  const kelasLabel = kelas ? `${kelas.nama} (${kelas.kode})` : undefined;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Link href="/praktikan" replace asChild>
          <TouchableOpacity style={styles.backButton} accessibilityRole="link">
            <Text accessible={false} style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Kembali ke jadwal</Text>
          </TouchableOpacity>
        </Link>
        {error ? (
          <View style={styles.feedback}>
            <ErrorBanner message={error} />
            <TouchableOpacity onPress={cobaLagi} style={styles.backButton} accessibilityRole="button">
              <Text style={styles.backText}>Coba lagi</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <Loading label="Memuat sesi dari kelasmu..." />
        ) : sesi && kelas ? (
          <>
            {dariCache ? (
              <Text accessibilityRole="status" style={styles.cacheNotice}>
                Menampilkan data tersimpan di perangkat. Data terbaru akan dimuat saat terhubung ke server.
              </Text>
            ) : null}
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>DETAIL SESI</Text>
              <Text accessibilityRole="header" style={styles.title}>{sesi.namaPraktikum}</Text>
              <Text style={styles.subtitle}>{sesi.modul}</Text>
              <View style={styles.status}><StatusSesi status={sesi.status} /></View>
            </View>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Informasi praktikum</Text>
              <InformasiSesi sesi={sesi} kelasLabel={kelasLabel} />
            </View>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Presensi</Text>
              <BagianPresensiPraktikan key={`${uid}:${id}`} uid={user.uid} sesi={sesi} dariCache={dariCache} />
            </View>
            <Link href="/praktikan/riwayat" asChild>
              <TouchableOpacity style={styles.backButton} accessibilityRole="link">
                <Text style={styles.backText}>Lihat riwayat kehadiran</Text>
              </TouchableOpacity>
            </Link>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>SESI PRAKTIKUM</Text>
            <Text accessibilityRole="header" style={styles.title}>Sesi tidak tersedia</Text>
            <Text style={styles.subtitle}>Sesi tidak ditemukan atau kamu tidak terdaftar sebagai peserta kelasnya.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BagianPresensiPraktikan({ uid, sesi, dariCache }: { uid: string; sesi: Sesi; dariCache: boolean }) {
  const [formTerbuka, setFormTerbuka] = useState(false);
  const hasil = usePresensiPraktikan(uid, sesi.id ? [sesi.id] : []);
  const presensi = sesi.id ? hasil.catatan.get(sesi.id) : undefined;
  let pesanNonaktif: string | undefined;
  if (!sesi.id) pesanNonaktif = "Identitas sesi tidak valid.";
  else if (hasil.loading) pesanNonaktif = "Sedang memeriksa kehadiranmu...";
  else if (hasil.error) pesanNonaktif = hasil.error;
  else if (presensi) pesanNonaktif = "Presensi untuk sesi ini sudah tercatat.";
  else if (sesi.status !== "DIBUKA") pesanNonaktif = sesi.status === "DITUTUP"
    ? "Sesi sudah ditutup oleh asisten."
    : "Presensi tersedia setelah sesi dibuka oleh asisten.";
  else if (dariCache || hasil.dariCache) pesanNonaktif = "Menunggu konfirmasi data dari server. Periksa koneksi internetmu.";

  return (
    <View style={styles.feedback}>
      {hasil.error ? (
        <>
          <ErrorBanner message={hasil.error} />
          <TouchableOpacity onPress={hasil.cobaLagi} style={styles.backButton} accessibilityRole="button">
            <Text style={styles.backText}>Coba lagi</Text>
          </TouchableOpacity>
        </>
      ) : hasil.loading ? (
        <Loading label="Memeriksa kehadiranmu..." />
      ) : presensi ? (
        <RingkasanPresensi presensi={presensi} tertunda={hasil.tertunda.has(sesi.id ?? "")} />
      ) : (
        <>
          <Text accessibilityLiveRegion="polite" style={styles.message}>
            {pesanNonaktif ?? "Presensi memerlukan koneksi internet dan hanya dapat dilakukan satu kali."}
          </Text>
          <TouchableOpacity
            onPress={() => setFormTerbuka(true)} disabled={Boolean(pesanNonaktif)}
            accessibilityRole="button" accessibilityState={{ disabled: Boolean(pesanNonaktif) }}
            style={[styles.actionButton, Boolean(pesanNonaktif) && styles.disabled]}
          >
            <Text style={styles.actionText}>Presensi sekarang</Text>
          </TouchableOpacity>
        </>
      )}
      <FormPresensi
        sesi={sesi} visible={formTerbuka} pesanNonaktif={pesanNonaktif}
        onClose={() => setFormTerbuka(false)}
        onSubmit={async (catatan) => {
          if (!sesi.id) throw new Error("Identitas sesi tidak valid.");
          await catatPresensiPraktikan({ uid, sesiId: sesi.id, catatan });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flexGrow: 1, width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, paddingBottom: 32 },
  backButton: { alignSelf: "flex-start", minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, marginLeft: -8, marginBottom: 24, borderRadius: 12 },
  backArrow: { color: "#4338CA", fontSize: 28, lineHeight: 32 },
  backText: { color: "#4338CA", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  hero: { marginBottom: 28 },
  eyebrow: { color: "#4338CA", fontSize: 12, lineHeight: 20, fontWeight: "700", letterSpacing: 1 },
  title: { color: "#0F172A", fontSize: 28, lineHeight: 38, fontWeight: "700", marginTop: 10 },
  subtitle: { color: "#64748B", fontSize: 15, lineHeight: 24, marginTop: 10 },
  status: { marginTop: 20 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 20, marginBottom: 16 },
  sectionTitle: { color: "#0F172A", fontSize: 17, lineHeight: 26, fontWeight: "700", marginBottom: 18 },
  message: { color: "#64748B", fontSize: 14, lineHeight: 23 },
  cacheNotice: { color: "#92400E", fontSize: 13, lineHeight: 21, marginBottom: 16 },
  feedback: { gap: 12 },
  actionButton: { minHeight: 50, padding: 14, borderRadius: 12, backgroundColor: "#4338CA", alignItems: "center", justifyContent: "center" },
  actionText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
