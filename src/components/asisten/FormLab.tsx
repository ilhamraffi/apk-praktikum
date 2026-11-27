// src/components/asisten/FormLab.tsx
// Form tambah/ubah laboratorium (SRS-11). Koordinat bisa diisi manual atau
// diambil dari lokasi perangkat saat ini. Dipasang secara kondisional oleh
// layar induk sehingga state terinisialisasi dari `awal`.
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import {
  RADIUS_MAKS_METER,
  RADIUS_MIN_METER,
  type InputLab,
} from "../../hooks/useLab";
import { pesanError } from "../../lib/errors";
import type { Lab } from "../../types";
import { warna } from "../../theme";

type FormLabProps = {
  awal?: Lab | null;
  onBatal: () => void;
  onSimpan: (input: InputLab) => Promise<unknown>;
};

type StatusLokasiForm =
  | "idle"
  | "memuat"
  | "izin_ditolak"
  | "layanan_mati"
  | "tidak_tersedia";

function parseAngka(teks: string): number | null {
  const bersih = teks.trim().replace(",", ".");
  if (!bersih || !/^-?\d+(\.\d+)?$/.test(bersih)) return null;
  const angka = Number(bersih);
  return Number.isFinite(angka) ? angka : null;
}

function teksAngka(nilai: number | null | undefined): string {
  if (nilai == null || !Number.isFinite(nilai)) return "";
  return String(nilai).replace(".", ",");
}

