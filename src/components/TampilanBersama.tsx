// src/components/TampilanBersama.tsx
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

export function ActiveUserBar() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  if (!user) return null;

  return (
    <>
      {/* Bar Identitas di Atas */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.roleTag}>
          PERAN AKTIF:{" "}
          {user.role === "ASISTEN" ? " ASISTEN" : " PRAKTIKAN"}
        </Text>
        <Text style={styles.userName} numberOfLines={1}>
          {user.nama} ({user.nim})
        </Text>
      </View>

      {/* Tombol Keluar Melayang di Tengah Bawah */}
            <View
        pointerEvents="box-none"
        style={[styles.bottomNavContainer, { bottom: insets.bottom + 20 }]}
      >
        <TouchableOpacity style={styles.homeBtn} onPress={signOut}>
          <Text style={styles.homeText}>Keluar</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: "#1E1B4B",
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: "center",
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
   bottomNavContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
    elevation: 100,
  },
  homeBtn: {
    backgroundColor: "#1E1B4B",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  homeText: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold" },
});