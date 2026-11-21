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
import { warna } from "../../theme";

export default function DetailSesiPraktikanScreen() {
  const { sesiId } = useLocalSearchParams<{ sesiId?: string | string[] }>();
  const id = typeof sesiId === "string" ? sesiId.trim() : undefined;
  const { user, role, loading: loadingAuth } = useAuth();
  const uid = !loadingAuth && role === "PRAKTIKAN" && id && id !== "index"
    ? user?.uid
    : undefined;
  const { sesi: daftarSesi, mapKelas, loading, error, dariCache, cobaLagi } = useJadwalPraktikan(uid);
  // /praktikan/index adalah beranda praktikan.
  // Pertahankan kompatibilitas tanpa mengubah file milik anggota lain.
  if (id === "index") return <Redirect href="/praktikan" />;

  if (loadingAuth) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (!user || role !== "PRAKTIKAN" || !user.uid) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
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
              <Text style={styles.backText}>{user ? "Kembali" : "Ke halaman masuk"}</Text>
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
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Link href="/praktikan" replace asChild>
            <TouchableOpacity style={styles.backCircle} accessibilityRole="link" accessibilityLabel="Kembali ke jadwal">
              <Text accessible={false} style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
          </Link>
          <Text accessibilityRole="header" style={styles.topTitle}>Presensi praktikum</Text>
        </View>
        {error ? (
          <View style={styles.feedback}>
            <ErrorBanner message={error} />
            <TouchableOpacity onPress={cobaLagi} style={styles.secondaryButton} accessibilityRole="button">
              <Text style={styles.secondaryText}>Coba lagi</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <Loading label="Memuat sesi dari kelasmu..." />
        ) : sesi && kelas ? (
          <>
            {dariCache ? (
              <Text style={styles.cacheNotice}>
                Menampilkan data tersimpan di perangkat. Data terbaru akan dimuat saat terhubung ke server.
              </Text>
            ) : null}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.eyebrow}>
                  {[sesi.modul, kelasLabel].filter(Boolean).join(" · ").toUpperCase()}
                </Text>
                <StatusSesi status={sesi.status} />
              </View>
              <Text accessibilityRole="header" style={styles.title}>{sesi.namaPraktikum}</Text>
              <Text style={styles.subtitle}>{sesi.modul}</Text>
              <View style={styles.infoWrap}>
                <InformasiSesi sesi={sesi} kelasLabel={kelasLabel} />
              </View>
            </View>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Status & kehadiran</Text>
              <BagianPresensiPraktikan key={`${uid}:${id}`} uid={user.uid} sesi={sesi} dariCache={dariCache} />
            </View>
            <View style={styles.linkGroup}>
              <Link href={{ pathname: "/praktikan/izin", params: { sesiId: id } }} asChild>
                <TouchableOpacity style={styles.secondaryButton} accessibilityRole="link">
                  <Text style={styles.secondaryText}>Ajukan izin untuk sesi ini</Text>
                </TouchableOpacity>
              </Link>
              <Link href="/praktikan/riwayat" asChild>
                <TouchableOpacity style={styles.secondaryButton} accessibilityRole="link">
                  <Text style={styles.secondaryText}>Lihat riwayat kehadiran</Text>
                </TouchableOpacity>
              </Link>
            </View>
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
  page: { flex: 1, backgroundColor: warna.latar },
  content: { flexGrow: 1, width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, paddingBottom: 32 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  backCircle: { width: 44, height: 44, borderRadius: 999, backgroundColor: warna.kartuKaca, borderWidth: 1, borderColor: warna.garis, alignItems: "center", justifyContent: "center" },
  backButton: { alignSelf: "flex-start", minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, marginLeft: -8, marginBottom: 24, borderRadius: 12 },
  backArrow: { color: warna.utama, fontSize: 26, lineHeight: 28, marginTop: -2 },
  backText: { color: warna.utama, fontSize: 14, lineHeight: 22, fontWeight: "600" },
  topTitle: { flex: 1, color: warna.teks, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  eyebrow: { flex: 1, color: warna.teksRedup, fontSize: 12, lineHeight: 18, fontWeight: "700", letterSpacing: 0.6 },
  title: { color: warna.teks, fontSize: 24, lineHeight: 32, fontWeight: "800" },
  subtitle: { color: warna.teksIsi, fontSize: 14, lineHeight: 22, marginTop: 4 },
  infoWrap: { marginTop: 14 },
  card: { backgroundColor: warna.kartuKaca, borderWidth: 1, borderColor: warna.garis, borderRadius: 24, padding: 20, marginBottom: 16 },
  sectionTitle: { color: warna.teks, fontSize: 18, lineHeight: 26, fontWeight: "800", marginBottom: 14 },
  message: { color: warna.teksRedup, fontSize: 14, lineHeight: 22 },
  cacheNotice: { color: warna.peringatanTeks, fontSize: 13, lineHeight: 21, marginBottom: 16 },
  feedback: { gap: 12 },
  actionButton: { minHeight: 52, padding: 14, borderRadius: 999, backgroundColor: warna.utama, alignItems: "center", justifyContent: "center", marginTop: 4 },
  actionText: { color: warna.utamaTeks, fontSize: 15, fontWeight: "700" },
  linkGroup: { gap: 10, marginTop: 4 },
  secondaryButton: { minHeight: 50, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: warna.garis, backgroundColor: warna.kartuKaca, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: warna.utama, fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.5 },
});