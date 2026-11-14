// SRS-03 — presensi Hadir. Izin melalui alur pengajuan milik Rajib.
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pesanError } from "../../lib/errors";
import type { Sesi } from "../../types";
import { BATAS_CATATAN_PRESENSI, validasiCatatanPresensi } from "../../utils/presensiPraktikan";

type Props = {
  sesi: Sesi;
  visible: boolean;
  onClose: () => void;
  onSubmit: (catatan: string) => Promise<void>;
  pesanNonaktif?: string;
};

export function FormPresensi(props: Props) {
  // Form baru setiap dibuka, sehingga catatan akun/sesi sebelumnya tidak tersisa.
  return props.visible ? <IsiFormPresensi {...props} /> : null;
}

function IsiFormPresensi({ sesi, onClose, onSubmit, pesanNonaktif }: Props) {
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState("");
  const [memproses, setMemproses] = useState(false);
  const terkunci = useRef(false);
  const aktif = useRef(true);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    aktif.current = true;
    return () => { aktif.current = false; };
  }, []);

  const tutup = () => { if (!terkunci.current) onClose(); };
  const submit = async () => {
    // Ref menolak ketukan kedua bahkan sebelum React selesai merender tombol.
    if (terkunci.current || pesanNonaktif) return;
    terkunci.current = true;
    setMemproses(true);
    setError("");
    try {
      await onSubmit(validasiCatatanPresensi(catatan));
      if (aktif.current) onClose();
    } catch (err) {
      if (aktif.current) setError(pesanError(err));
    } finally {
      terkunci.current = false;
      if (aktif.current) setMemproses(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={tutup}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={tutup} disabled={memproses} accessibilityLabel="Tutup form presensi" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.handle} />
            <Text accessibilityRole="header" style={styles.title}>Konfirmasi kehadiran</Text>
            <Text style={styles.subtitle}>{sesi.namaPraktikum}</Text>
            <Text style={styles.info}>Kehadiran dicatat sebagai Hadir. Pengajuan izin dilakukan melalui menu izin.</Text>
            <Text style={styles.label}>Catatan (opsional)</Text>
            <TextInput
              accessibilityLabel="Catatan presensi"
              value={catatan} onChangeText={setCatatan} placeholder="Tambahkan catatan"
              multiline maxLength={BATAS_CATATAN_PRESENSI} editable={!memproses && !pesanNonaktif}
              style={styles.input}
            />
            <Text style={styles.counter}>{catatan.length}/{BATAS_CATATAN_PRESENSI}</Text>
            {pesanNonaktif ? <Text accessibilityRole="alert" style={styles.error}>{pesanNonaktif}</Text> : null}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              onPress={submit} disabled={memproses || Boolean(pesanNonaktif)}
              accessibilityRole="button" accessibilityState={{ disabled: memproses || Boolean(pesanNonaktif), busy: memproses }}
              style={[styles.submitButton, (memproses || pesanNonaktif) && styles.disabled]}
            >
              {memproses ? <ActivityIndicator color="#FFFFFF" /> : null}
              <Text style={styles.submitText}>{memproses ? "Menyimpan presensi..." : "Konfirmasi hadir"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={tutup} disabled={memproses} style={styles.cancelButton} accessibilityRole="button">
              <Text style={styles.cancelText}>Batal</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.45)" },
  sheet: { maxHeight: "90%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  content: { padding: 24, paddingBottom: 8, gap: 10 },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: "#CBD5E1", marginBottom: 10 },
  title: { color: "#0F172A", fontSize: 22, lineHeight: 30, fontWeight: "700" },
  subtitle: { color: "#64748B", fontSize: 14, lineHeight: 22 },
  info: { color: "#475569", fontSize: 14, lineHeight: 23, marginBottom: 8 },
  label: { color: "#334155", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  input: { minHeight: 80, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 12, textAlignVertical: "top", color: "#0F172A" },
  counter: { alignSelf: "flex-end", color: "#64748B", fontSize: 12 },
  error: { color: "#B91C1C", fontSize: 13, lineHeight: 21 },
  submitButton: { minHeight: 50, borderRadius: 12, backgroundColor: "#4338CA", flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", padding: 12, marginTop: 8 },
  disabled: { opacity: 0.5 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cancelButton: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#4338CA", fontWeight: "600" },
});