export function FormLab({ awal, onBatal, onSimpan }: FormLabProps) {
  const [nama, setNama] = useState(awal?.nama ?? "");
  const [gedung, setGedung] = useState(awal?.gedung ?? "");
  const [latitude, setLatitude] = useState(teksAngka(awal?.latitude));
  const [longitude, setLongitude] = useState(teksAngka(awal?.longitude));
  const [radius, setRadius] = useState(teksAngka(awal?.radiusMeter));
  const [memproses, setMemproses] = useState(false);
  const [error, setError] = useState("");
  const [statusLokasi, setStatusLokasi] = useState<StatusLokasiForm>("idle");

  const gunakanLokasi = async () => {
    setError("");
    setStatusLokasi("memuat");
    try {
      const layananAktif = await Location.hasServicesEnabledAsync();
      if (!layananAktif) {
        setStatusLokasi("layanan_mati");
        return;
      }
      const izin = await Location.requestForegroundPermissionsAsync();
      if (izin.status !== Location.PermissionStatus.GRANTED) {
        setStatusLokasi("izin_ditolak");
        return;
      }
      const posisi = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitude(teksAngka(posisi.coords.latitude));
      setLongitude(teksAngka(posisi.coords.longitude));
      setStatusLokasi("idle");
    } catch {
      setStatusLokasi("tidak_tersedia");
    }
  };

  const submit = async () => {
    setError("");

    const namaBersih = nama.trim();
    if (!namaBersih) {
      setError("Nama laboratorium wajib diisi.");
      return;
    }
    if (namaBersih.length > 120) {
      setError("Nama laboratorium maksimal 120 karakter.");
      return;
    }
    if (gedung.trim().length > 160) {
      setError("Keterangan gedung maksimal 160 karakter.");
      return;
    }

    const lat = parseAngka(latitude);
    const lng = parseAngka(longitude);
    const rad = parseAngka(radius);

    if (lat == null || lng == null) {
      setError(
        "Latitude dan longitude wajib diisi angka yang valid (contoh -6.8915, 107.6107).",
      );
      return;
    }
    if (lat < -90 || lat > 90) {
      setError("Latitude harus antara -90 dan 90.");
      return;
    }
    if (lng < -180 || lng > 180) {
      setError("Longitude harus antara -180 dan 180.");
      return;
    }
    if (rad == null || rad < RADIUS_MIN_METER || rad > RADIUS_MAKS_METER) {
      setError(
        `Radius presensi harus antara ${RADIUS_MIN_METER} dan ${RADIUS_MAKS_METER} meter.`,
      );
      return;
    }

    setMemproses(true);
    try {
      await onSimpan({
        nama: namaBersih,
        gedung: gedung.trim(),
        latitude: lat,
        longitude: lng,
        radiusMeter: rad,
      });
      onBatal();
    } catch (e) {
      setError(pesanError(e));
    } finally {
      setMemproses(false);
    }
  };

  const teksStatusLokasi =
    statusLokasi === "memuat"
      ? "Mencari lokasi perangkat..."
      : statusLokasi === "izin_ditolak"
        ? "Izin lokasi ditolak. Izinkan lewat pengaturan atau isi manual."
        : statusLokasi === "layanan_mati"
          ? "Layanan lokasi (GPS) perangkat nonaktif. Nyalakan lalu coba lagi."
          : statusLokasi === "tidak_tersedia"
            ? "Lokasi belum tersedia. Coba lagi atau isi manual."
            : "";

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onBatal}>
      <SafeAreaView style={styles.overlay}>
        <KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View accessibilityViewIsModal style={styles.sheet}>
            <Text accessibilityRole="header" style={styles.title}>
              {awal ? "Ubah laboratorium" : "Tambah laboratorium"}
            </Text>

            <Text style={styles.label}>Nama laboratorium</Text>
            <TextInput
              style={styles.input}
              value={nama}
              onChangeText={setNama}
              placeholder="Contoh: Lab Komputasi Dasar E301"
              maxLength={120}
            />

            <Text style={styles.label}>Gedung / keterangan (opsional)</Text>
            <TextInput
              style={styles.input}
              value={gedung}
              onChangeText={setGedung}
              placeholder="Contoh: Gedung E lantai 3"
              maxLength={160}
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  value={latitude}
                  onChangeText={setLatitude}
                  placeholder="-6.8915"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="107.6107"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              disabled={memproses || statusLokasi === "memuat"}
              activeOpacity={0.85}
              onPress={gunakanLokasi}
              style={styles.lokasiBtn}
            >
              <Text style={styles.lokasiBtnText}>
                {statusLokasi === "memuat"
                  ? "Mengambil lokasi..."
                  : "Gunakan lokasi saya saat ini"}
              </Text>
            </TouchableOpacity>

            {teksStatusLokasi ? (
              <View style={styles.lokasiStatus}>
                <Text style={styles.lokasiStatusText}>{teksStatusLokasi}</Text>
                {statusLokasi === "izin_ditolak" ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => void Linking.openSettings().catch(() => {})}
                  >
                    <Text style={styles.lokasiTautan}>Buka pengaturan</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.label}>Radius presensi (meter)</Text>
            <TextInput
              style={styles.input}
              value={radius}
              onChangeText={setRadius}
              placeholder={`${RADIUS_MIN_METER} - ${RADIUS_MAKS_METER}`}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>
              Presensi sah bila perangkat berada dalam radius ini dari
              laboratorium (1–250 meter).
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={submit}
              disabled={memproses}
              style={({ pressed }) => [styles.submit, pressed && styles.pressed]}
            >
              <Text style={styles.submitText}>
                {memproses ? "Menyimpan..." : "Simpan"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onBatal}
              disabled={memproses}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: warna.overlay },
  keyboardView: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: warna.kartu,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  title: { color: warna.teks, fontSize: 22, lineHeight: 30, fontWeight: "700" },
  label: { color: warna.teksIsi, fontSize: 14, lineHeight: 22, fontWeight: "600", marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: warna.garisKuat,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: warna.teks,
    marginTop: 8,
  },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  lokasiBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: warna.utama,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingHorizontal: 12,
  },
  lokasiBtnText: { color: warna.utama, fontSize: 14, fontWeight: "700" },
  lokasiStatus: { marginTop: 8, gap: 4 },
  lokasiStatusText: { color: warna.teksRedup, fontSize: 13, lineHeight: 20 },
  lokasiTautan: { color: warna.utama, fontSize: 13, fontWeight: "700" },
  hint: { color: warna.teksRedup, fontSize: 13, lineHeight: 20, marginTop: 8 },
  error: { color: warna.error, fontSize: 13, lineHeight: 20, marginTop: 12 },
  submit: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: warna.utama,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  submitText: { color: warna.utamaTeks, fontSize: 15, fontWeight: "700" },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { color: warna.utama, fontWeight: "600" },
  pressed: { opacity: 0.8 },
});
