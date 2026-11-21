import { StyleSheet, Text, View } from "react-native";
import type { PengajuanIzin } from "../../types";
import { informasiHasilAI } from "../../utils/hasilAI";
import { warna } from "../../theme";

export function HasilAnalisisIzin({ pengajuan }: { pengajuan: PengajuanIzin }) {
  const informasi = informasiHasilAI(pengajuan);
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{informasi.judul}</Text>
      <Text style={styles.result}>{informasi.hasil}</Text>
      <Text style={styles.description}>{informasi.penjelasan}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 6, padding: 14, borderRadius: 12, backgroundColor: warna.permukaanLembut },
  title: { color: warna.teksIsi, fontSize: 14, lineHeight: 22, fontWeight: "700" },
  result: { color: warna.teksIsi, fontSize: 15, lineHeight: 25 },
  description: { color: warna.teksRedup, fontSize: 13, lineHeight: 21 },
});