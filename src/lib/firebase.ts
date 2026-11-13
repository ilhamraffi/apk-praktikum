// src/lib/firebase.ts
// Instansi Firebase bersama (scaffold PM). Pada Android, konfigurasi dibaca
// otomatis dari google-services.json lewat native SDK, jadi tidak perlu
// initializeApp manual.
import { getAuth } from "@react-native-firebase/auth";
import { getFirestore } from "@react-native-firebase/firestore";

export const auth = getAuth();
export const db = getFirestore();
