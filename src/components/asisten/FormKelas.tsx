// src/components/asisten/FormKelas.tsx
// Form tambah/ubah kelas. Dipasang secara kondisional oleh layar induk
// (dirender hanya saat form terbuka) sehingga state terinisialisasi dari `awal`.
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { pesanError } from "../../lib/errors";
import type { Kelas } from "../../types";
import { warna } from "../../theme";

type FormKelasProps = {
  awal?: Kelas | null;
  onBatal: () => void;
  onSimpan: (input: { nama: string; kode: string }) => Promise<unknown>;
};

export function FormKelas({ awal, onBatal, onSimpan }: FormKelasProps) {
  const [nama, setNama] = useState(awal?.nama ?? "");
  const [kode, setKode] = useState(awal?.kode ?? "");
  const [memproses, setMemproses] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!nama.trim() || !kode.trim()) {
      setError("Nama dan kode kelas tidak boleh kosong.");
      return;
    }
    setMemproses(true);
    try {
      await onSimpan({ nama: nama.trim(), kode: kode.trim() });
      onBatal();
    } catch (e) {
      setError(pesanError(e));
    } finally {
      setMemproses(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onBatal}>
      <SafeAreaView style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View accessibilityViewIsModal style={styles.sheet}>
            <Text accessibilityRole="header" style={styles.title}>
              {awal ? "Ubah kelas" : "Tambah kelas"}
            </Text>

            <Text style={styles.label}>Nama kelas</Text>
            <TextInput
              style={styles.input}
              value={nama}
              onChangeText={setNama}
              placeholder="Contoh: IF-C"
            />

            <Text style={styles.label}>Kode kelas</Text>
            <TextInput
              style={styles.input}
              value={kode}
              onChangeText={setKode}
              placeholder="Contoh: C"
              autoCapitalize="characters"
            />

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
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: warna.overlay },
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