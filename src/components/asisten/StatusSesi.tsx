import { StyleSheet, Text, View } from "react-native";
import type { SessionStatus } from "../../types";
import { radius, warna } from "../../theme";

const tampilanStatus: Record<
  SessionStatus,
  { label: string; warna: string; latar: string }
> = {
  BELUM_DIBUKA: {
    label: "Belum dibuka",
    warna: warna.teks,
    latar: warna.aksen,
  },
  DIBUKA: {
    label: "Dibuka",
    warna: warna.suksesTeks,
    latar: warna.suksesLatar,
  },
  DITUTUP: {
    label: "Selesai",
    warna: warna.teksIsi,
    latar: warna.permukaan,
  },
};

// Badge khusus asisten selama StatusBadge bersama belum tersedia.
export function StatusSesi({ status }: { status: SessionStatus }) {
  const tampilan = tampilanStatus[status] ?? {
    label: "Status tidak tersedia",
    warna: warna.teksIsi,
    latar: warna.garis,
  };

  return (
    <View
      accessible
      accessibilityLabel={`Status sesi: ${tampilan.label}`}
      style={[styles.badge, { backgroundColor: tampilan.latar }]}
    >
      <Text style={[styles.text, { color: tampilan.warna }]}>
        {tampilan.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pil,
  },
  text: { flexShrink: 1, fontSize: 12, lineHeight: 18, fontWeight: "700" },
});