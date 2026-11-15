// src/context/AuthContext.tsx
// Provider autentikasi & peran (scaffold sesuai kontrak Fase 0; Rajib akan
// mengganti implementasinya tanpa mengubah bentuk useAuth()).
//
// Kontrak: useAuth() -> { user, role, loading, signUp, signIn, signOut }
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  deleteUser
} from "@react-native-firebase/auth";
import { doc, getDoc, setDoc } from "@react-native-firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { ProfilUser, Role } from "../types";

interface SignUpInput {
  nama: string;
  nim: string;
  email: string;
  password: string;
  
}

interface AuthContextValue {
  user: ProfilUser | null;
  role: Role | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profil, setProfil] = useState<ProfilUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        setProfil(null);
        setLoading(false);
        return;
      }

      try {
  const snap = await getDoc(doc(db, "users", authUser.uid));
  if (snap.exists()) {
    setProfil({ uid: authUser.uid, ...snap.data() } as ProfilUser);
  } else {
    // Beri peringatan di terminal jika profil tidak ditemukan di database
    console.error("PROFIL TIDAK DITEMUKAN untuk uid:", authUser.uid);
    setProfil(null);
  }
} catch (error) {
  // Beri peringatan jika akses membaca ditolak (masalah Rules)
  console.error("GAGAL BACA PROFIL:", error);
  setProfil(null);
} finally {
  setLoading(false);
}
    });

    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: profil,
      role: profil?.role ?? null,
      loading,
      signUp: async (input) => {
  const { nama, nim, email, password } = input;
  
  // 1. Buat akun di Authentication Firebase
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  
  const profilBaru: ProfilUser = {
    uid: credential.user.uid,
    nama: nama.trim(),
    nim: nim.trim(),
    email: email.trim(),
    role: "PRAKTIKAN",
  };

  try {
    // 2. Coba simpan profil ke Firestore
    await setDoc(doc(db, "users", credential.user.uid), profilBaru);
    
    // Set langsung agar tidak menunggu listener
    setProfil(profilBaru);
  } catch (error) {
    // 3. JIKA GAGAL simpan ke Firestore, hapus akun Auth yang terlanjur dibuat!
    if (credential.user) {
      await deleteUser(credential.user);
    }
    // Lempar error ke UI agar pesan kegagalan muncul di layar Register
    throw error;
  }
},
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      signOut: async () => {
        await firebaseSignOut(auth);
      },
    }),
    [profil, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth wajib dipakai di dalam AuthProvider");
  return ctx;
}
