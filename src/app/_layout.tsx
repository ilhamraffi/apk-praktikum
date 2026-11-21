import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { warna } from "../theme";

function RouteGuard() {
  const { user, role, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isRoleRoute = pathname === "/pilih-peran";

  useEffect(() => {
    if (loading) return;
    if (!user && !isAuthRoute) {
      router.replace("/login");
      return;
    }
    if (user && role && isAuthRoute) {
      router.replace("/pilih-peran");
      return;
    }
    if (isRoleRoute) return;
    if (user && role === "ASISTEN" && pathname.startsWith("/praktikan")) {
      router.replace("/asisten");
      return;
    }
    if (user && role === "PRAKTIKAN" && pathname.startsWith("/asisten")) {
      router.replace("/praktikan");
    }
  }, [isAuthRoute, isRoleRoute, loading, pathname, role, router, user]);

  if (loading || (!user && !isAuthRoute) || (user && role && isAuthRoute)) {
    return null;
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: warna.latar } }}
    />
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard />
    </AuthProvider>
  );
}