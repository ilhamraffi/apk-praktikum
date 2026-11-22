// src/context/AuthContext.tsx
// Provider autentikasi & peran (scaffold sesuai kontrak Fase 0; Rajib akan
// mengganti implementasinya tanpa mengubah bentuk useAuth()).
//
// Kontrak: useAuth() -> { user, role, loading, signUp, signIn, signOut }
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { pesanError } from "../lib/errors";
import {
  daftarkanNotifikasi,
  hapusNotifikasi,
  pantauRefreshTokenNotifikasi,
} from "../lib/notifikasi";
import type { ProfilUser, Role } from "../types";

interface SignUpInput {
  nama: string;
  nim: string;
  email: string;
  password: string;
  role?: Role;
}

export type StatusNotifikasiAkun =
  | "idle"
  | "memuat"
  | "aktif"
  | "izin_ditolak"
  | "gagal";

interface AuthContextValue {
  user: ProfilUser | null;
  role: Role | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  pilihPeran: (peranBaru: Role) => void;
  statusNotifikasi: StatusNotifikasiAkun;
  errorNotifikasi: string | null;
  aktifkanUlangNotifikasi: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profil, setProfil] = useState<ProfilUser | null>(null);
  const [peranAktif, setPeranAktif] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusNotifikasi, setStatusNotifikasi] = useState<StatusNotifikasiAkun>("idle");
  const [errorNotifikasi, setErrorNotifikasi] = useState<string | null>(null);
  const [percobaanNotif, setPercobaanNotif] = useState(0);
  const tokenNotifikasiRef = useRef<string | null>(null);
  const uidProfil = profil?.uid;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        tokenNotifikasiRef.current = null;
        setProfil(null);
        setPeranAktif(null);
        setStatusNotifikasi("idle");
        setErrorNotifikasi(null);
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", authUser.uid));
        if (snap.exists()) {
          const dataProfil = { ...snap.data(), uid: authUser.uid } as ProfilUser;
          setProfil(dataProfil);
          setPeranAktif((prev) => prev ?? dataProfil.role ?? null);
        } else {
          // Beri peringatan di terminal jika profil tidak ditemukan di database
          console.error("PROFIL TIDAK DITEMUKAN untuk uid:", authUser.uid);
          setProfil(null);
          setPeranAktif(null);
        }
      } catch (error) {
        // Beri peringatan jika akses membaca ditolak (masalah Rules)
        console.error("GAGAL BACA PROFIL:", error);
        setProfil(null);
        setPeranAktif(null);
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!uidProfil) return;
    let aktif = true;

    const daftar = async () => {
      try {
        const token = await daftarkanNotifikasi(uidProfil);
        if (!aktif) return;
        if (token) {
          tokenNotifikasiRef.current = token;
          setStatusNotifikasi("aktif");
          setErrorNotifikasi(null);
        } else {
          tokenNotifikasiRef.current = null;
          setStatusNotifikasi("izin_ditolak");
          setErrorNotifikasi(null);
        }
      } catch (err) {
        if (!aktif) return;
        tokenNotifikasiRef.current = null;
        setStatusNotifikasi("gagal");
        setErrorNotifikasi(pesanError(err));
      }
    };

    void daftar();
    const berhentiRefresh = pantauRefreshTokenNotifikasi(uidProfil, (tokenBaru) => {
      if (!aktif) return;
      tokenNotifikasiRef.current = tokenBaru;
      setStatusNotifikasi("aktif");
      setErrorNotifikasi(null);
    });
    return () => {
      aktif = false;
      berhentiRefresh();
    };
  }, [uidProfil, percobaanNotif]);

  const aktifkanUlangNotifikasi = useCallback(async () => {
    if (!uidProfil) return;
    setStatusNotifikasi("memuat");
    setErrorNotifikasi(null);
    setPercobaanNotif((n) => n + 1);
  }, [uidProfil]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: profil,
      role: peranAktif ?? profil?.role ?? null,
      loading,
      pilihPeran: (peranBaru: Role) => {
        setPeranAktif(peranBaru);
      },
      signUp: async (input) => {
        const { nama, nim, email, password } = input;

        // 1. Buat akun di Authentication Firebase
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );

        const peranTerpilih: Role = input.role === "ASISTEN" ? "ASISTEN" : "PRAKTIKAN";
        const profilBaru: ProfilUser = {
          uid: credential.user.uid,
          nama: nama.trim(),
          nim: nim.trim(),
          email: email.trim(),
          role: peranTerpilih,
        };

        try {
          // 2. Coba simpan profil ke Firestore
          await setDoc(doc(db, "users", credential.user.uid), profilBaru);

          // Set langsung agar tidak menunggu listener
          setProfil(profilBaru);
          setPeranAktif(peranTerpilih);
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
        const credential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        const snap = await getDoc(doc(db, "users", credential.user.uid));
        if (!snap.exists()) {
          throw new Error("Profil pengguna belum ditemukan.");
        }
        setProfil({ ...snap.data(), uid: credential.user.uid } as ProfilUser);
      },
      signOut: async () => {
        const uidSekarang = auth.currentUser?.uid ?? profil?.uid;
        const tokenSekarang = tokenNotifikasiRef.current;
        if (uidSekarang && tokenSekarang) {
          try {
            await hapusNotifikasi(uidSekarang, tokenSekarang);
          } catch {
            // Jangan gagalkan proses logout bila token sudah terhapus atau offline
          }
        }
        tokenNotifikasiRef.current = null;
        await firebaseSignOut(auth);
      },
      statusNotifikasi,
      errorNotifikasi,
      aktifkanUlangNotifikasi,
    }),
    [profil, peranAktif, loading, statusNotifikasi, errorNotifikasi, aktifkanUlangNotifikasi],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth wajib dipakai di dalam AuthProvider");
  return ctx;
}
