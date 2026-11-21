// src/app/praktikan/presensi/_layout.tsx
// Alur presensi berbasis lokasi (SRS-09, SRS-10) berada dalam tumpukan sendiri.
import { Stack } from "expo-router";

export default function PresensiPraktikanLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
