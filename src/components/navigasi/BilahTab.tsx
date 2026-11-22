// src/components/navigasi/BilahTab.tsx
// Navbar bawah berbentuk pil. Tab aktif melebar dan menampilkan label; tab lain hanya ikon.
// Dipakai sebagai `tabBar` pada <Tabs> di layout asisten dan praktikan.
import { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, warna } from "../../theme";
import { IkonTab, type NamaIkon } from "./IkonTab";

export type ItemTab = { name: string; label: string; ikon: NamaIkon };

type RouteTab = { key: string; name: string; params?: object };

type BilahTabProps = {
  state: { index: number; routes: RouteTab[] };
  emitter?: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
  };
  navigateToTab?: (routeKey: string) => void;
  navigation?: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
  /** Tab yang tampil di bar, berurutan. `name` = nama route di <Tabs>. */
  item: ItemTab[];
  /** Route tersembunyi -> tab yang disorot (mis. detail sesi menyorot Beranda). */
  alias?: Record<string, string>;
};

export function BilahTab({
  state,
  emitter,
  navigateToTab,
  navigation,
  item,
  alias = {},
}: BilahTabProps) {
  const insets = useSafeAreaInsets();
  const [keyboardTampil, setKeyboardTampil] = useState(false);

  // Sembunyikan navbar saat keyboard terbuka agar tidak menutupi kolom isian.
  useEffect(() => {
    const tampil = Keyboard.addListener("keyboardDidShow", () => setKeyboardTampil(true));
    const sembunyi = Keyboard.addListener("keyboardDidHide", () => setKeyboardTampil(false));
    return () => {
      tampil.remove();
      sembunyi.remove();
    };
  }, []);

  if (keyboardTampil) return null;

  const namaAktif = state.routes[state.index]?.name ?? "";
  const disorot = alias[namaAktif] ?? namaAktif;

  const tekan = (nama: string) => {
    const route = state.routes.find((r: RouteTab) => r.name === nama);
    if (!route) return;
    const pengirim = emitter ?? navigation;
    const event = pengirim?.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (event?.defaultPrevented) return;
    if (navigateToTab) {
      navigateToTab(route.key);
    } else {
      navigation?.navigate(route.name, route.params);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.luar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}
    >
      <View accessibilityRole="tablist" style={styles.pil}>
        {item.map((tab: ItemTab) => {
          const aktif = disorot === tab.name;
          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: aktif }}
              onPress={() => tekan(tab.name)}
              style={({ pressed }) => [
                styles.tab,
                aktif ? styles.tabAktif : styles.tabBiasa,
                pressed && styles.ditekan,
              ]}
            >
              <IkonTab
                nama={tab.ikon}
                warna={aktif ? warna.utamaTeks : warna.utama}
                ukuran={22}
              />
              {aktif ? (
                <Text numberOfLines={1} style={styles.label}>
                  {tab.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  luar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: "transparent",
  },
  pil: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 6,
    borderRadius: radius.pil,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.88)",
    backgroundColor: "rgba(254, 250, 246, 0.82)",
    shadowColor: warna.utama,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tab: {
    height: 44,
    borderRadius: radius.pil,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabBiasa: {
    width: 44,
    backgroundColor: "rgba(234, 219, 200, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.65)",
  },
  tabAktif: {
    flex: 1,
    maxWidth: 138,
    paddingHorizontal: 14,
    backgroundColor: warna.utama,
  },
  ditekan: { opacity: 0.85 },
  label: { color: warna.utamaTeks, fontSize: 13, fontWeight: "700" },
});