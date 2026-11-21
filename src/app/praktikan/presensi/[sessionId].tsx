// src/app/praktikan/presensi/[sessionId].tsx
// SRS-09, SRS-10, SRS-15 — halaman presensi khusus berbasis validasi lokasi.
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InformasiSesi } from "../../../components/asisten/InformasiSesi";
import { StatusSesi } from "../../../components/asisten/StatusSesi";
import { FormPresensi } from "../../../components/praktikan/FormPresensi";
import { KartuStatusLokasi } from "../../../components/praktikan/KartuStatusLokasi";
import { RingkasanPresensi } from "../../../components/praktikan/RingkasanPresensi";
import { ErrorBanner, Loading } from "../../../components/shared/StatusLayar";
import { useAuth } from "../../../context/AuthContext";
import { useJadwalPraktikan } from "../../../hooks/useJadwalPraktikan";
import { useLabSesi } from "../../../hooks/useLabSesi";
import { useLokasiPerangkat } from "../../../hooks/useLokasiPerangkat";
import { catatPresensiPraktikan, usePresensiPraktikan } from "../../../hooks/usePresensiPraktikan";
import { cekDalamRadius } from "../../../lib/geo";
import { radius, warna } from "../../../theme";
import type { Sesi } from "../../../types";
import {
  ambilLabIdSesi,
  BATAS_TUNGGU_LOKASI_MS,
  evaluasiPresensiLokasi,
} from "../../../utils/presensiPraktikan";

