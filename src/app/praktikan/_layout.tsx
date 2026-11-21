// src/app/praktikan/_layout.tsx
// Navbar praktikan. Detail sesi ([sesiId]) tidak masuk ke array ITEM BilahTab,
// tetapi menggunakan alias={{ "[sesiId]": "index" }} agar tetap menyorot Beranda.
import { Tabs } from "expo-router";
import { BilahTab, type ItemTab } from "../../components/navigasi/BilahTab";

const ITEM: ItemTab[] = [
  { name: "index", label: "Beranda", ikon: "beranda" },
  { name: "riwayat", label: "Riwayat", ikon: "riwayat" },
  { name: "izin", label: "Izin", ikon: "izin" },
  { name: "profil", label: "Profil", ikon: "profil" },
];

export default function PraktikanLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <BilahTab
          {...props}
          item={ITEM}
          alias={{ "[sesiId]": "index", presensi: "index" }}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="riwayat" />
      <Tabs.Screen name="izin" />
      <Tabs.Screen name="profil" />
      <Tabs.Screen name="[sesiId]" />
      <Tabs.Screen name="presensi" />
    </Tabs>
  );
}