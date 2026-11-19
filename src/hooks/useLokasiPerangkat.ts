import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import type { Koordinat } from "../types";

export type StatusLokasi =
  | "memuat"
  | "siap"
  | "izin_ditolak"
  | "layanan_mati"
  | "tidak_tersedia";

interface DataLokasi {
  koordinat: Koordinat | null;
  akurasiMeter: number | null;
  status: StatusLokasi;
}

const kosong = (): DataLokasi => ({
  koordinat: null,
  akurasiMeter: null,
  status: "memuat",
});

function ubahKoordinat(
  coords: Location.LocationObjectCoords,
): Koordinat {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    akurasiMeter: coords.accuracy,
  };
}

export function useLokasiPerangkat(aktif = true) {
  const [data, setData] = useState<DataLokasi>(() => kosong());
  const [percobaan, setPercobaan] = useState(0);
  const berhentiRef = useRef<(() => void) | null>(null);

  const muatUlang = useCallback(() => {
    setPercobaan((nilai) => nilai + 1);
  }, []);

  useEffect(() => {
    berhentiRef.current?.();
    berhentiRef.current = null;
    if (!aktif) {
      return;
    }

    let masihAktif = true;
    const mulai = async () => {
      setData({ ...kosong(), status: "memuat" });
      const layananAktif = await Location.hasServicesEnabledAsync();
      if (!masihAktif) return;
      if (!layananAktif) {
        setData({ ...kosong(), status: "layanan_mati" });
        return;
      }

      const izin = await Location.requestForegroundPermissionsAsync();
      if (!masihAktif) return;
      if (izin.status !== Location.PermissionStatus.GRANTED) {
        setData({ ...kosong(), status: "izin_ditolak" });
        return;
      }

      try {
        const posisi = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!masihAktif) return;
        const koordinat = ubahKoordinat(posisi.coords);
        setData({
          koordinat,
          akurasiMeter: koordinat.akurasiMeter ?? null,
          status: "siap",
        });
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 5,
            timeInterval: 5_000,
          },
          (perubahan) => {
            if (!masihAktif) return;
            const terbaru = ubahKoordinat(perubahan.coords);
            setData({
              koordinat: terbaru,
              akurasiMeter: terbaru.akurasiMeter ?? null,
              status: "siap",
            });
          },
        );
        if (masihAktif) {
          berhentiRef.current = () => subscription.remove();
        } else {
          subscription.remove();
        }
      } catch {
        if (masihAktif) setData({ ...kosong(), status: "tidak_tersedia" });
      }
    };

    void mulai();
    return () => {
      masihAktif = false;
      berhentiRef.current?.();
      berhentiRef.current = null;
    };
  }, [aktif, percobaan]);

  return { ...(aktif ? data : kosong()), mintaIzin: muatUlang, muatUlang };
}