export default function PresensiLokasiScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const id = typeof sessionId === "string" ? sessionId.trim() : undefined;
  const { user, role, loading: loadingAuth } = useAuth();
  const uid = !loadingAuth && role === "PRAKTIKAN" && id ? user?.uid : undefined;
  const { sesi: daftarSesi, mapKelas, loading, error, dariCache, cobaLagi } = useJadwalPraktikan(uid);

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
            <Text accessibilityRole="header" style={styles.title}>
              {!user ? "Belum masuk" : "Akses tidak tersedia"}
            </Text>
            <Text style={styles.subtitle}>
              {!user
                ? "Silakan masuk terlebih dahulu."
                : role !== "PRAKTIKAN"
                  ? "Halaman presensi ini hanya tersedia untuk akun praktikan."
                  : "Identitas akun belum lengkap. Silakan masuk ulang."}
            </Text>
          </View>
          <Link href="/" replace asChild>
            <TouchableOpacity style={styles.secondaryButton} accessibilityRole="link">
              <Text style={styles.secondaryText}>{user ? "Kembali" : "Ke halaman masuk"}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  // Tidak membaca dokumen sesi asing meskipun sessionId dibuka lewat deep link.
  const sesi = daftarSesi.find((item) => item.id === id);
  const kelas = sesi ? mapKelas.get(sesi.classId) : undefined;
  const kelasLabel = kelas ? `${kelas.nama} (${kelas.kode})` : undefined;
  const tujuanKembali = id
    ? ({ pathname: "/praktikan/[sesiId]", params: { sesiId: id } } as const)
    : ("/praktikan" as const);

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Link href={tujuanKembali} replace asChild>
            <TouchableOpacity
              style={styles.backCircle}
              accessibilityRole="link"
              accessibilityLabel="Kembali ke detail sesi"
            >
              <Text accessible={false} style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
          </Link>
          <Text accessibilityRole="header" style={styles.topTitle}>Presensi lokasi</Text>
        </View>

        {error ? (
          <View style={styles.feedback}>
            <ErrorBanner message={error} />
            <TouchableOpacity onPress={cobaLagi} style={styles.secondaryButton} accessibilityRole="button">
              <Text style={styles.secondaryText}>Coba lagi</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <Loading label="Memuat informasi sesi..." />
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

            <BagianPresensiLokasi
              key={`${uid}:${id}`}
              uid={user.uid}
              sesi={sesi}
              dariCache={dariCache}
              onCobaLagiJadwal={cobaLagi}
            />

            <View style={styles.linkGroup}>
              <Link href={{ pathname: "/praktikan/[sesiId]", params: { sesiId: id! } }} replace asChild>
                <TouchableOpacity style={styles.secondaryButton} accessibilityRole="link">
                  <Text style={styles.secondaryText}>Lihat detail sesi</Text>
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
            <Text style={styles.eyebrow}>PRESENSI PRAKTIKUM</Text>
            <Text accessibilityRole="header" style={styles.title}>Sesi tidak tersedia</Text>
            <Text style={styles.subtitle}>
              Sesi tidak ditemukan atau kamu tidak terdaftar sebagai peserta kelasnya.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function BagianPresensiLokasi({
  uid,
  sesi,
  dariCache,
  onCobaLagiJadwal,
}: {
  uid: string;
  sesi: Sesi;
  dariCache: boolean;
  onCobaLagiJadwal: () => void;
}) {
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [percobaanLokasi, setPercobaanLokasi] = useState(0);
  const [timeoutUntukPercobaan, setTimeoutUntukPercobaan] = useState<number | null>(null);

  const hasil = usePresensiPraktikan(uid, sesi.id ? [sesi.id] : []);
  const presensi = sesi.id ? hasil.catatan.get(sesi.id) : undefined;
  const labId = ambilLabIdSesi(sesi);
  const labState = useLabSesi(labId);

  const lokasiAktif = sesi.status === "DIBUKA" && !presensi && Boolean(labId);
  const lokasi = useLokasiPerangkat(lokasiAktif);
  const sedangMencariLokasi = lokasiAktif && lokasi.status === "memuat" && !lokasi.koordinat;
  const lokasiTimeout = sedangMencariLokasi && timeoutUntukPercobaan === percobaanLokasi;

  useEffect(() => {
    if (!sedangMencariLokasi) return;
    const targetPercobaan = percobaanLokasi;
    const timer = setTimeout(() => {
      setTimeoutUntukPercobaan(targetPercobaan);
    }, BATAS_TUNGGU_LOKASI_MS);
    return () => clearTimeout(timer);
  }, [sedangMencariLokasi, percobaanLokasi]);

  const evaluasi = evaluasiPresensiLokasi({
    sesi,
    presensi,
    presensiLoading: hasil.loading,
    presensiError: hasil.error,
    dariCache: dariCache || hasil.dariCache || labState.dariCache,
    lab: labState.lab,
    labLoading: labState.loading,
    labError: labState.error,
    lokasi,
    lokasiTimeout,
    cekDalamRadius,
  });

  const mintaIzinLokasi = () => {
    setPercobaanLokasi((nilai) => nilai + 1);
    lokasi.mintaIzin();
  };

  const muatUlangLokasi = () => {
    setPercobaanLokasi((nilai) => nilai + 1);
    lokasi.muatUlang();
  };

  const bukaPengaturan = () => {
    void Linking.openSettings().catch(() => {});
  };

  const cobaLagiData = () => {
    onCobaLagiJadwal();
    hasil.cobaLagi();
    labState.cobaLagi();
  };

  if (hasil.error) {
    return (
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Kehadiran & lokasi</Text>
        <View style={styles.feedback}>
          <ErrorBanner message={hasil.error} />
          <TouchableOpacity onPress={hasil.cobaLagi} style={styles.secondaryButton} accessibilityRole="button">
            <Text style={styles.secondaryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (hasil.loading) {
    return (
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Kehadiran & lokasi</Text>
        <Loading label="Memeriksa kehadiranmu..." />
      </View>
    );
  }

  if (presensi) {
    return (
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Status kehadiran</Text>
        <RingkasanPresensi presensi={presensi} tertunda={hasil.tertunda.has(sesi.id ?? "")} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Validasi lokasi & presensi</Text>
      <View style={styles.feedback}>
        <KartuStatusLokasi
          evaluasi={evaluasi}
          lab={labState.lab}
          onMintaIzin={mintaIzinLokasi}
          onMuatUlangLokasi={muatUlangLokasi}
          onBukaPengaturan={bukaPengaturan}
          onCobaLagiData={cobaLagiData}
        />

        <TouchableOpacity
          onPress={() => setFormTerbuka(true)}
          disabled={!evaluasi.bisaPresensi}
          accessibilityRole="button"
          accessibilityState={{ disabled: !evaluasi.bisaPresensi }}
          style={[styles.actionButton, !evaluasi.bisaPresensi && styles.disabled]}
        >
          <Text style={styles.actionText}>Presensi sekarang</Text>
        </TouchableOpacity>
      </View>

      <FormPresensi
        sesi={sesi}
        visible={formTerbuka}
        pesanNonaktif={evaluasi.pesanNonaktif}
        onClose={() => setFormTerbuka(false)}
        onSubmit={async (catatan) => {
          if (!sesi.id) throw new Error("Identitas sesi tidak valid.");
          if (!evaluasi.bisaPresensi || !lokasi.koordinat) {
            throw new Error(evaluasi.pesanNonaktif ?? "Lokasi perangkat belum siap untuk presensi.");
          }
          const akurasiMeter = lokasi.koordinat.akurasiMeter ?? lokasi.akurasiMeter;
          if (akurasiMeter == null) {
            throw new Error("Lokasi perangkat belum tersedia.");
          }
          await catatPresensiPraktikan({
            uid,
            sesiId: sesi.id,
            catatan,
            koordinat: {
              latitude: lokasi.koordinat.latitude,
              longitude: lokasi.koordinat.longitude,
              akurasiMeter,
            },
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: warna.latar },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 32,
  },
  topBar: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pil,
    backgroundColor: warna.kartuKaca,
    borderWidth: 1,
    borderColor: warna.garis,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: warna.utama, fontSize: 26, lineHeight: 28, marginTop: -2 },
  topTitle: { flex: 1, color: warna.teks, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  card: {
    backgroundColor: warna.kartuKaca,
    borderWidth: 1,
    borderColor: warna.garis,
    borderRadius: radius.kartu,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  eyebrow: {
    flex: 1,
    color: warna.teksRedup,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  title: { color: warna.teks, fontSize: 24, lineHeight: 32, fontWeight: "800" },
  subtitle: { color: warna.teksIsi, fontSize: 14, lineHeight: 22, marginTop: 4 },
  infoWrap: { marginTop: 14 },
  sectionTitle: {
    color: warna.teks,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "800",
    marginBottom: 14,
  },
  cacheNotice: {
    color: warna.peringatanTeks,
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 16,
  },
  feedback: { gap: 14 },
  actionButton: {
    minHeight: 52,
    padding: 14,
    borderRadius: radius.pil,
    backgroundColor: warna.utama,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  actionText: { color: warna.utamaTeks, fontSize: 15, fontWeight: "700" },
  linkGroup: { gap: 10, marginTop: 4 },
  secondaryButton: {
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: radius.pil,
    borderWidth: 1,
    borderColor: warna.garis,
    backgroundColor: warna.kartuKaca,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: warna.utama, fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
