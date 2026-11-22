import {
  AuthorizationStatus,
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
} from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "@react-native-firebase/firestore";
import { auth, db } from "./firebase";

const messaging = getMessaging();

export type StatusIzinNotifikasi =
  | "diizinkan"
  | "ditolak"
  | "gagal";

export interface HasilDaftarNotifikasi {
  token: string | null;
  status: StatusIzinNotifikasi;
  pesanError?: string;
}

async function mintaIzinNotifikasiPerangkat(): Promise<boolean> {
  if (Platform.OS === "android" && typeof Platform.Version === "number" && Platform.Version >= 33) {
    try {
      const hasilAndroid = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (hasilAndroid !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }
    } catch {
      // Lanjutkan ke requestPermission bawaan Firebase Messaging bila PermissionsAndroid gagal
    }
  }
  const izin = await requestPermission(messaging);
  return (
    izin === AuthorizationStatus.AUTHORIZED ||
    izin === AuthorizationStatus.PROVISIONAL
  );
}

export async function simpanTokenNotifikasi(uid: string, token: string): Promise<void> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Sesi akun tidak valid untuk menyimpan token notifikasi.");
  }
  if (!token || token.includes("/")) {
    throw new Error("Token notifikasi tidak valid.");
  }
  await setDoc(doc(db, "users", uid, "fcmTokens", token), {
    platform: Platform.OS === "ios" ? "ios" : "android",
    diperbaruiPada: serverTimestamp(),
  });
}

export async function daftarkanNotifikasi(uid: string): Promise<string | null> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Sesi akun tidak valid untuk mendaftarkan notifikasi.");
  }
  const diizinkan = await mintaIzinNotifikasiPerangkat();
  if (!diizinkan) {
    return null;
  }
  const token = await getToken(messaging);
  if (!token || token.includes("/")) {
    throw new Error("Token notifikasi tidak valid.");
  }
  await simpanTokenNotifikasi(uid, token);
  return token;
}

export function pantauRefreshTokenNotifikasi(
  uid: string,
  onTokenBaru?: (token: string) => void,
): () => void {
  if (!uid) return () => {};
  return onTokenRefresh(messaging, (tokenBaru) => {
    if (!tokenBaru || tokenBaru.includes("/") || auth.currentUser?.uid !== uid) return;
    void simpanTokenNotifikasi(uid, tokenBaru)
      .then(() => onTokenBaru?.(tokenBaru))
      .catch(() => {});
  });
}

export async function ambilNotifikasiAwal() {
  return getInitialNotification(messaging);
}

export async function hapusNotifikasi(uid: string, token: string): Promise<void> {
  if (!uid || auth.currentUser?.uid !== uid || !token || token.includes("/")) {
    throw new Error("Identitas token notifikasi tidak valid.");
  }
  await deleteDoc(doc(db, "users", uid, "fcmTokens", token));
  await deleteToken(messaging);
}

export function dengarkanNotifikasi(
  saatTerima: Parameters<typeof onMessage>[1],
  saatDibuka: Parameters<typeof onNotificationOpenedApp>[1],
): () => void {
  const berhentiTerima = onMessage(messaging, saatTerima);
  const berhentiBuka = onNotificationOpenedApp(messaging, saatDibuka);
  return () => {
    berhentiTerima();
    berhentiBuka();
  };
}
