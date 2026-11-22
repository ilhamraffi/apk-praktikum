// src/app/peta/index.tsx
// SRS-12 (Peta Laboratorium Interaktif), SRS-13 (Aktivitas Laboratorium Real-Time),
// dan SRS-15 (Penanganan Izin & Kondisi Perangkat).
import { Link, useIsFocused, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusSesi } from "../../components/asisten/StatusSesi";
import {
  PeringatanLokasiPeta,
  PeringatanNotifikasi,
} from "../../components/shared/PeringatanPerangkat";
import { Empty, ErrorBanner, Loading } from "../../components/shared/StatusLayar";
import { useAuth } from "../../context/AuthContext";
import { useJadwalPraktikan } from "../../hooks/useJadwalPraktikan";
import { useDaftarKelas } from "../../hooks/useKelas";
import { useDaftarLab } from "../../hooks/useLab";
import { useLokasiPerangkat } from "../../hooks/useLokasiPerangkat";
import { useDaftarSesi } from "../../hooks/useSesi";
import { hitungJarakMeter } from "../../lib/geo";
import { radius, warna } from "../../theme";
import type { Kelas, Koordinat, Lab, Sesi } from "../../types";
import {
  formatRingkasanSesiLab,
  hitungTileOsmKanvas,
  proyeksikanTitikKeKanvas,
  ringkasAktivitasLab,
  type SesiDenganKelas,
} from "../../utils/aktivitasLab";
import {
  BATAS_TUNGGU_LOKASI_MS,
  formatJarakMeter,
} from "../../utils/presensiPraktikan";

const LEVEL_ZOOM_METER = [120, 250, 500, 1200, 3000] as const;

function koordinatLabValid(lab: Lab): boolean {
  return (
    typeof lab.latitude === "number" &&
    Number.isFinite(lab.latitude) &&
    lab.latitude >= -90 &&
    lab.latitude <= 90 &&
    typeof lab.longitude === "number" &&
    Number.isFinite(lab.longitude) &&
    lab.longitude >= -180 &&
    lab.longitude <= 180
  );
}

