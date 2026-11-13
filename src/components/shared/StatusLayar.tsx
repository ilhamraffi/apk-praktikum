// src/components/shared/StatusLayar.tsx
// Komponen status bersama: Loading, Empty, ErrorBanner (scaffold PM).
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function Loading({ label = "Memuat data..." }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#4338CA" />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export function Empty({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {description ? <Text style={styles.text}>{description}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" style={styles.errorCard}>
      <Text style={styles.errorTitle}>Terjadi kesalahan</Text>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 24,
    gap: 10,
  },
  title: { color: "#0F172A", fontSize: 18, lineHeight: 26, fontWeight: "700" },
  text: { color: "#64748B", fontSize: 15, lineHeight: 24 },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  errorTitle: { color: "#B91C1C", fontSize: 15, lineHeight: 22, fontWeight: "700" },
});
