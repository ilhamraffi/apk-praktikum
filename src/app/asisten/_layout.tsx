// src/app/asisten/_layout.tsx
// Navbar asisten. Detail sesi ([sesiId]) tidak masuk ke array ITEM BilahTab,
// tetapi menggunakan alias={{ "[sesiId]": "index" }} agar tetap menyorot Beranda.
import { Tabs } from "expo-router";
import { BilahTab, type ItemTab } from "../../components/navigasi/BilahTab";

const ITEM: ItemTab[] = [
  { name: "index", label: "Beranda", ikon: "beranda" },
  { name: "kelas", label: "Kelas", ikon: "kelas" },
  { name: "izin", label: "Izin", ikon: "izin" },
  { name: "profil", label: "Profil", ikon: "profil" },
];

export default function AsistenLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <BilahTab {...props} item={ITEM} alias={{ "[sesiId]": "index" }} />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="kelas" />
      <Tabs.Screen name="izin" />
      <Tabs.Screen name="profil" />
      <Tabs.Screen name="[sesiId]" />
    </Tabs>
  );
}
