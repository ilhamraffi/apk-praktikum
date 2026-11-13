// src/hooks/usePeserta.ts
// Daftar pengguna (praktikan) — milik Ilham untuk pengelolaan peserta kelas.
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "@react-native-firebase/firestore";
import { db } from "../lib/firebase";
import { pesanError } from "../lib/errors";
import type { ProfilUser } from "../types";

/** Daftar semua praktikan (users dengan role PRAKTIKAN), real-time. */
export function useDaftarPraktikan() {
  const [pengguna, setPengguna] = useState<ProfilUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "PRAKTIKAN"),
      orderBy("nim", "asc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPengguna(
          snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as ProfilUser),
        );
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(pesanError(err));
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  return { pengguna, loading, error };
}
