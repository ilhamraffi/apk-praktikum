import {
  AuthorizationStatus,
  deleteToken,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  requestPermission,
} from "@react-native-firebase/messaging";
import { Platform } from "react-native";
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "@react-native-firebase/firestore";
import { auth, db } from "./firebase";

const messaging = getMessaging();

export async function daftarkanNotifikasi(uid: string): Promise<string | null> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Sesi akun tidak valid untuk mendaftarkan notifikasi.");
  }
  const izin = await requestPermission(messaging);
  if (
    izin !== AuthorizationStatus.AUTHORIZED &&
    izin !== AuthorizationStatus.PROVISIONAL
  ) {
    return null;
  }
  const token = await getToken(messaging);
  if (!token || token.includes("/")) {
    throw new Error("Token notifikasi tidak valid.");
  }
  await setDoc(doc(db, "users", uid, "fcmTokens", token), {
    platform: Platform.OS,
    diperbaruiPada: serverTimestamp(),
  });
  return token;
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
