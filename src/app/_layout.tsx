import { Stack, usePathname, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ambilNotifikasiAwal, dengarkanNotifikasi } from "../lib/notifikasi";
import { radius, warna } from "../theme";
import { ambilRuteNotifikasi } from "../utils/aktivitasLab";

interface BannerNotifikasi {
  judul: string;
  isi: string;
  rute: string | null;
}

function RouteGuard() {
  const { user, role, loading, pilihPeran } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState<BannerNotifikasi | null>(null);
  const ruteNotifTertundaRef = useRef<string | null>(null);
  const initialHandledRef = useRef(false);

  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isRoleRoute = pathname === "/pilih-peran";
  const isSharedRoute = pathname.startsWith("/peta");

  const bukaRuteNotifikasi = useCallback(
    (target: string) => {
      if (target.startsWith("/praktikan") && role !== "PRAKTIKAN") {
        pilihPeran("PRAKTIKAN");
      } else if (target.startsWith("/asisten") && role !== "ASISTEN" && user?.role === "ASISTEN") {
        pilihPeran("ASISTEN");
      }
      router.push(target as Href);
    },
    [pilihPeran, role, router, user?.role],
  );

  useEffect(() => {
    if (loading) return;
    if (!user && !isAuthRoute) {
      router.replace("/login");
      return;
    }
    if (user && role && isAuthRoute) {
      const target = ruteNotifTertundaRef.current;
      if (target) {
        ruteNotifTertundaRef.current = null;
        bukaRuteNotifikasi(target);
        return;
      }
      router.replace("/pilih-peran");
      return;
    }
    if (user && role && ruteNotifTertundaRef.current) {
      const target = ruteNotifTertundaRef.current;
      ruteNotifTertundaRef.current = null;
      bukaRuteNotifikasi(target);
      return;
    }
    if (isRoleRoute || isSharedRoute) return;
    if (user && role === "ASISTEN" && pathname.startsWith("/praktikan")) {
      router.replace("/asisten");
      return;
    }
    if (user && role === "PRAKTIKAN" && pathname.startsWith("/asisten")) {
      router.replace("/praktikan");
    }
  }, [
    bukaRuteNotifikasi,
    isAuthRoute,
    isRoleRoute,
    isSharedRoute,
    loading,
    pathname,
    role,
    router,
    user,
  ]);

  // SRS-14: Tangani notifikasi masuk (foreground), ketuk dari background, dan ketuk dari keadaan tertutup (quit).
  useEffect(() => {
    if (!user?.uid) return;

    const jadwalkanNavigasiNotifikasi = (rute: string | null) => {
      if (!rute) return;
      if (!loading && role && !isAuthRoute) {
        bukaRuteNotifikasi(rute);
      } else {
        ruteNotifTertundaRef.current = rute;
      }
    };

    const berhenti = dengarkanNotifikasi(
      (pesan) => {
        const judul = pesan.notification?.title?.trim() || "Pemberitahuan HadirLab";
        const isi = pesan.notification?.body?.trim() || "Ada pembaruan kegiatan praktikum.";
        const rute = ambilRuteNotifikasi(pesan);
        setBanner({ judul, isi, rute });
      },
      (pesan) => {
        const rute = ambilRuteNotifikasi(pesan);
        jadwalkanNavigasiNotifikasi(rute);
      },
    );

    if (!initialHandledRef.current) {
      initialHandledRef.current = true;
      void ambilNotifikasiAwal()
        .then((pesanAwal) => {
          const rute = ambilRuteNotifikasi(pesanAwal);
          if (rute) jadwalkanNavigasiNotifikasi(rute);
        })
        .catch(() => {});
    }

    return berhenti;
  }, [bukaRuteNotifikasi, isAuthRoute, loading, role, user?.uid]);

  if (loading || (!user && !isAuthRoute) || (user && role && isAuthRoute)) {
    return null;
  }

  return (
    <View style={styles.root}>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: warna.latar } }}
      />
      {banner ? (
        <View
          accessibilityRole="alert"
          style={[styles.bannerWrap, { top: Math.max(insets.top, 12) + 8 }]}
        >
          <Pressable
            style={styles.bannerCard}
            onPress={() => {
              const target = banner.rute;
              setBanner(null);
              if (target) bukaRuteNotifikasi(target);
            }}
          >
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerTitle}>{banner.judul}</Text>
              <Text style={styles.bannerBody} numberOfLines={2}>
                {banner.isi}
              </Text>
              {banner.rute ? (
                <Text style={styles.bannerHint}>Ketuk untuk membuka</Text>
              ) : null}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Tutup pemberitahuan"
              onPress={() => setBanner(null)}
              style={styles.bannerClose}
            >
              <Text style={styles.bannerCloseText}>✕</Text>
            </TouchableOpacity>
          </Pressable>
        </View>
      ) : null}
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  bannerWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
    alignItems: "center",
  },
  bannerCard: {
    width: "100%",
    maxWidth: 600,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: warna.utama,
    borderRadius: radius.kecil,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: warna.utama,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  bannerTextWrap: { flex: 1, gap: 2 },
  bannerTitle: { color: warna.utamaTeks, fontSize: 14, fontWeight: "800" },
  bannerBody: { color: warna.permukaan, fontSize: 13, lineHeight: 18 },
  bannerHint: { color: warna.aksen, fontSize: 11, fontWeight: "700", marginTop: 2 },
  bannerClose: {
    width: 32,
    height: 32,
    borderRadius: radius.pil,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerCloseText: { color: warna.utamaTeks, fontSize: 14, fontWeight: "700" },
});