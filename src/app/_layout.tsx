import { Stack } from "expo-router";
import { AttendanceProvider } from "../context/DataSistem";

export default function RootLayout() {
  return (
    <AttendanceProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </AttendanceProvider>
  );
}
