// src/components/asisten/PembukaanSesi.tsx
import { useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  acakUlangKodePresensi,
  bukaSesi,
  cariSesiAktifDiLabSama,
} from "../../hooks/useSesi";
import { pesanError } from "../../lib/errors";
import type { Sesi } from "../../types";
import { KonfirmasiBukaSesi } from "./KonfirmasiBukaSesi";
import { warna } from "../../theme";

export function PembukaanSesi({ sesi }: { sesi: Sesi }) {
  const { user, role } = useAuth();
  const [konfirmasiTerbuka, setKonfirmasiTerbuka] = useState(false);
  const [memeriksaLab, setMemeriksaLab] = useState(false);
  const [memproses, setMemproses] = useState(false);
  const [mengacakKode, setMengacakKode] = useState(false);
  const [peringatanLabAktif, setPeringatanLabAktif] = useState<string | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  const asisten = role === "ASISTEN";
  const modeBukaUlang = sesi.status === "DITUTUP";
  const bolehMembuka =
    asisten && (sesi.status === "BELUM_DIBUKA" || sesi.status === "DITUTUP");
  const kodeAktif = sesi.kodePresensi?.trim() || "";

  const mulaiProsesBuka = async () => {
    if (!sesi.id || !bolehMembuka || memeriksaLab || memproses) return;
    setMemeriksaLab(true);
    setGagal(null);
    setPeringatanLabAktif(null);
    try {
      const sesiAktifLain = await cariSesiAktifDiLabSama(sesi);
      if (sesiAktifLain.length > 0) {
        const daftarNama = sesiAktifLain
          .map((s) => {
            const nama = s.namaPraktikum?.trim() || "Praktikum";
            return s.modul?.trim() ? `${nama} (${s.modul.trim()})` : nama;
          })
          .join(", ");
        const namaLab = sesi.ruangan?.trim() || "laboratorium ini";
        setPeringatanLabAktif(
          `Sesi ${daftarNama} di ${namaLab} saat ini masih dibuka/belum selesai.`,
        );
      }
      setKonfirmasiTerbuka(true);
    } catch {
      // Jika pembacaan pengecekan gagal, tetap izinkan dialog konfirmasi terbuka
      setKonfirmasiTerbuka(true);
    } finally {
      setMemeriksaLab(false);
    }
  };

  const konfirmasiPembukaan = async () => {
    if (!sesi.id || !bolehMembuka) {
      setKonfirmasiTerbuka(false);
      return;
    }
    setMemproses(true);
    setGagal(null);
    try {
      await bukaSesi(sesi.id, {
        paksaTutupSesiLain: Boolean(peringatanLabAktif),
      });
      setKonfirmasiTerbuka(false);
      setPeringatanLabAktif(null);
    } catch (e) {
      setKonfirmasiTerbuka(false);
      setGagal(pesanError(e));
    } finally {
      setMemproses(false);
    }
  };

  const handleAcakUlang = async () => {
    if (!sesi.id || sesi.status !== "DIBUKA" || mengacakKode) return;
    setMengacakKode(true);
    setGagal(null);
    try {
      await acakUlangKodePresensi(sesi.id);
    } catch (e) {
      setGagal(pesanError(e));
    } finally {
      setMengacakKode(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {modeBukaUlang ? "Buka kembali presensi" : "Kelola sesi"}
      </Text>
      {sesi.status === "BELUM_DIBUKA" || sesi.status === "DITUTUP" ? (
        <>
          <Text style={styles.description}>
            {modeBukaUlang
              ? "Ada praktikan yang belum sempat melakukan presensi? Anda dapat membuka kembali sesi ini selama 15 menit ke depan dengan kode presensi baru."
              : "Buka sesi saat praktikum dimulai. Kode presensi acak akan dibuat otomatis untuk dibagikan kepada praktikan di dalam laboratorium."}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !asisten || memproses || memeriksaLab }}
            disabled={!asisten || memproses || memeriksaLab}
            onPress={() => void mulaiProsesBuka()}
            style={({ pressed }) => [
              styles.button,
              modeBukaUlang && styles.reopenButton,
              (!asisten || memproses || memeriksaLab) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.buttonText, modeBukaUlang && styles.reopenButtonText]}>
              {memeriksaLab
                ? "Memeriksa ruangan..."
                : memproses
                  ? "Membuka..."
                  : modeBukaUlang
                    ? "Buka Kembali Sesi"
                    : "Buka Sesi"}
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
      ) : (
        <>
          <Text accessibilityLiveRegion="polite" style={styles.active}>
            Sesi sedang aktif (akan tertutup otomatis setelah jam sesi selesai). Bagikan kode presensi di bawah ini hanya kepada praktikan yang hadir di dalam laboratorium.
          </Text>

          <View style={styles.kodeBox}>
            <Text style={styles.kodeLabel}>KODE PRESENSI RUANGAN</Text>
            <Text selectable style={styles.kodeValue}>
              {kodeAktif || "------"}
            </Text>
            {asisten ? (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={mengacakKode}
                onPress={handleAcakUlang}
                style={[styles.acakBtn, mengacakKode && styles.disabled]}
              >
                <Text style={styles.acakBtnText}>
                  {mengacakKode
                    ? "Mengacak..."
                    : kodeAktif
                      ? "Acak kode baru"
                      : "Buat kode presensi"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      )}

      {gagal ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {gagal}
        </Text>
      ) : null}

      <KonfirmasiBukaSesi
        visible={konfirmasiTerbuka && bolehMembuka && !memproses}
        namaPraktikum={sesi.namaPraktikum?.trim() || "Praktikum"}
        judul={
          peringatanLabAktif
            ? "Sesi Lain Belum Selesai"
            : modeBukaUlang
              ? "Buka Kembali Sesi?"
              : "Mulai Sesi Praktikum?"
        }
        peringatan={peringatanLabAktif}
        deskripsi={
          peringatanLabAktif
            ? "Apakah Anda ingin menutup sesi sebelumnya di laboratorium tersebut dan tetap melanjutkan membuka sesi ini?"
            : modeBukaUlang
              ? "Sesi ini akan dibuka kembali selama 15 menit dengan kode presensi baru agar praktikan yang tertinggal dapat melakukan presensi."
              : "Apakah Anda yakin ingin membuka sesi ini? Praktikan dapat melakukan presensi setelah sesi dibuka."
        }
        labelKonfirmasi={
          peringatanLabAktif
            ? "Tetap Lanjut"
            : modeBukaUlang
              ? "Ya, Buka Kembali"
              : "Ya, Buka Sesi"
        }
        onBatal={() => {
          setKonfirmasiTerbuka(false);
          setPeringatanLabAktif(null);
        }}
        onKonfirmasi={konfirmasiPembukaan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, backgroundColor: warna.kartuKaca, borderWidth: 1, borderColor: warna.garis, borderRadius: 24, padding: 20 },
  title: { color: warna.teks, fontSize: 18, lineHeight: 26, fontWeight: "800" },
  description: { color: warna.teksRedup, fontSize: 14, lineHeight: 23, marginTop: 10 },
  button: { minHeight: 52, backgroundColor: warna.utama, borderRadius: 999, padding: 14, alignItems: "center", justifyContent: "center", marginTop: 18 },
  reopenButton: {
    backgroundColor: warna.kartu,
    borderWidth: 1.5,
    borderColor: warna.utama,
  },
  buttonText: { color: warna.utamaTeks, fontSize: 15, lineHeight: 22, fontWeight: "700" },
  reopenButtonText: { color: warna.utama },
  disabled: { backgroundColor: warna.placeholder, opacity: 0.6 },
  pressed: { opacity: 0.8 },
  active: { color: warna.suksesTeks, backgroundColor: warna.suksesLatar, borderRadius: 16, padding: 14, marginTop: 14, fontSize: 14, lineHeight: 22, fontWeight: "600" },
  kodeBox: {
    marginTop: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: warna.permukaanLembut,
    borderWidth: 1.5,
    borderColor: warna.utama,
    alignItems: "center",
    gap: 10,
  },
  kodeLabel: {
    color: warna.teksRedup,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  kodeValue: {
    color: warna.utama,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: 6,
  },
  acakBtn: {
    marginTop: 2,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: warna.kartu,
    borderWidth: 1,
    borderColor: warna.garis,
  },
  acakBtnText: {
    color: warna.utama,
    fontSize: 13,
    fontWeight: "700",
  },
  error: { color: warna.error, fontSize: 14, lineHeight: 23, marginTop: 12 },
  loginLink: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingVertical: 10 },
  linkText: { color: warna.utama, fontSize: 14, lineHeight: 22, fontWeight: "600" },
});
