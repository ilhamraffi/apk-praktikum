// src/components/asisten/FormSesi.tsx
// Form tambah/ubah sesi. Dipasang secara kondisional oleh layar induk sehingga
// state terinisialisasi dari `awal`.
import { useState } from "react";
import {
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
import { pesanError } from "../../lib/errors";
import type { Kelas, Sesi } from "../../types";
import type { InputSesi } from "../../hooks/useSesi";

type FormSesiProps = {
  awal?: Sesi | null;
  daftarKelas: Kelas[];
  onBatal: () => void;
  onSimpan: (input: InputSesi) => Promise<unknown>;
};

export function FormSesi({ awal, daftarKelas, onBatal, onSimpan }: FormSesiProps) {
  const [namaPraktikum, setNamaPraktikum] = useState(awal?.namaPraktikum ?? "");
  const [modul, setModul] = useState(awal?.modul ?? "");
  const [waktu, setWaktu] = useState(awal?.waktu ?? "");
  const [ruangan, setRuangan] = useState(awal?.ruangan ?? "");
  const [classId, setClassId] = useState(awal?.classId ?? daftarKelas[0]?.id ?? "");
  const [memproses, setMemproses] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!namaPraktikum.trim() || !modul.trim() || !waktu.trim() || !ruangan.trim()) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    if (!classId) {
      setError("Pilih kelas terlebih dahulu. Jika belum ada, buat kelas dulu.");
      return;
    }
    setMemproses(true);
    try {
      await onSimpan({
        classId,
        namaPraktikum: namaPraktikum.trim(),
        modul: modul.trim(),
        waktu: waktu.trim(),
        ruangan: ruangan.trim(),
      });
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
              {awal ? "Ubah sesi" : "Tambah sesi"}
            </Text>

            <Text style={styles.label}>Nama praktikum</Text>
            <TextInput
              style={styles.input}
              value={namaPraktikum}
              onChangeText={setNamaPraktikum}
              placeholder="Contoh: Pengembangan Platform Khusus"
            />

            <Text style={styles.label}>Modul</Text>
            <TextInput
              style={styles.input}
              value={modul}
              onChangeText={setModul}
              placeholder="Contoh: Modul 1"
            />

            <Text style={styles.label}>Waktu</Text>
            <TextInput
              style={styles.input}
              value={waktu}
              onChangeText={setWaktu}
              placeholder="Contoh: Kamis, 08:00 - 10:30 WIB"
            />

            <Text style={styles.label}>Ruangan</Text>
            <TextInput
              style={styles.input}
              value={ruangan}
              onChangeText={setRuangan}
              placeholder="Contoh: Lab Komputasi Dasar E301"
            />

            <Text style={styles.label}>Kelas</Text>
            {daftarKelas.length === 0 ? (
              <Text style={styles.hint}>
                Belum ada kelas. Buat kelas terlebih dahulu di halaman Kelas.
              </Text>
            ) : (
              <View style={styles.chipRow}>
                {daftarKelas.map((k) => {
                  const aktif = classId === k.id;
                  return (
                    <TouchableOpacity
                      key={k.id}
                      onPress={() => setClassId(k.id ?? "")}
                      style={[styles.chip, aktif && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, aktif && styles.chipTextActive]}>
                        {k.nama} ({k.kode})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

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
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.45)" },
  container: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  title: { color: "#0F172A", fontSize: 22, lineHeight: 30, fontWeight: "700" },
  label: { color: "#334155", fontSize: 14, lineHeight: 22, fontWeight: "600", marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#0F172A",
    marginTop: 8,
  },
  hint: { color: "#64748B", fontSize: 14, lineHeight: 22, marginTop: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipActive: { backgroundColor: "#4338CA", borderColor: "#4338CA" },
  chipText: { color: "#334155", fontWeight: "600", fontSize: 14 },
  chipTextActive: { color: "#FFFFFF" },
  error: { color: "#B91C1C", fontSize: 13, lineHeight: 20, marginTop: 12 },
  submit: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#1E1B4B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#4338CA", fontWeight: "600" },
  pressed: { opacity: 0.8 },
});
