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
    <View style={[styles.luar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
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
              <IkonTab nama={tab.ikon} warna={aktif ? warna.utamaTeks : warna.utama} />
              {aktif ? <Text style={styles.label}>{tab.label}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  luar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: warna.latar,
  },
  pil: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    borderRadius: radius.pil,
    borderWidth: 1,
    borderColor: warna.garis,
    backgroundColor: warna.kartu,
    shadowColor: warna.utama,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tab: {
    height: 48,
    borderRadius: radius.pil,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tabBiasa: { width: 48, backgroundColor: warna.permukaanLembut },
  tabAktif: { paddingHorizontal: 18, backgroundColor: warna.utama },
  ditekan: { opacity: 0.85 },
  label: { color: warna.utamaTeks, fontSize: 14, fontWeight: "700" },
});