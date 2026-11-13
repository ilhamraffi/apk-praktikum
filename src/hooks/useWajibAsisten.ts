// src/hooks/useWajibAsisten.ts
// Penjaga rute sisi asisten (defensif). Layar asisten hanya bisa diakses
// oleh pengguna berperan ASISTEN.
import { useAuth } from "../context/AuthContext";

export function useWajibAsisten() {
  const { user, role, loading } = useAuth();
  return {
    loading,
    boleh: Boolean(!loading && user && role === "ASISTEN"),
    user,
  };
}
