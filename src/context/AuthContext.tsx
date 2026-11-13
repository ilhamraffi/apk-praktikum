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
} from "@react-native-firebase/auth";
import { doc, getDoc, setDoc } from "@react-native-firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { ProfilUser, Role } from "../types";

interface SignUpInput {
  nama: string;
  nim: string;
  email: string;
  password: string;
  role?: Role;
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
          // Profil belum ada (mis. akun dibuat manual di konsol Firebase).
          setProfil(null);
        }
      } catch {
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
        const { nama, nim, email, password, role = "PRAKTIKAN" } = input;
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
          role,
        };
        await setDoc(doc(db, "users", credential.user.uid), profilBaru);
        // Set langsung agar tidak menunggu listener onAuthStateChanged.
        setProfil(profilBaru);
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
