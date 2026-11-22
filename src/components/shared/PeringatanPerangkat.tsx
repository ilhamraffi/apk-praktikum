// src/components/shared/PeringatanPerangkat.tsx
// Komponen bersama SRS-15 untuk menampilkan peringatan izin/kondisi lokasi
// dan notifikasi disertai tombol jalan keluar (Coba lagi / Buka pengaturan).
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { StatusNotifikasiAkun } from "../../context/AuthContext";
import type { StatusLokasi } from "../../hooks/useLokasiPerangkat";
import { radius, warna } from "../../theme";

export function bukaPengaturanPerangkat() {
  void Linking.openSettings().catch(() => {});
}

export function PeringatanNotifikasi({
  status,
  pesanError,
  onCobaLagi,
}: {
  status: StatusNotifikasiAkun;
  pesanError?: string | null;
  onCobaLagi: () => void;
}) {
  if (status === "idle" || status === "aktif" || status === "memuat") {
    return null;
  }

  const ditolak = status === "izin_ditolak";
  const judul = ditolak
    ? "Pemberitahuan nonaktif"
    : "Notifikasi belum dapat didaftarkan";
  const deskripsi = ditolak
    ? "Izin notifikasi ditolak. Aplikasi tetap dapat dipakai dan data berubah secara real-time, tetapi kamu tidak akan menerima push notification saat sesi dibuka atau status izin berubah."
    : pesanError ||
      "Token notifikasi perangkat belum berhasil disimpan. Perubahan data tetap terlihat real-time saat aplikasi dibuka.";

  return (
    <View accessibilityRole="alert" style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>STATUS NOTIFIKASI</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{ditolak ? "Izin ditolak" : "Gangguan"}</Text>
        </View>
      </View>
      <Text style={styles.title}>{judul}</Text>
      <Text style={styles.description}>{deskripsi}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onCobaLagi}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Coba lagi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={bukaPengaturanPerangkat}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Buka pengaturan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function PeringatanLokasiPeta({
  status,
  timeout = false,
  onMintaIzin,
  onMuatUlang,
}: {
  status: StatusLokasi;
  timeout?: boolean;
  onMintaIzin: () => void;
  onMuatUlang: () => void;
}) {
  if (status === "siap") return null;

  if (status === "memuat" && !timeout) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.loadingBar}>
        <ActivityIndicator size="small" color={warna.utama} />
        <Text style={styles.loadingText}>
          Mencari lokasi perangkat... Peta laboratorium tetap dapat digunakan.
        </Text>
      </View>
    );
  }

  const info =
    status === "izin_ditolak"
      ? {
          lencana: "Izin ditolak",
          judul: "Izin lokasi ditolak",
          deskripsi:
            "Lokasi dibutuhkan untuk menampilkan posisi perangkatmu dan menghitung jarak ke laboratorium. Peta laboratorium tetap ditampilkan tanpa marker posisimu.",
          tampilPengaturan: true,
          labelAksi: "Minta izin lagi",
          onAksi: onMintaIzin,
        }
      : status === "layanan_mati"
        ? {
            lencana: "GPS nonaktif",
            judul: "Layanan lokasi (GPS) nonaktif",
            deskripsi:
              "Aktifkan layanan lokasi/GPS di perangkat agar marker posisimu muncul di peta laboratorium.",
            tampilPengaturan: true,
            labelAksi: "Coba lagi",
            onAksi: onMuatUlang,
          }
        : {
            lencana: timeout ? "Waktu habis" : "Belum tersedia",
            judul: timeout
              ? "Pencarian lokasi melewati batas waktu"
              : "Lokasi perangkat belum tersedia",
            deskripsi:
              "Koordinat GPS perangkat belum dapat dibaca. Pastikan sinyal GPS memadai lalu tekan Coba lagi.",
            tampilPengaturan: false,
            labelAksi: "Coba lagi",
            onAksi: onMuatUlang,
          };

  return (
    <View accessibilityRole="alert" style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>LOKASI PERANGKAT</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{info.lencana}</Text>
        </View>
      </View>
      <Text style={styles.title}>{info.judul}</Text>
      <Text style={styles.description}>{info.deskripsi}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={info.onAksi}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{info.labelAksi}</Text>
        </TouchableOpacity>
        {info.tampilPengaturan ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={bukaPengaturanPerangkat}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Buka pengaturan</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: warna.peringatanLatar,
    borderWidth: 1,
    borderColor: warna.garisKuat,
    borderRadius: radius.kecil,
    padding: 14,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  eyebrow: {
    color: warna.peringatanTeks,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  badge: {
    backgroundColor: warna.kartuKaca,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pil,
  },
  badgeText: {
    color: warna.peringatanTeks,
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    color: warna.teks,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
  },
  description: {
    color: warna.teksIsi,
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  button: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pil,
    borderWidth: 1,
    borderColor: warna.garisKuat,
    backgroundColor: warna.kartu,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: warna.utama,
    fontSize: 13,
    fontWeight: "700",
  },
  loadingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: warna.permukaanLembut,
    borderWidth: 1,
    borderColor: warna.garis,
    borderRadius: radius.kecil,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  loadingText: {
    flex: 1,
    color: warna.teksIsi,
    fontSize: 13,
    lineHeight: 19,
  },
});
