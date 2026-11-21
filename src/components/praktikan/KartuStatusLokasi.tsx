// src/components/praktikan/KartuStatusLokasi.tsx
// Menampilkan hasil pemeriksaan radius laboratorium & jalan keluar kondisi lokasi (SRS-10, SRS-15).
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Lab } from "../../types";
import {
  formatJarakMeter,
  type HasilEvaluasiPresensiLokasi,
} from "../../utils/presensiPraktikan";
import { radius, warna } from "../../theme";

type Props = {
  evaluasi: HasilEvaluasiPresensiLokasi;
  lab: Lab | null;
  onMintaIzin: () => void;
  onMuatUlangLokasi: () => void;
  onBukaPengaturan: () => void;
  onCobaLagiData: () => void;
};

const GAYA_NADA = {
  sukses: { latar: warna.suksesLatar, teks: warna.suksesTeks },
  peringatan: { latar: warna.peringatanLatar, teks: warna.peringatanTeks },
  error: { latar: warna.errorLatar, teks: warna.errorTeks },
  netral: { latar: warna.permukaanLembut, teks: warna.teksRedup },
} as const;

export function KartuStatusLokasi({
  evaluasi,
  lab,
  onMintaIzin,
  onMuatUlangLokasi,
  onBukaPengaturan,
  onCobaLagiData,
}: Props) {
  const gayaBadge = GAYA_NADA[evaluasi.nada];
  const sedangMemuat =
    evaluasi.kode === "lokasi_memuat" ||
    evaluasi.kode === "lab_memuat" ||
    evaluasi.kode === "presensi_memuat";
  const labelLab = lab
    ? [lab.nama, lab.gedung].filter(Boolean).join(" · ")
    : null;

  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>PEMERIKSAAN LOKASI</Text>
        <View style={[styles.badge, { backgroundColor: gayaBadge.latar }]}>
          <Text style={[styles.badgeText, { color: gayaBadge.teks }]}>
            {evaluasi.labelLencana}
          </Text>
        </View>
      </View>

      <View style={styles.titleRow}>
        {sedangMemuat ? <ActivityIndicator size="small" color={warna.utama} /> : null}
        <Text style={styles.title}>{evaluasi.judulStatus}</Text>
      </View>
      <Text style={styles.description}>{evaluasi.deskripsiStatus}</Text>

      {labelLab || evaluasi.radiusMeter != null || evaluasi.jarakMeter != null || evaluasi.akurasiMeter != null ? (
        <View style={styles.detailBox}>
          {labelLab ? (
            <View style={styles.row}>
              <Text style={styles.label}>Laboratorium</Text>
              <Text style={styles.value}>{labelLab}</Text>
            </View>
          ) : null}
          {evaluasi.radiusMeter != null ? (
            <View style={styles.row}>
              <Text style={styles.label}>Radius berlaku</Text>
              <Text style={styles.value}>{formatJarakMeter(evaluasi.radiusMeter)}</Text>
            </View>
          ) : null}
          {evaluasi.jarakMeter != null ? (
            <View style={styles.row}>
              <Text style={styles.label}>Jarak perangkat</Text>
              <Text
                style={[
                  styles.value,
                  evaluasi.dalamRadius === true && styles.valueSukses,
                  evaluasi.dalamRadius === false && styles.valueError,
                ]}
              >
                {formatJarakMeter(evaluasi.jarakMeter, evaluasi.radiusMeter)}
              </Text>
            </View>
          ) : null}
          {evaluasi.akurasiMeter != null ? (
            <View style={styles.row}>
              <Text style={styles.label}>Akurasi GPS</Text>
              <Text style={styles.value}>±{formatJarakMeter(evaluasi.akurasiMeter)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {evaluasi.aksiLokasi === "minta_izin_dan_pengaturan" ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={onMintaIzin}
            style={styles.secondaryButton}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Minta izin lagi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onBukaPengaturan}
            style={styles.secondaryButton}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Buka pengaturan</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {evaluasi.aksiLokasi === "pengaturan_dan_coba_lagi" ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={onBukaPengaturan}
            style={styles.secondaryButton}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Buka pengaturan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMuatUlangLokasi}
            style={styles.secondaryButton}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {evaluasi.aksiLokasi === "coba_lagi_lokasi" ? (
        <TouchableOpacity
          onPress={onMuatUlangLokasi}
          style={styles.secondaryButton}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>
            {evaluasi.kode === "dalam_radius" ? "Perbarui lokasi" : "Muat ulang lokasi"}
          </Text>
        </TouchableOpacity>
      ) : null}

      {evaluasi.aksiLokasi === "coba_lagi_lab" ? (
        <TouchableOpacity
          onPress={onCobaLagiData}
          style={styles.secondaryButton}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Coba lagi</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    color: warna.teksRedup,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pil,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    flex: 1,
    color: warna.teks,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800",
  },
  description: {
    color: warna.teksIsi,
    fontSize: 14,
    lineHeight: 22,
  },
  detailBox: {
    backgroundColor: warna.permukaanLembut,
    borderRadius: radius.kecil,
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    color: warna.teksRedup,
    fontSize: 13,
    lineHeight: 20,
  },
  value: {
    flex: 1,
    color: warna.teks,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "right",
  },
  valueSukses: { color: warna.suksesTeks },
  valueError: { color: warna.errorTeks },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  secondaryButton: {
    flexGrow: 1,
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: radius.pil,
    borderWidth: 1,
    borderColor: warna.garisKuat,
    backgroundColor: warna.kartu,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: warna.utama,
    fontSize: 14,
    fontWeight: "700",
  },
});
