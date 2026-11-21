// src/components/asisten/FormSesi.tsx
// Form tambah/ubah sesi. Nama praktikum diambil dari kelas yang dipilih,
// waktu berupa tanggal + jam (bukan teks bebas), dan sesi baru bisa diulang
// tiap minggu. Dipasang secara kondisional oleh layar induk sehingga state
// terinisialisasi dari `awal`.
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
import { MAKS_PERTEMUAN, type InputSesi } from "../../hooks/useSesi";
import { pesanError } from "../../lib/errors";
import type { Kelas, Lab, Sesi } from "../../types";
import {
  formatJamInput,
  formatTanggalInput,
  formatTanggalPanjang,
  gabungWaktu,
  keDate,
  maskJam,
  maskTanggal,
  tambahMinggu,
} from "../../utils/waktuSesi";
import { warna } from "../../theme";

type FormSesiProps = {
  awal?: Sesi | null;
  daftarKelas: Kelas[];
  daftarLab: Lab[];
  onBatal: () => void;
  onSimpan: (input: InputSesi, jumlahPertemuan: number) => Promise<unknown>;
};

const JUMLAH_SEMESTER = 14; // perkiraan jumlah pertemuan dalam satu semester

export function FormSesi({
  awal,
  daftarKelas,
  daftarLab,
  onBatal,
  onSimpan,
}: FormSesiProps) {
  const mulaiAwal = keDate(awal?.mulai);
  const selesaiAwal = keDate(awal?.selesai);

  const [classId, setClassId] = useState(
    awal?.classId ?? daftarKelas[0]?.id ?? "",
  );
  const [modul, setModul] = useState(awal?.modul ?? "");
  const [tanggal, setTanggal] = useState(
    mulaiAwal ? formatTanggalInput(mulaiAwal) : "",
  );
  const [jamMulai, setJamMulai] = useState(
    mulaiAwal ? formatJamInput(mulaiAwal) : "",
  );
  const [jamSelesai, setJamSelesai] = useState(
    selesaiAwal ? formatJamInput(selesaiAwal) : "",
  );
  const [labId, setLabId] = useState(awal?.labId ?? "");
  const [ulang, setUlang] = useState(false);
  const [jumlah, setJumlah] = useState(String(JUMLAH_SEMESTER));
  const [memproses, setMemproses] = useState(false);
  const [error, setError] = useState("");

  const kelasTerpilih = daftarKelas.find((k) => k.id === classId);
  const labTerpilih = daftarLab.find((l) => l.id === labId);
  const namaPraktikum = kelasTerpilih?.nama ?? awal?.namaPraktikum ?? "";
  const modeTambah = !awal;
  const berulang = modeTambah && ulang;

  const jumlahPertemuan = Number(jumlah);
  const jumlahValid =
    Number.isInteger(jumlahPertemuan) &&
    jumlahPertemuan >= 2 &&
    jumlahPertemuan <= MAKS_PERTEMUAN;
  const mulaiPreview = gabungWaktu(tanggal, jamMulai);
  const pertemuanTerakhir =
    berulang && jumlahValid && mulaiPreview
      ? tambahMinggu(mulaiPreview, jumlahPertemuan - 1)
      : null;

  const submit = async () => {
    setError("");
    if (!classId || !kelasTerpilih) {
      setError("Pilih kelas terlebih dahulu. Jika belum ada, buat kelas dulu.");
      return;
    }
    if (!berulang && !modul.trim()) {
      setError("Modul wajib diisi.");
      return;
    }
    if (!labTerpilih) {
      setError(
        daftarLab.length === 0
          ? "Belum ada laboratorium. Buat laboratorium terlebih dahulu."
          : "Pilih laboratorium untuk sesi ini.",
      );
      return;
    }
    const mulai = gabungWaktu(tanggal, jamMulai);
    const selesai = gabungWaktu(tanggal, jamSelesai);
    if (!mulai) {
      setError(
        "Tanggal harus berformat DD-MM-YYYY (contoh 20-11-2026) dan jam mulai HH:MM (contoh 08:00).",
      );
      return;
    }
    if (!selesai) {
      setError("Jam selesai harus berformat HH:MM (contoh 10:30).");
      return;
    }
    if (selesai.getTime() <= mulai.getTime()) {
      setError("Jam selesai harus setelah jam mulai.");
      return;
    }
    if (berulang && !jumlahValid) {
      setError(
        `Jumlah pertemuan harus bilangan bulat 2 sampai ${MAKS_PERTEMUAN}.`,
      );
      return;
    }

    setMemproses(true);
    try {
      await onSimpan(
        {
          classId,
          namaPraktikum: kelasTerpilih.nama.trim(),
          modul: modul.trim(),
          mulai,
          selesai,
          ruangan: labTerpilih.nama.trim(),
          labId: labTerpilih.id,
        },
        berulang ? jumlahPertemuan : 1,
      );
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
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View accessibilityViewIsModal style={styles.sheet}>
            <Text accessibilityRole="header" style={styles.title}>
              {awal ? "Ubah sesi" : "Tambah sesi"}
            </Text>

            <Text style={styles.label}>Kelas (praktikum)</Text>
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
                      <Text
                        style={[
                          styles.chipText,
                          aktif && styles.chipTextActive,
                        ]}
                      >
                        {k.nama} ({k.kode})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {namaPraktikum ? (
              <Text style={styles.hint}>Nama praktikum: {namaPraktikum}</Text>
            ) : null}

            {berulang ? (
              <Text style={styles.hint}>
                Modul diberi nomor otomatis (Pertemuan 1, 2, ...). Tiap
                pertemuan bisa diubah satu per satu nanti.
              </Text>
            ) : (
              <>
                <Text style={styles.label}>Modul</Text>
                <TextInput
                  style={styles.input}
                  value={modul}
                  onChangeText={setModul}
                  placeholder="Contoh: Modul 1"
                />
              </>
            )}

            <Text style={styles.label}>Tanggal (DD-MM-YYYY)</Text>
            <TextInput
              style={styles.input}
              value={tanggal}
              onChangeText={(t) => setTanggal(maskTanggal(t))}
              placeholder="Contoh: 20-11-2026"
              keyboardType="number-pad"
              maxLength={10}
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Jam mulai</Text>
                <TextInput
                  style={styles.input}
                  value={jamMulai}
                  onChangeText={(t) => setJamMulai(maskJam(t))}
                  placeholder="08:00"
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Jam selesai</Text>
                <TextInput
                  style={styles.input}
                  value={jamSelesai}
                  onChangeText={(t) => setJamSelesai(maskJam(t))}
                  placeholder="10:30"
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
            </View>

            <Text style={styles.label}>Laboratorium</Text>
            {daftarLab.length === 0 ? (
              <Text style={styles.hint}>
                Belum ada laboratorium. Buat laboratorium terlebih dahulu di
                halaman Laboratorium.
              </Text>
            ) : (
              <View style={styles.chipRow}>
                {daftarLab.map((l) => {
                  const aktif = labId === l.id;
                  return (
                    <TouchableOpacity
                      key={l.id}
                      onPress={() => setLabId(l.id ?? "")}
                      style={[styles.chip, aktif && styles.chipActive]}
                    >
                      <Text
                        style={[styles.chipText, aktif && styles.chipTextActive]}
                      >
                        {l.nama}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {modeTambah ? (
              <>
                <Text style={styles.label}>Pengulangan</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    onPress={() => setUlang(false)}
                    style={[styles.chip, !ulang && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, !ulang && styles.chipTextActive]}
                    >
                      Sekali saja
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setUlang(true)}
                    style={[styles.chip, ulang && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, ulang && styles.chipTextActive]}
                    >
                      Tiap minggu
                    </Text>
                  </TouchableOpacity>
                </View>

                {ulang ? (
                  <>
                    <Text style={styles.label}>Jumlah pertemuan</Text>
                    <View style={styles.chipRow}>
                      {[8, JUMLAH_SEMESTER, 16].map((n) => (
                        <TouchableOpacity
                          key={n}
                          onPress={() => setJumlah(String(n))}
                          style={[
                            styles.chip,
                            jumlah === String(n) && styles.chipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              jumlah === String(n) && styles.chipTextActive,
                            ]}
                          >
                            {n}
                            {n === JUMLAH_SEMESTER ? " (1 semester)" : ""}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={styles.input}
                      value={jumlah}
                      onChangeText={setJumlah}
                      placeholder={`2 - ${MAKS_PERTEMUAN}`}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    {pertemuanTerakhir ? (
                      <Text style={styles.hint}>
                        Pertemuan terakhir:{" "}
                        {formatTanggalPanjang(pertemuanTerakhir)}
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={submit}
              disabled={memproses}
              style={({ pressed }) => [
                styles.submit,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.submitText}>
                {memproses
                  ? "Menyimpan..."
                  : berulang && jumlahValid
                    ? `Simpan ${jumlahPertemuan} pertemuan`
                    : "Simpan"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onBatal}
              disabled={memproses}
              style={({ pressed }) => [
                styles.cancel,
                pressed && styles.pressed,
              ]}
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
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: warna.overlay,
  },
  container: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: warna.kartu,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  title: { color: warna.teks, fontSize: 22, lineHeight: 30, fontWeight: "700" },
  label: {
    color: warna.teksIsi,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
    marginTop: 16,
  },
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
  hint: { color: warna.teksRedup, fontSize: 14, lineHeight: 22, marginTop: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: warna.garisKuat,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipActive: { backgroundColor: warna.utama, borderColor: warna.utama },
  chipText: { color: warna.teksIsi, fontWeight: "600", fontSize: 14 },
  chipTextActive: { color: warna.utamaTeks },
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