export default function PetaLaboratoriumScreen() {
  const router = useRouter();
  const halamanAktif = useIsFocused();
  const {
    user,
    role,
    loading: loadingAuth,
    statusNotifikasi,
    errorNotifikasi,
    aktifkanUlangNotifikasi,
  } = useAuth();
  const {
    lab: daftarLab,
    loading: loadingLab,
    error: errorLab,
    dariCache: labDariCache,
  } = useDaftarLab();

  // Lokasi perangkat hanya dipantau selama halaman Maps aktif (SRS-12 & §5 README).
  const lokasi = useLokasiPerangkat(Boolean(!loadingAuth && user && halamanAktif));
  const [percobaanLokasi, setPercobaanLokasi] = useState(0);
  const [timeoutPercobaan, setTimeoutPercobaan] = useState<number | null>(null);
  const [labTerpilihId, setLabTerpilihId] = useState<string | null>(null);
  const [fokusMode, setFokusMode] = useState<"lab" | "pengguna">("lab");
  const [indeksZoom, setIndeksZoom] = useState(1); // default 250m

  const sedangMencariLokasi = lokasi.status === "memuat" && !lokasi.koordinat;
  const lokasiTimeout = sedangMencariLokasi && timeoutPercobaan === percobaanLokasi;

  useEffect(() => {
    if (!sedangMencariLokasi) return;
    const target = percobaanLokasi;
    const timer = setTimeout(() => {
      setTimeoutPercobaan(target);
    }, BATAS_TUNGGU_LOKASI_MS);
    return () => clearTimeout(timer);
  }, [sedangMencariLokasi, percobaanLokasi]);

  const labValidList = useMemo(
    () => daftarLab.filter(koordinatLabValid),
    [daftarLab],
  );

  // Pilih laboratorium pertama secara default begitu daftar lab dimuat, atau pertahankan pilihan pengguna.
  const idAktif = useMemo(() => {
    if (labTerpilihId && labValidList.some((item) => item.id === labTerpilihId)) {
      return labTerpilihId;
    }
    return labValidList[0]?.id ?? null;
  }, [labTerpilihId, labValidList]);

  const labTerpilih = useMemo(
    () => labValidList.find((item) => item.id === idAktif) ?? null,
    [idAktif, labValidList],
  );

  const pusatPeta = useMemo(() => {
    if (fokusMode === "pengguna" && lokasi.koordinat) {
      return {
        latitude: lokasi.koordinat.latitude,
        longitude: lokasi.koordinat.longitude,
      };
    }
    if (labTerpilih) {
      return {
        latitude: labTerpilih.latitude,
        longitude: labTerpilih.longitude,
      };
    }
    if (lokasi.koordinat) {
      return {
        latitude: lokasi.koordinat.latitude,
        longitude: lokasi.koordinat.longitude,
      };
    }
    return { latitude: -6.8915, longitude: 107.6107 };
  }, [fokusMode, labTerpilih, lokasi.koordinat]);

  const spanMeter = LEVEL_ZOOM_METER[indeksZoom] ?? 250;

  const pilihLab = (item: Lab) => {
    setLabTerpilihId(item.id ?? null);
    setFokusMode("lab");
  };

  const perbesarPeta = () => {
    setIndeksZoom((prev) => Math.max(0, prev - 1));
  };

  const perkecilPeta = () => {
    setIndeksZoom((prev) => Math.min(LEVEL_ZOOM_METER.length - 1, prev + 1));
  };

  const kembali = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(role === "ASISTEN" ? "/asisten" : "/praktikan");
    }
  };

  if (loadingAuth) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        <Loading label="Memuat peta laboratorium..." />
      </SafeAreaView>
    );
  }

  if (!user || !role) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        <View style={styles.content}>
          <Empty
            title="Belum masuk"
            description="Silakan masuk terlebih dahulu untuk melihat peta dan aktivitas laboratorium."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            onPress={kembali}
            style={styles.backCircle}
          >
            <Text accessible={false} style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.topTextWrap}>
            <Text accessibilityRole="header" style={styles.topTitle}>
              Peta laboratorium
            </Text>
            <Text style={styles.topSubtitle}>
              Sebaran lokasi & aktivitas praktikum real-time
            </Text>
          </View>
          {role === "ASISTEN" ? (
            <Link href="/asisten/lab" asChild>
              <TouchableOpacity
                accessibilityRole="link"
                activeOpacity={0.85}
                style={styles.manageLabBtn}
              >
                <Text style={styles.manageLabBtnText}>Atur lab</Text>
              </TouchableOpacity>
            </Link>
          ) : null}
        </View>

        {labDariCache && !errorLab ? (
          <Text style={styles.cacheNotice}>
            Menampilkan data peta tersimpan di perangkat. Pembaruan akan disinkronkan otomatis saat koneksi internet pulih.
          </Text>
        ) : null}

        {statusNotifikasi ? (
          <PeringatanNotifikasi
            status={statusNotifikasi}
            pesanError={errorNotifikasi}
            onCobaLagi={() => void aktifkanUlangNotifikasi?.()}
          />
        ) : null}

        <PeringatanLokasiPeta
          status={lokasi.status}
          timeout={lokasiTimeout}
          onMintaIzin={() => {
            setPercobaanLokasi((n) => n + 1);
            lokasi.mintaIzin();
          }}
          onMuatUlang={() => {
            setPercobaanLokasi((n) => n + 1);
            lokasi.muatUlang();
          }}
        />

        {errorLab ? (
          <ErrorBanner message={errorLab} />
        ) : loadingLab ? (
          <Loading label="Memuat daftar laboratorium..." />
        ) : labValidList.length === 0 ? (
          <Empty
            title="Belum ada lokasi laboratorium"
            description={
              role === "ASISTEN"
                ? "Tambahkan laboratorium beserta koordinat dan radiusnya melalui menu Atur laboratorium."
                : "Asisten belum menambahkan titik koordinat laboratorium."
            }
          />
        ) : (
          <>
            <KanvasPetaInteraktif
              daftarLab={labValidList}
              labTerpilih={labTerpilih}
              koordinatPengguna={
                lokasi.status === "siap" ? lokasi.koordinat : null
              }
              akurasiMeter={lokasi.akurasiMeter}
              pusat={pusatPeta}
              spanMeter={spanMeter}
              fokusMode={fokusMode}
              onPilihLab={pilihLab}
              onFokusPengguna={() => setFokusMode("pengguna")}
              onFokusLab={() => setFokusMode("lab")}
              onZoomIn={perbesarPeta}
              onZoomOut={perkecilPeta}
            />

            <View style={styles.chipSection}>
              <Text style={styles.sectionLabel}>
                Pilih laboratorium ({labValidList.length})
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {labValidList.map((item) => {
                  const aktif = item.id === idAktif;
                  return (
                    <Pressable
                      key={item.id ?? item.nama}
                      accessibilityRole="button"
                      accessibilityState={{ selected: aktif }}
                      onPress={() => pilihLab(item)}
                      style={[styles.labChip, aktif && styles.labChipActive]}
                    >
                      <Text
                        style={[
                          styles.labChipText,
                          aktif && styles.labChipTextActive,
                        ]}
                      >
                        {item.nama}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {labTerpilih ? (
              role === "ASISTEN" ? (
                <PanelAktivitasAsisten
                  lab={labTerpilih}
                  koordinatPengguna={
                    lokasi.status === "siap" ? lokasi.koordinat : null
                  }
                />
              ) : (
                <PanelAktivitasPraktikan
                  uid={user.uid!}
                  lab={labTerpilih}
                  koordinatPengguna={
                    lokasi.status === "siap" ? lokasi.koordinat : null
                  }
                />
              )
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function KanvasPetaInteraktif({
  daftarLab,
  labTerpilih,
  koordinatPengguna,
  akurasiMeter,
  pusat,
  spanMeter,
  fokusMode,
  onPilihLab,
  onFokusPengguna,
  onFokusLab,
  onZoomIn,
  onZoomOut,
}: {
  daftarLab: Lab[];
  labTerpilih: Lab | null;
  koordinatPengguna: Koordinat | null;
  akurasiMeter: number | null;
  pusat: { latitude: number; longitude: number };
  spanMeter: number;
  fokusMode: "lab" | "pengguna";
  onPilihLab: (lab: Lab) => void;
  onFokusPengguna: () => void;
  onFokusLab: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  const [ukuranKanvas, setUkuranKanvas] = useState({ width: 360, height: 320 });

  const handleLayoutKanvas = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 80 && height > 80) {
      setUkuranKanvas({ width: Math.round(width), height: Math.round(height) });
    }
  };

  const infoOsm = useMemo(
    () =>
      hitungTileOsmKanvas(
        pusat,
        spanMeter,
        ukuranKanvas.width,
        ukuranKanvas.height,
      ),
    [pusat, spanMeter, ukuranKanvas.height, ukuranKanvas.width],
  );

  // Ukuran visual lingkaran radius laboratorium sesuai skala piksel OpenStreetMap
  const ukuranLingkaranRadius = useMemo(() => {
    if (!labTerpilih || !labTerpilih.radiusMeter) return 84;
    const diameterPx =
      (labTerpilih.radiusMeter * 2) / Math.max(0.2, infoOsm.meterPerPiksel);
    return Math.max(44, Math.min(240, Math.round(diameterPx)));
  }, [infoOsm.meterPerPiksel, labTerpilih]);

  const posisiLabTerpilih = useMemo(() => {
    if (!labTerpilih) return null;
    return proyeksikanTitikKeKanvas(
      labTerpilih,
      pusat,
      spanMeter,
      ukuranKanvas.width,
      ukuranKanvas.height,
    );
  }, [labTerpilih, pusat, spanMeter, ukuranKanvas.height, ukuranKanvas.width]);

  const posisiPengguna = useMemo(() => {
    if (!koordinatPengguna) return null;
    return proyeksikanTitikKeKanvas(
      koordinatPengguna,
      pusat,
      spanMeter,
      ukuranKanvas.width,
      ukuranKanvas.height,
    );
  }, [
    koordinatPengguna,
    pusat,
    spanMeter,
    ukuranKanvas.height,
    ukuranKanvas.width,
  ]);

  return (
    <View style={styles.mapOuterWrap}>
      <View style={styles.mapContainer} onLayout={handleLayoutKanvas}>
        {/* Grid cadangan apabila tile OpenStreetMap sedang dimuat / offline */}
        <View accessible={false} style={styles.gridHorizontalA} />
        <View accessible={false} style={styles.gridHorizontalB} />
        <View accessible={false} style={styles.gridHorizontalC} />
        <View accessible={false} style={styles.gridVerticalA} />
        <View accessible={false} style={styles.gridVerticalB} />
        <View accessible={false} style={styles.gridVerticalC} />

        {/* Tile Peta Jalanan OpenStreetMap */}
        <View
          accessible={false}
          pointerEvents="none"
          style={styles.osmTileLayer}
        >
          {infoOsm.tiles.map((tile) => (
            <Image
              key={tile.key}
              source={{
                uri: tile.url,
                headers: { "User-Agent": "HadirLabApp/1.0 (Praktikum-IF)" },
              }}
              resizeMode="cover"
              style={[
                styles.osmTileImage,
                {
                  left: tile.leftPx,
                  top: tile.topPx,
                  width: tile.sizePx,
                  height: tile.sizePx,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.mapTopBar}>
          <View style={styles.compassBadge}>
            <Text style={styles.compassText}>
              U ↑ · Zoom {infoOsm.zoom} (±{spanMeter} m)
            </Text>
          </View>
          <View style={styles.coordBadge}>
            <Text style={styles.coordText}>
              {pusat.latitude.toFixed(4)}, {pusat.longitude.toFixed(4)}
            </Text>
          </View>
        </View>

        {/* Lingkaran radius laboratorium yang dipilih */}
        {posisiLabTerpilih ? (
          <View
            accessible={false}
            style={[
              styles.radiusCircle,
              {
                width: ukuranLingkaranRadius,
                height: ukuranLingkaranRadius,
                borderRadius: ukuranLingkaranRadius / 2,
                left: `${posisiLabTerpilih.xPersen}%`,
                top: `${posisiLabTerpilih.yPersen}%`,
                marginLeft: -ukuranLingkaranRadius / 2,
                marginTop: -ukuranLingkaranRadius / 2,
              },
            ]}
          />
        ) : null}

        {/* Marker semua laboratorium */}
        {daftarLab.map((item) => {
          const terpilih = item.id === labTerpilih?.id;
          const pos = proyeksikanTitikKeKanvas(
            item,
            pusat,
            spanMeter,
            ukuranKanvas.width,
            ukuranKanvas.height,
          );
          return (
            <Pressable
              key={item.id ?? item.nama}
              accessibilityRole="button"
              accessibilityLabel={`Marker laboratorium ${item.nama}, radius ${item.radiusMeter} meter`}
              accessibilityState={{ selected: terpilih }}
              onPress={() => onPilihLab(item)}
              style={[
                styles.markerWrap,
                {
                  left: `${pos.xPersen}%`,
                  top: `${pos.yPersen}%`,
                  zIndex: terpilih ? 20 : 10,
                },
              ]}
            >
              <View
                style={[
                  styles.labMarkerBubble,
                  terpilih
                    ? styles.labMarkerBubbleActive
                    : styles.labMarkerBubbleIdle,
                ]}
              >
                <View
                  style={[
                    styles.labMarkerDot,
                    terpilih
                      ? styles.labMarkerDotActive
                      : styles.labMarkerDotIdle,
                  ]}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.labMarkerLabel,
                    terpilih
                      ? styles.labMarkerLabelActive
                      : styles.labMarkerLabelIdle,
                  ]}
                >
                  {item.nama}
                </Text>
              </View>
              <View
                style={[
                  styles.labMarkerStem,
                  terpilih
                    ? styles.labMarkerStemActive
                    : styles.labMarkerStemIdle,
                ]}
              />
            </Pressable>
          );
        })}

        {/* Marker posisi perangkat pengguna (real-time) */}
        {posisiPengguna ? (
          <View
            accessible
            accessibilityLabel={
              akurasiMeter != null
                ? `Marker lokasi perangkat Anda, akurasi kurang lebih ${formatJarakMeter(akurasiMeter)}`
                : "Marker lokasi perangkat Anda saat ini"
            }
            style={[
              styles.userMarkerWrap,
              {
                left: `${posisiPengguna.xPersen}%`,
                top: `${posisiPengguna.yPersen}%`,
              },
            ]}
          >
            <View style={styles.userPulseRing} />
            <View style={styles.userCoreDot} />
            <View style={styles.userTag}>
              <Text style={styles.userTagText}>Anda</Text>
            </View>
          </View>
        ) : null}

        {/* Kontrol zoom & fokus di dalam sudut kanan bawah peta */}
        <View style={styles.mapControls}>
          <View style={styles.zoomGroup}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Perbesar peta"
              onPress={onZoomIn}
              style={styles.zoomBtn}
            >
              <Text style={styles.zoomBtnText}>＋</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Perkecil peta"
              onPress={onZoomOut}
              style={styles.zoomBtn}
            >
              <Text style={styles.zoomBtnText}>－</Text>
            </TouchableOpacity>
          </View>
          {koordinatPengguna ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Fokus ke lokasi saya"
              onPress={onFokusPengguna}
              style={[
                styles.controlChip,
                fokusMode === "pengguna" && styles.controlChipActive,
              ]}
            >
              <Text
                style={[
                  styles.controlChipText,
                  fokusMode === "pengguna" && styles.controlChipTextActive,
                ]}
              >
                Lokasi saya
              </Text>
            </TouchableOpacity>
          ) : null}
          {labTerpilih ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Fokus ke ${labTerpilih.nama}`}
              onPress={onFokusLab}
              style={[
                styles.controlChip,
                fokusMode === "lab" && styles.controlChipActive,
              ]}
            >
              <Text
                style={[
                  styles.controlChipText,
                  fokusMode === "lab" && styles.controlChipTextActive,
                ]}
              >
                Fokus lab
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Baris legenda & atribusi OpenStreetMap di bawah kanvas agar tidak tertutup tombol */}
      <View style={styles.mapFooterBar}>
        <View style={styles.legendInlineGroup}>
          <View style={styles.legendRow}>
            <View
              style={[styles.legendDot, { backgroundColor: warna.suksesTeks }]}
            />
            <Text style={styles.legendText}>Lab dipilih</Text>
          </View>
          <View style={styles.legendRow}>
            <View
              style={[styles.legendDot, { backgroundColor: warna.utama }]}
            />
            <Text style={styles.legendText}>
              {koordinatPengguna
                ? "Lokasi Anda (aktif)"
                : "Lokasi Anda (nonaktif)"}
            </Text>
          </View>
        </View>
        <Text style={styles.osmAttribution}>© OpenStreetMap</Text>
      </View>
    </View>
  );
}

function PanelAktivitasAsisten({
  lab,
  koordinatPengguna,
}: {
  lab: Lab;
  koordinatPengguna: { latitude: number; longitude: number } | null;
}) {
  const {
    sesi,
    loading: loadingSesi,
    error: errorSesi,
    dariCache: sesiDariCache,
  } = useDaftarSesi(undefined, { semua: true });
  const { mapKelas, loading: loadingKelas, error: errorKelas } = useDaftarKelas({
    semua: true,
  });
  return (
    <DetailAktivitasLabCard
      lab={lab}
      sesi={sesi}
      mapKelas={mapKelas}
      loading={loadingSesi || loadingKelas}
      error={errorSesi ?? errorKelas}
      dariCache={sesiDariCache}
      koordinatPengguna={koordinatPengguna}
      peran="ASISTEN"
    />
  );
}

function PanelAktivitasPraktikan({
  uid,
  lab,
  koordinatPengguna,
}: {
  uid: string;
  lab: Lab;
  koordinatPengguna: { latitude: number; longitude: number } | null;
}) {
  const { sesi, mapKelas, loading, error, dariCache, cobaLagi } =
    useJadwalPraktikan(uid);
  return (
    <DetailAktivitasLabCard
      lab={lab}
      sesi={sesi}
      mapKelas={mapKelas as ReadonlyMap<string, Kelas>}
      loading={loading}
      error={error}
      dariCache={dariCache}
      onCobaLagi={cobaLagi}
      koordinatPengguna={koordinatPengguna}
      peran="PRAKTIKAN"
    />
  );
}

export function DetailAktivitasLabCard({
  lab,
  sesi,
  mapKelas,
  loading,
  error,
  dariCache = false,
  onCobaLagi,
  koordinatPengguna,
  peran,
}: {
  lab: Lab;
  sesi: readonly Sesi[];
  mapKelas: ReadonlyMap<string, Kelas>;
  loading: boolean;
  error: string | null;
  dariCache?: boolean;
  onCobaLagi?: () => void;
  koordinatPengguna: { latitude: number; longitude: number } | null;
  peran: "ASISTEN" | "PRAKTIKAN";
}) {
  const router = useRouter();
  const ringkasan = useMemo(
    () => ringkasAktivitasLab(lab, sesi, mapKelas, new Date()),
    [lab, sesi, mapKelas],
  );

  const infoJarak = useMemo(() => {
    if (!koordinatPengguna) return null;
    try {
      const jarak = hitungJarakMeter(koordinatPengguna, lab);
      const dalamRadius = jarak <= lab.radiusMeter;
      return { jarak, dalamRadius };
    } catch {
      return null;
    }
  }, [koordinatPengguna, lab]);

  const bukaSesi = (item: SesiDenganKelas) => {
    const id = item.sesi.id?.trim();
    if (!id) return;
    if (peran === "ASISTEN") {
      router.navigate({ pathname: "/asisten/[sesiId]", params: { sesiId: id } });
    } else if (item.sesi.status === "DIBUKA") {
      router.navigate({
        pathname: "/praktikan/presensi/[sessionId]",
        params: { sessionId: id },
      });
    } else {
      router.navigate({ pathname: "/praktikan/[sesiId]", params: { sesiId: id } });
    }
  };

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailHeader}>
        <View style={styles.detailTitleWrap}>
          <Text style={styles.eyebrow}>DETAIL LABORATORIUM</Text>
          <Text accessibilityRole="header" style={styles.detailTitle}>
            {lab.nama}
          </Text>
          {lab.gedung?.trim() ? (
            <Text style={styles.detailSubtitle}>{lab.gedung.trim()}</Text>
          ) : null}
        </View>
        <View style={styles.radiusBadge}>
          <Text style={styles.radiusBadgeText}>
            Radius {formatJarakMeter(lab.radiusMeter)}
          </Text>
        </View>
      </View>

      {dariCache && !error ? (
        <Text style={styles.cacheNotice}>
          Menampilkan jadwal aktivitas tersimpan di perangkat (mode offline).
        </Text>
      ) : null}

      <View style={styles.metaBox}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Koordinat</Text>
          <Text style={styles.metaValue}>
            {lab.latitude.toFixed(5)}, {lab.longitude.toFixed(5)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Total sesi terdaftar</Text>
          <Text style={styles.metaValue}>{ringkasan.totalSesi} sesi</Text>
        </View>
        {infoJarak ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Jarak dari posisimu</Text>
            <Text
              style={[
                styles.metaValue,
                infoJarak.dalamRadius ? styles.metaSukses : styles.metaError,
              ]}
            >
              {formatJarakMeter(infoJarak.jarak, lab.radiusMeter)} (
              {infoJarak.dalamRadius ? "Dalam radius" : "Di luar radius"})
            </Text>
          </View>
        ) : null}
      </View>

      {error ? (
        <View style={styles.feedback}>
          <ErrorBanner message={error} />
          {onCobaLagi ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onCobaLagi}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Coba lagi</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : loading ? (
        <Loading label="Memuat aktivitas praktikum..." />
      ) : (
        <View style={styles.activityWrap}>
          <View style={styles.activitySection}>
            <Text style={styles.activityHeading}>Sedang berlangsung</Text>
            {ringkasan.berlangsung.length === 0 ? (
              <View style={styles.emptyActivityBox}>
                <Text style={styles.emptyActivityText}>
                  Tidak ada praktikum yang sedang dibuka di laboratorium ini.
                </Text>
              </View>
            ) : (
              ringkasan.berlangsung.map((item) => (
                <KartuSesiLab
                  key={item.sesi.id ?? item.sesi.modul}
                  item={item}
                  peran={peran}
                  onPress={() => bukaSesi(item)}
                />
              ))
            )}
          </View>

          <View style={styles.activitySection}>
            <Text style={styles.activityHeading}>Praktikum berikutnya</Text>
            {!ringkasan.berikutnya ? (
              <View style={styles.emptyActivityBox}>
                <Text style={styles.emptyActivityText}>
                  Belum ada jadwal praktikum berikutnya yang terjadwal di laboratorium ini.
                </Text>
              </View>
            ) : (
              <KartuSesiLab
                item={ringkasan.berikutnya}
                peran={peran}
                onPress={() => bukaSesi(ringkasan.berikutnya!)}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function KartuSesiLab({
  item,
  peran,
  onPress,
}: {
  item: SesiDenganKelas;
  peran: "ASISTEN" | "PRAKTIKAN";
  onPress: () => void;
}) {
  const info = formatRingkasanSesiLab(item);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.sessionCard}
    >
      <View style={styles.sessionTop}>
        <Text style={styles.sessionClass}>{info.kelasLabel}</Text>
        <StatusSesi status={info.status} />
      </View>
      <Text style={styles.sessionTitle}>{info.namaPraktikum}</Text>
      <Text style={styles.sessionModule}>{info.modul}</Text>
      <View style={styles.sessionFooter}>
        <Text style={styles.sessionTime}>{info.waktu}</Text>
        <Text style={styles.sessionAction}>
          {peran === "ASISTEN"
            ? "Kelola ›"
            : info.status === "DIBUKA"
              ? "Presensi ›"
              : "Detail ›"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: warna.latar },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 112,
    gap: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pil,
    backgroundColor: warna.kartuKaca,
    borderWidth: 1,
    borderColor: warna.garis,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: warna.utama, fontSize: 26, lineHeight: 28, marginTop: -2 },
  topTextWrap: { flex: 1 },
  topTitle: { color: warna.teks, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  topSubtitle: { color: warna.teksRedup, fontSize: 13, lineHeight: 19 },
  manageLabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pil,
    backgroundColor: warna.utama,
  },
  manageLabBtnText: {
    color: warna.utamaTeks,
    fontSize: 12,
    fontWeight: "700",
  },
  cacheNotice: {
    color: warna.peringatanTeks,
    backgroundColor: warna.peringatanLatar,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.kecil,
    fontSize: 12,
    lineHeight: 18,
  },
  mapOuterWrap: {
    gap: 8,
  },
  mapContainer: {
    height: 310,
    borderRadius: radius.kartu,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: warna.garis,
    backgroundColor: "#EFE4D4",
    position: "relative",
  },
  osmTileLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  osmTileImage: {
    position: "absolute",
  },
  gridHorizontalA: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "25%",
    height: 1,
    backgroundColor: "rgba(16, 44, 87, 0.08)",
  },
  gridHorizontalB: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: "rgba(16, 44, 87, 0.14)",
  },
  gridHorizontalC: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "75%",
    height: 1,
    backgroundColor: "rgba(16, 44, 87, 0.08)",
  },
  gridVerticalA: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "25%",
    width: 1,
    backgroundColor: "rgba(16, 44, 87, 0.08)",
  },
  gridVerticalB: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
    backgroundColor: "rgba(16, 44, 87, 0.14)",
  },
  gridVerticalC: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "75%",
    width: 1,
    backgroundColor: "rgba(16, 44, 87, 0.08)",
  },
  mapTopBar: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 30,
  },
  compassBadge: {
    backgroundColor: warna.kartuKaca,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pil,
    borderWidth: 1,
    borderColor: warna.garis,
  },
  compassText: { color: warna.teks, fontSize: 11, fontWeight: "700" },
  coordBadge: {
    backgroundColor: warna.kartuKaca,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pil,
    borderWidth: 1,
    borderColor: warna.garis,
  },
  coordText: { color: warna.teksRedup, fontSize: 11, fontWeight: "600" },
  radiusCircle: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(31, 77, 56, 0.75)",
    backgroundColor: "rgba(45, 138, 86, 0.22)",
    zIndex: 5,
  },
  markerWrap: {
    position: "absolute",
    alignItems: "center",
    transform: [{ translateX: -54 }, { translateY: -36 }],
    width: 108,
  },
  labMarkerBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pil,
    borderWidth: 1.5,
    maxWidth: 108,
  },
  labMarkerBubbleActive: {
    backgroundColor: warna.suksesTeks,
    borderColor: warna.kartu,
  },
  labMarkerBubbleIdle: {
    backgroundColor: warna.kartu,
    borderColor: warna.utama,
  },
  labMarkerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  labMarkerDotActive: { backgroundColor: warna.utamaTeks },
  labMarkerDotIdle: { backgroundColor: warna.error },
  labMarkerLabel: {
    fontSize: 11,
    fontWeight: "800",
    flexShrink: 1,
  },
  labMarkerLabelActive: { color: warna.utamaTeks },
  labMarkerLabelIdle: { color: warna.teks },
  labMarkerStem: {
    width: 3,
    height: 8,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  labMarkerStemActive: { backgroundColor: warna.suksesTeks },
  labMarkerStemIdle: { backgroundColor: warna.utama },
  userMarkerWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    zIndex: 25,
  },
  userPulseRing: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(16, 44, 87, 0.22)",
    borderWidth: 1.5,
    borderColor: "rgba(16, 44, 87, 0.45)",
  },
  userCoreDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: warna.utama,
    borderWidth: 2.5,
    borderColor: warna.kartu,
  },
  userTag: {
    marginTop: 2,
    backgroundColor: warna.utama,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pil,
  },
  userTagText: { color: warna.utamaTeks, fontSize: 9, fontWeight: "800" },
  mapFooterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: warna.kartuKaca,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: warna.garis,
    gap: 10,
  },
  legendInlineGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
    flex: 1,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: warna.teksIsi, fontSize: 11, fontWeight: "700" },
  osmAttribution: {
    color: warna.teksRedup,
    fontSize: 10,
    fontWeight: "600",
  },
  mapControls: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    zIndex: 30,
  },
  zoomGroup: {
    flexDirection: "row",
    gap: 6,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pil,
    backgroundColor: warna.kartu,
    borderWidth: 1,
    borderColor: warna.garis,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnText: { color: warna.utama, fontSize: 16, fontWeight: "800" },
  controlChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pil,
    backgroundColor: warna.kartu,
    borderWidth: 1,
    borderColor: warna.garis,
  },
  controlChipActive: {
    backgroundColor: warna.utama,
    borderColor: warna.utama,
  },
  controlChipText: { color: warna.utama, fontSize: 11, fontWeight: "700" },
  controlChipTextActive: { color: warna.utamaTeks },
  chipSection: { gap: 8 },
  sectionLabel: { color: warna.teksIsi, fontSize: 13, fontWeight: "700" },
  chipRow: { gap: 8, paddingRight: 8 },
  labChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pil,
    borderWidth: 1,
    borderColor: warna.garis,
    backgroundColor: warna.kartuKaca,
  },
  labChipActive: {
    backgroundColor: warna.utama,
    borderColor: warna.utama,
  },
  labChipText: { color: warna.teksIsi, fontSize: 13, fontWeight: "700" },
  labChipTextActive: { color: warna.utamaTeks },
  detailCard: {
    backgroundColor: warna.kartuKaca,
    borderWidth: 1,
    borderColor: warna.garis,
    borderRadius: radius.kartu,
    padding: 20,
    gap: 16,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  detailTitleWrap: { flex: 1, gap: 4 },
  eyebrow: {
    color: warna.teksRedup,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  detailTitle: { color: warna.teks, fontSize: 21, lineHeight: 28, fontWeight: "800" },
  detailSubtitle: { color: warna.teksIsi, fontSize: 14, lineHeight: 20 },
  radiusBadge: {
    backgroundColor: warna.permukaan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pil,
  },
  radiusBadgeText: { color: warna.utama, fontSize: 12, fontWeight: "700" },
  metaBox: {
    backgroundColor: warna.permukaanLembut,
    borderRadius: radius.kecil,
    padding: 14,
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  metaLabel: { color: warna.teksRedup, fontSize: 13 },
  metaValue: {
    flex: 1,
    color: warna.teks,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  metaSukses: { color: warna.suksesTeks },
  metaError: { color: warna.errorTeks },
  feedback: { gap: 10 },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: radius.pil,
    borderWidth: 1,
    borderColor: warna.garis,
    backgroundColor: warna.kartu,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: warna.utama, fontSize: 13, fontWeight: "700" },
  activityWrap: { gap: 16 },
  activitySection: { gap: 10 },
  activityHeading: { color: warna.teks, fontSize: 16, fontWeight: "800" },
  emptyActivityBox: {
    backgroundColor: warna.kartu,
    borderWidth: 1,
    borderColor: warna.garis,
    borderRadius: radius.kecil,
    padding: 14,
  },
  emptyActivityText: { color: warna.teksRedup, fontSize: 13, lineHeight: 20 },
  sessionCard: {
    backgroundColor: warna.kartu,
    borderWidth: 1,
    borderColor: warna.garis,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  sessionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 2,
  },
  sessionClass: {
    flex: 1,
    color: warna.teksRedup,
    fontSize: 12,
    fontWeight: "700",
  },
  sessionTitle: { color: warna.teks, fontSize: 17, lineHeight: 23, fontWeight: "800" },
  sessionModule: { color: warna.teksIsi, fontSize: 13, lineHeight: 20 },
  sessionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: warna.permukaanLembut,
  },
  sessionTime: { flex: 1, color: warna.teksIsi, fontSize: 13, fontWeight: "600" },
  sessionAction: { color: warna.utama, fontSize: 13, fontWeight: "700" },
});
