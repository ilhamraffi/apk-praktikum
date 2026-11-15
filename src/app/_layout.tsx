import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { View } from "react-native";
import { ActiveUserBar } from "../components/TampilanBersama";

function RouteGuard() {
  const { user, role, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    if (loading) return;
    if (!user && !isAuthRoute) {
      router.replace("./login");
      return;
    }
    if (user && role && isAuthRoute) {
      router.replace(role === "ASISTEN" ? "/asisten" : "/praktikan");
      return;
    }
    if (user && role === "ASISTEN" && pathname.startsWith("/praktikan")) {
      router.replace("/asisten");
      return;
    }
    if (user && role === "PRAKTIKAN" && pathname.startsWith("/asisten")) {
      router.replace("/praktikan");
    }
  }, [isAuthRoute, loading, pathname, role, router, user]);

  if (loading || (!user && !isAuthRoute) || (user && role && isAuthRoute)) {
    return null;
  }

    return (
    <View style={{ flex: 1 }}>
      <ActiveUserBar />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard />
    </AuthProvider>
  );
}
