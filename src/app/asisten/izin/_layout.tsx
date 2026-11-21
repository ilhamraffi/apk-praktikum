// src/app/asisten/izin/_layout.tsx
// Daftar izin dan detail izin berada dalam satu tab "Izin" (susunan tumpukan).
import { Stack } from "expo-router";

export default function IzinAsistenLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}