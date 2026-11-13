import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { putuskanPengajuanIzin } from "../../../hooks/useIzinAsisten";
import { pesanError } from "../../../lib/errors";
import type { PengajuanIzin } from "../../../types";
import { isiIzinSama, type KeputusanIzin } from "../../../utils/izinAsisten";
import { ErrorBanner } from "../../shared/StatusLayar";

interface Props {
  asistenUid: string;
  pengajuan: PengajuanIzin;
  dariCache: boolean;
  tertunda: boolean;
}

export function KeputusanPengajuanIzin({ asistenUid, pengajuan, dariCache, tertunda }: Props) {
  const [pilihan, setPilihan] = useState<{ keputusan: KeputusanIzin; ditinjau: PengajuanIzin } | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [tersimpan, setTersimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kunci = useRef(false);
  const aktif = useRef(true);
  useEffect(() => {
    aktif.current = true;
    return () => { aktif.current = false; };
  }, []);

  const pesanNonaktif = pengajuan.status !== "pending" ? "Pengajuan ini sudah diputuskan."
    : dariCache || tertunda ? "Tunggu data terbaru dari server sebelum memberikan keputusan."
      : pilihan && !isiIzinSama(pilihan.ditinjau, pengajuan) ? "Isi pengajuan berubah. Batalkan konfirmasi dan periksa kembali."
        : tersimpan ? "Keputusan tersimpan. Menunggu pembaruan status..." : null;

  const pilih = (keputusan: KeputusanIzin) => {
    if (kunci.current || pesanNonaktif) return;
    setError(null);
    setPilihan({ keputusan, ditinjau: { ...pengajuan } });
  };
  const simpan = async () => {
    if (!pilihan || pesanNonaktif || kunci.current) return;
    kunci.current = true;
    setMengirim(true);
    setError(null);
    try {
      await putuskanPengajuanIzin({ asistenUid, pengajuan: pilihan.ditinjau, keputusan: pilihan.keputusan });
      if (aktif.current) setTersimpan(true);
    } catch (kesalahan) {
      if (aktif.current) setError(pesanError(kesalahan));
    } finally {
      if (aktif.current) {
        kunci.current = false;
        setMengirim(false);
      }
    }
  };
  const batal = () => {
    if (kunci.current) return;
    setPilihan(null);
    setError(null);
  };

  if (pengajuan.status !== "pending") return <Text style={styles.description}>Keputusan telah dicatat. Pengajuan ini tidak dapat diputuskan ulang.</Text>;

  const nonaktif = mengirim || Boolean(pesanNonaktif);
  return (
    <View style={styles.panel}>
      <Text accessibilityRole="header" style={styles.title}>Keputusan asisten</Text>
      {pesanNonaktif ? <Text accessibilityRole="status" style={styles.notice}>{pesanNonaktif}</Text> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {pilihan ? (
        <View style={styles.section}>
          <Text style={styles.title}>{pilihan.keputusan === "approved" ? "Terima pengajuan ini?" : "Tolak pengajuan ini?"}</Text>
          <Text style={styles.description}>Pastikan alasan dan sesi sudah sesuai. Keputusan akan terlihat oleh praktikan setelah tersimpan.</Text>
          <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: nonaktif, busy: mengirim }} disabled={nonaktif} onPress={simpan}
              style={[styles.button, pilihan.keputusan === "approved" ? styles.accept : styles.reject, nonaktif && styles.disabled]}>
              {mengirim ? <ActivityIndicator color="#FFFFFF" /> : null}
              <Text style={styles.buttonText}>{mengirim ? "Menyimpan keputusan..." : pilihan.keputusan === "approved" ? "Ya, terima izin" : "Ya, tolak izin"}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={mengirim || tersimpan} onPress={batal} style={[styles.button, styles.cancel, (mengirim || tersimpan) && styles.disabled]}>
              <Text style={styles.cancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: nonaktif }} disabled={nonaktif} onPress={() => pilih("approved")} style={[styles.button, styles.accept, nonaktif && styles.disabled]}>
            <Text style={styles.buttonText}>Terima izin</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: nonaktif }} disabled={nonaktif} onPress={() => pilih("rejected")} style={[styles.button, styles.reject, nonaktif && styles.disabled]}>
            <Text style={styles.buttonText}>Tolak izin</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", gap: 14 },
  section: { gap: 12 },
  title: { fontSize: 17, lineHeight: 25, color: "#0F172A", fontWeight: "700" },
  description: { fontSize: 14, lineHeight: 23, color: "#64748B" },
  notice: { fontSize: 14, lineHeight: 23, color: "#92400E" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  button: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8 },
  accept: { backgroundColor: "#166534" },
  reject: { backgroundColor: "#B91C1C" },
  cancel: { backgroundColor: "#F1F5F9" },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#FFFFFF", fontSize: 14, lineHeight: 22, fontWeight: "700" },
  cancelText: { color: "#334155", fontSize: 14, lineHeight: 22, fontWeight: "600" },
});
