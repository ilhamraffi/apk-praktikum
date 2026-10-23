// src/components/SharedUI.tsx
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SessionStatus, useAttendance } from "../context/DataSistem";

export function StatusBadge({ status }: { status: SessionStatus }) {
  // ... (biarkan kode StatusBadge tetap seperti aslinya)
}

export function ActiveUserBar() {
  const { currentUser, keluarPeran } = useAttendance();

  if (!currentUser) return null;

  return (
    <>
      {/* Bar Identitas di Atas */}
      <View style={styles.topBar}>
        <Text style={styles.roleTag}>
          PERAN AKTIF:{" "}
          {currentUser.role === "ASISTEN" ? " ASISTEN" : " PRAKTIKAN"}
        </Text>
        <Text style={styles.userName} numberOfLines={1}>
          {currentUser.nama} ({currentUser.nim})
        </Text>
      </View>

      {/* Tombol Home Melayang di Tengah Bawah */}
      <View style={styles.bottomNavContainer}>
        <TouchableOpacity style={styles.homeBtn} onPress={keluarPeran}>
          <Text style={styles.homeText}>Home</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "bold" },

  topBar: {
    backgroundColor: "#1E1B4B",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center", // Pusatkan teks di bar atas
  },
  roleTag: {
    color: "#f3f2f8",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 2,
  },

  // Styling Tombol Bawah
  bottomNavContainer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center", // Memastikan posisinya tepat di tengah horizontal
  },
  homeBtn: {
    backgroundColor: "#1E1B4B", // Warna biru selaras dengan tema
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // Bayangan untuk Android
  },
  homeIcon: { fontSize: 18, marginRight: 8 },
  homeText: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold" },
});
