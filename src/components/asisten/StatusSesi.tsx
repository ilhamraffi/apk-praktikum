import { StyleSheet, Text, View } from "react-native";
import type { SessionStatus } from "../../context/DataSistem";

const tampilanStatus: Record<
  SessionStatus,
  { label: string; warna: string; latar: string }
> = {
  BELUM_DIBUKA: {
    label: "Belum dibuka",
    warna: "#92400E",
    latar: "#FEF3C7",
  },
  DIBUKA: {
    label: "Dibuka",
    warna: "#166534",
    latar: "#DCFCE7",
  },
  DITUTUP: {
    label: "Ditutup",
    warna: "#475569",
    latar: "#E2E8F0",
  },
};

// Badge khusus asisten selama StatusBadge bersama belum tersedia.
export function StatusSesi({ status }: { status: SessionStatus }) {
  const tampilan = tampilanStatus[status] ?? {
    label: "Status tidak tersedia",
    warna: "#475569",
    latar: "#E2E8F0",
  };

  return (
    <View
      accessible
      accessibilityLabel={`Status sesi: ${tampilan.label}`}
      style={[styles.badge, { backgroundColor: tampilan.latar }]}
    >
      <View style={[styles.dot, { backgroundColor: tampilan.warna }]} />
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
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { flexShrink: 1, fontSize: 12, lineHeight: 18, fontWeight: "600" },
});