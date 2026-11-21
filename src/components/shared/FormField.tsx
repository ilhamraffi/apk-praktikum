// src/components/shared/FormField.tsx
// Kolom form dengan label, tanda bintang merah untuk kolom wajib,
// serta border dan pesan merah saat `error` terisi.
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { warna } from "../../theme";

type FormFieldProps = TextInputProps & {
  label: string;
  wajib?: boolean;
  error?: string;
};

export function FormField({
  label,
  wajib = false,
  error,
  style,
  secureTextEntry,
  ...props
}: FormFieldProps) {
  const [lihat, setLihat] = useState(false);
  const rahasia = !!secureTextEntry;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {wajib ? <Text style={styles.bintang}> *</Text> : null}
      </Text>
      <View style={[styles.inputWrap, !!error && styles.inputError]}>
        <TextInput
          {...props}
          secureTextEntry={rahasia && !lihat}
          placeholderTextColor={warna.placeholder}
          accessibilityLabel={wajib ? `${label}, wajib diisi` : label}
          style={[styles.input, style]}
        />
        {rahasia ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            onPress={() => setLihat((v) => !v)}
            hitSlop={8}
          >
            <Text style={styles.toggle}>{lihat ? "Sembunyikan" : "Tampilkan"}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.pesan}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14 },
  label: { color: warna.teksIsi, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  bintang: { color: warna.error, fontWeight: "700" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: warna.inputLatar,
    borderWidth: 1,
    borderColor: warna.garis,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputError: { borderColor: warna.error, backgroundColor: warna.errorLatar },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: warna.teks },
  toggle: { color: warna.tautan, fontSize: 13, fontWeight: "600", marginLeft: 8 },
  pesan: { color: warna.error, fontSize: 12, marginTop: 6 },
});