import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useReferensiIzinAsisten } from "../../../hooks/useReferensiIzinAsisten";
import type { PengajuanIzin, StatusIzin } from "../../../types";
import { LABEL_STATUS_IZIN, teksIzin } from "../../../utils/izinAsisten";

export function StatusPengajuanIzin({ status }: { status: StatusIzin }) {
  return <View style={[styles.badge, styles[status]]}><Text style={styles.badgeText}>{LABEL_STATUS_IZIN[status]}</Text></View>;
}

export function IdentitasPengajuanIzin({ asistenUid, pengajuan }: { asistenUid: string; pengajuan: PengajuanIzin }) {
  const profil = useReferensiIzinAsisten(asistenUid, "users", pengajuan.uid);
  const sesi = useReferensiIzinAsisten(asistenUid, "sessions", pengajuan.sessionId);
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{teksIzin(profil.data?.nama, profil.loading ? "Memuat praktikan..." : "Profil tidak tersedia")}</Text>
      <Text selectable style={styles.muted}>NIM: {teksIzin(profil.data?.nim, "Belum tersedia")} · UID: {pengajuan.uid}</Text>
      <Text style={styles.heading}>{teksIzin(sesi.data?.namaPraktikum, sesi.loading ? "Memuat sesi..." : "Sesi tidak tersedia")}</Text>
      {sesi.data ? <Text style={styles.muted}>{teksIzin(sesi.data.modul, "Modul belum tersedia")} · {teksIzin(sesi.data.waktu, "Jadwal belum tersedia")}</Text> : null}
      <Text selectable style={styles.muted}>ID sesi: {pengajuan.sessionId}</Text>
      {profil.error || sesi.error ? (
        <View>
          <Text accessibilityRole="alert" style={styles.warning}>Informasi praktikan/sesi belum dapat dimuat. {profil.error ?? sesi.error}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => { profil.cobaLagi(); sesi.cobaLagi(); }}>
            <Text style={styles.link}>Coba lagi informasi</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {!profil.loading && !profil.error && !profil.data ? <Text style={styles.warning}>Profil praktikan tidak ditemukan. Cocokkan UID sebelum memutuskan.</Text> : null}
      {!sesi.loading && !sesi.error && !sesi.data ? <Text style={styles.warning}>Sesi tidak ditemukan. Periksa pengajuan ini dengan pengelola kelas.</Text> : null}
    </View>
  );
}

export function AlasanPengajuanIzin({ pengajuan, ringkas = false }: { pengajuan: PengajuanIzin; ringkas?: boolean }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Alasan ketidakhadiran</Text>
      <Text selectable={!ringkas} numberOfLines={ringkas ? 3 : undefined} style={styles.reason}>{pengajuan.alasan}</Text>
      <View style={styles.ai}>
        <Text style={styles.heading}>Kategori AI</Text>
        <Text style={styles.reason}>{teksIzin(pengajuan.kategoriAI, "Kategori belum tersedia. Pengajuan tetap dapat diperiksa.")}</Text>
        <Text style={styles.muted}>Klasifikasi hanya informasi pendukung. Keputusan tetap ditentukan asisten.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  title: { color: "#0F172A", fontSize: 19, lineHeight: 28, fontWeight: "700" },
  heading: { color: "#334155", fontSize: 14, lineHeight: 22, fontWeight: "700" },
  reason: { color: "#334155", fontSize: 15, lineHeight: 25 },
  muted: { color: "#64748B", fontSize: 13, lineHeight: 21 },
  ai: { gap: 6, padding: 14, borderRadius: 12, backgroundColor: "#F1F5F9" },
  badge: { alignSelf: "flex-start", paddingVertical: 5, paddingHorizontal: 12, borderRadius: 12 },
  badgeText: { color: "#0F172A", fontSize: 13, lineHeight: 20, fontWeight: "600" },
  pending: { backgroundColor: "#FEF3C7" },
  approved: { backgroundColor: "#DCFCE7" },
  rejected: { backgroundColor: "#FEE2E2" },
  warning: { color: "#92400E", fontSize: 13, lineHeight: 21 },
  retry: { minHeight: 48, justifyContent: "center", alignSelf: "flex-start" },
  link: { color: "#4338CA", fontSize: 14, fontWeight: "600" },
});
