import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormKelas } from "../../components/asisten/FormKelas";
import { FormSesi } from "../../components/asisten/FormSesi";
import { KelolaPeserta } from "../../components/asisten/KelolaPeserta";
import { KonfirmasiHapus } from "../../components/asisten/KonfirmasiHapus";
import { StatusSesi } from "../../components/asisten/StatusSesi";
import {
  Empty,
  ErrorBanner,
  Loading,
} from "../../components/shared/StatusLayar";
import { useWajibAsisten } from "../../hooks/useWajibAsisten";
import {
  buatKelas,
  hapusKelas,
  hapusPeserta,
  perbaruiKelas,
  tambahPeserta,
  useDaftarKelas,
} from "../../hooks/useKelas";
import { useDaftarLab } from "../../hooks/useLab";
import { useDaftarPraktikan } from "../../hooks/usePeserta";
import {
  buatSesi,
  hapusSeriSesi,
  hapusSesi,
  perbaruiSeriSesi,
  perbaruiSesi,
  useDaftarSesi,
} from "../../hooks/useSesi";
import { pesanError } from "../../lib/errors";
import type { Kelas, Sesi } from "../../types";
import { teksWaktuSesi } from "../../utils/waktuSesi";
import { warna } from "../../theme";

type TabKelola = "kelas" | "sesi";

interface GrupSesi {
  key: string;
  seriId: string | null;
  utama: Sesi;
  daftar: Sesi[];
}

function kelompokkanSesi(daftarSesi: Sesi[]): GrupSesi[] {
  const hasil: GrupSesi[] = [];
  const indeksSeri = new Map<string, number>();

  for (const s of daftarSesi) {
    if (s.seriId) {
      const idx = indeksSeri.get(s.seriId);
      if (idx !== undefined) {
        hasil[idx]!.daftar.push(s);
      } else {
        indeksSeri.set(s.seriId, hasil.length);
        hasil.push({
          key: `seri-${s.seriId}`,
          seriId: s.seriId,
          utama: s,
          daftar: [s],
        });
      }
    } else {
      hasil.push({
        key: `sesi-${s.id ?? hasil.length}`,
        seriId: null,
        utama: s,
        daftar: [s],
      });
    }
  }

  for (const grup of hasil) {
    if (grup.daftar.length > 1) {
      grup.daftar.sort((a, b) => (a.pertemuanKe ?? 0) - (b.pertemuanKe ?? 0));
      grup.utama = grup.daftar[0]!;
    }
  }

  return hasil;
}

export default function KelolaKelasScreen() {
  const router = useRouter();
  const { loading: loadingAuth, boleh } = useWajibAsisten();
  const { kelas, mapKelas, loading, error } = useDaftarKelas();
  const { sesi, loading: loadingSesi, error: errorSesi } = useDaftarSesi();
  const { mapLab } = useDaftarLab();
  const { pengguna: daftarPraktikan } = useDaftarPraktikan();

  const [tabAktif, setTabAktif] = useState<TabKelola>("kelas");

  // State untuk tab Kelas (tidak ada yang berubah pada fitur kelas praktikum)
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [editKelas, setEditKelas] = useState<Kelas | null>(null);
  const [kelasDihapus, setKelasDihapus] = useState<Kelas | null>(null);
  const [kelasPeserta, setKelasPeserta] = useState<Kelas | null>(null);
  const [memprosesHapus, setMemprosesHapus] = useState(false);
  const [errorHapus, setErrorHapus] = useState<string | null>(null);

  // State untuk tab Sesi
  const [formSesiTerbuka, setFormSesiTerbuka] = useState(false);
  const [editTargetSesi, setEditTargetSesi] = useState<
    | { mode: "seri"; grup: GrupSesi }
    | { mode: "satuan"; sesi: Sesi }
    | null
  >(null);
  const [hapusTargetSesi, setHapusTargetSesi] = useState<
    | { mode: "seri"; grup: GrupSesi }
    | { mode: "satuan"; sesi: Sesi }
    | null
  >(null);
  const [seriTerbuka, setSeriTerbuka] = useState<Record<string, boolean>>({});
  const [memprosesHapusSesi, setMemprosesHapusSesi] = useState(false);
  const [errorHapusSesi, setErrorHapusSesi] = useState<string | null>(null);

  const daftarGrupSesi = useMemo(() => kelompokkanSesi(sesi), [sesi]);

  const toggleSeriTerbuka = (key: string) => {
    setSeriTerbuka((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loadingAuth) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        <Loading />
      </SafeAreaView>
    );
  }
  if (!boleh) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        <View style={styles.denied}>
          <Text style={styles.deniedTitle}>Akses ditolak</Text>
          <Text style={styles.deniedText}>
            Halaman ini hanya untuk asisten.
          </Text>
          <Link href="/" asChild>
            <TouchableOpacity style={styles.deniedBtn}>
              <Text style={styles.deniedBtnText}>Ke halaman masuk</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  const konfirmasiHapus = async () => {
    if (!kelasDihapus?.id) return;
    setMemprosesHapus(true);
    setErrorHapus(null);
    try {
      await hapusKelas(kelasDihapus.id);
      setKelasDihapus(null);
    } catch (err) {
      setKelasDihapus(null);
      setErrorHapus(pesanError(err));
    } finally {
      setMemprosesHapus(false);
    }
  };

  const konfirmasiHapusSesi = async () => {
    if (!hapusTargetSesi) return;
    setMemprosesHapusSesi(true);
    setErrorHapusSesi(null);
    try {
      if (
        hapusTargetSesi.mode === "seri" &&
        hapusTargetSesi.grup.seriId &&
        hapusTargetSesi.grup.daftar.length > 1
      ) {
        await hapusSeriSesi(hapusTargetSesi.grup.seriId);
      } else if (hapusTargetSesi.mode === "seri" && hapusTargetSesi.grup.utama.id) {
        await hapusSesi(hapusTargetSesi.grup.utama.id);
      } else if (hapusTargetSesi.mode === "satuan" && hapusTargetSesi.sesi.id) {
        await hapusSesi(hapusTargetSesi.sesi.id);
      }
      setHapusTargetSesi(null);
    } catch (err) {
      setHapusTargetSesi(null);
      setErrorHapusSesi(pesanError(err));
    } finally {
      setMemprosesHapusSesi(false);
    }
  };

  const labelKelas = (classId: string) => {
    const k = mapKelas.get(classId);
    return k ? `${k.nama} (${k.kode})` : "Kelas praktikum";
  };

  const headerBersama = (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Link href="/asisten" dismissTo asChild>
          <TouchableOpacity accessibilityRole="link" style={styles.backLink}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Kembali ke jadwal</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Segmen pilihan: Kelas & Sesi */}
      <View accessibilityRole="tablist" style={styles.segmentWrap}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tabAktif === "kelas" }}
          onPress={() => setTabAktif("kelas")}
          style={[styles.segmentBtn, tabAktif === "kelas" && styles.segmentBtnActive]}
        >
          <Text
            style={[
              styles.segmentText,
              tabAktif === "kelas" && styles.segmentTextActive,
            ]}
          >
            Kelas ({kelas.length})
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tabAktif === "sesi" }}
          onPress={() => setTabAktif("sesi")}
          style={[styles.segmentBtn, tabAktif === "sesi" && styles.segmentBtnActive]}
        >
          <Text
            style={[
              styles.segmentText,
              tabAktif === "sesi" && styles.segmentTextActive,
            ]}
          >
            Sesi ({daftarGrupSesi.length})
          </Text>
        </Pressable>
      </View>

      {tabAktif === "kelas" ? (
        <>
          <View style={styles.headingRow}>
            <Text accessibilityRole="header" style={styles.title}>
              Kelas praktikum
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{kelas.length} kelas</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Kelola kelas dan daftar pesertanya.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setEditKelas(null);
              setFormTerbuka(true);
            }}
          >
            <Text style={styles.primaryText}>Tambah kelas</Text>
          </TouchableOpacity>
          {error ? <ErrorBanner message={error} /> : null}
          {errorHapus ? <ErrorBanner message={errorHapus} /> : null}
        </>
      ) : (
        <>
          <View style={styles.headingRow}>
            <Text accessibilityRole="header" style={styles.title}>
              Sesi praktikum
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{sesi.length} pertemuan</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Kelola seluruh sesi yang telah Anda buat. Sesi berulang dapat diubah atau dihapus sekaligus.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setEditTargetSesi(null);
              setFormSesiTerbuka(true);
            }}
          >
            <Text style={styles.primaryText}>Tambah sesi</Text>
          </TouchableOpacity>
          {errorSesi ? <ErrorBanner message={errorSesi} /> : null}
          {errorHapusSesi ? <ErrorBanner message={errorHapusSesi} /> : null}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      {tabAktif === "kelas" ? (
        <FlatList
          key="daftar-kelas"
          data={kelas}
          keyExtractor={(item) => item.id ?? ""}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={headerBersama}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.nama}</Text>
                  <Text style={styles.cardSub}>
                    Kode {item.kode} · {item.pesertaUids?.length ?? 0} peserta
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.manageBtn}
                  onPress={() => setKelasPeserta(item)}
                >
                  <Text style={styles.manageText}>Peserta</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => {
                    setEditKelas(item);
                    setFormTerbuka(true);
                  }}
                >
                  <Text style={styles.editText}>Ubah</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => setKelasDihapus(item)}
                >
                  <Text style={styles.deleteText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            loading ? (
              <Loading />
            ) : (
              <Empty
                title="Belum ada kelas"
                description="Tambahkan kelas untuk mengelompokkan praktikan."
              />
            )
          }
        />
      ) : (
        <FlatList
          key="daftar-sesi"
          data={daftarGrupSesi}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={headerBersama}
          renderItem={({ item }) => {
            const jumlahPertemuan = item.daftar.length;
            const adalahSeri = Boolean(item.seriId && jumlahPertemuan > 1);
            const sesiUtama = item.utama;
            const terbuka = Boolean(seriTerbuka[item.key]);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>
                      {sesiUtama.namaPraktikum?.trim() || "Praktikum"}
                    </Text>
                    <Text style={styles.cardSub}>
                      {adalahSeri
                        ? `${jumlahPertemuan} pertemuan berulang · ${labelKelas(sesiUtama.classId)}`
                        : `${sesiUtama.modul?.trim() || "Sesi tunggal"} · ${labelKelas(sesiUtama.classId)}`}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {adalahSeri ? "Mulai: " : ""}
                      {teksWaktuSesi(sesiUtama)}
                    </Text>
                    <Text style={styles.cardMeta}>
                      Lab: {sesiUtama.ruangan?.trim() || "Belum diatur"}
                    </Text>
                  </View>
                  {sesiUtama.id ? (
                    <TouchableOpacity
                      style={styles.manageBtn}
                      onPress={() =>
                        router.navigate({
                          pathname: "/asisten/[sesiId]",
                          params: { sesiId: sesiUtama.id! },
                        })
                      }
                    >
                      <Text style={styles.manageText}>Detail</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      setEditTargetSesi({ mode: "seri", grup: item });
                      setFormSesiTerbuka(true);
                    }}
                  >
                    <Text style={styles.editText}>
                      {adalahSeri ? `Ubah semua (${jumlahPertemuan})` : "Ubah"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => setHapusTargetSesi({ mode: "seri", grup: item })}
                  >
                    <Text style={styles.deleteText}>
                      {adalahSeri ? `Hapus semua (${jumlahPertemuan})` : "Hapus"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {adalahSeri ? (
                  <>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => toggleSeriTerbuka(item.key)}
                      style={styles.expandToggleBtn}
                    >
                      <Text style={styles.expandToggleText}>
                        {terbuka
                          ? "Sembunyikan daftar pertemuan ▲"
                          : `Ubah/hapus satuan · Lihat ${jumlahPertemuan} pertemuan ▾`}
                      </Text>
                    </TouchableOpacity>

                    {terbuka ? (
                      <View style={styles.subSessionList}>
                        {item.daftar.map((s) => (
                          <View
                            key={s.id ?? s.modul}
                            style={styles.subSessionItem}
                          >
                            <View style={styles.subSessionTop}>
                              <Text style={styles.subSessionTitle}>
                                {s.modul?.trim() ||
                                  (s.pertemuanKe
                                    ? `Pertemuan ${s.pertemuanKe}`
                                    : "Pertemuan")}
                              </Text>
                              <StatusSesi status={s.status} />
                            </View>
                            <Text style={styles.subSessionMeta}>
                              {teksWaktuSesi(s)} · {s.ruangan?.trim() || "Lab belum diatur"}
                            </Text>
                            <View style={styles.subSessionActions}>
                              <TouchableOpacity
                                style={styles.subEditBtn}
                                onPress={() => {
                                  setEditTargetSesi({ mode: "satuan", sesi: s });
                                  setFormSesiTerbuka(true);
                                }}
                              >
                                <Text style={styles.subEditText}>Ubah ini</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.subDeleteBtn}
                                onPress={() =>
                                  setHapusTargetSesi({ mode: "satuan", sesi: s })
                                }
                              >
                                <Text style={styles.subDeleteText}>Hapus ini</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            loadingSesi ? (
              <Loading label="Memuat daftar sesi..." />
            ) : (
              <Empty
                title="Belum ada sesi yang dibuat"
                description="Tambahkan sesi praktikum agar muncul di sini dan di jadwal mingguan Beranda."
              />
            )
          }
        />
      )}

      {formTerbuka ? (
        <FormKelas
          key={editKelas?.id ?? "baru"}
          awal={editKelas}
          onBatal={() => setFormTerbuka(false)}
          onSimpan={(input) =>
            editKelas?.id ? perbaruiKelas(editKelas.id, input) : buatKelas(input)
          }
        />
      ) : null}

      {formSesiTerbuka ? (
        <FormSesi
          key={
            editTargetSesi?.mode === "satuan"
              ? `satuan-${editTargetSesi.sesi.id}`
              : editTargetSesi?.mode === "seri"
                ? `seri-${editTargetSesi.grup.key}`
                : "sesi-baru"
          }
          awal={
            editTargetSesi?.mode === "satuan"
              ? editTargetSesi.sesi
              : editTargetSesi?.mode === "seri"
                ? editTargetSesi.grup.utama
                : null
          }
          daftarKelas={kelas}
          daftarLab={Array.from(mapLab.values())}
          onBatal={() => {
            setFormSesiTerbuka(false);
            setEditTargetSesi(null);
          }}
          onSimpan={(input, jumlahPertemuan) => {
            if (editTargetSesi?.mode === "satuan") {
              return perbaruiSesi(editTargetSesi.sesi.id!, input);
            }
            if (editTargetSesi?.mode === "seri") {
              if (
                editTargetSesi.grup.seriId &&
                editTargetSesi.grup.daftar.length > 1
              ) {
                return perbaruiSeriSesi(editTargetSesi.grup.seriId, input);
              }
              return perbaruiSesi(editTargetSesi.grup.utama.id!, input);
            }
            return buatSesi(input, jumlahPertemuan);
          }}
        />
      ) : null}

      <KonfirmasiHapus
        visible={Boolean(kelasDihapus)}
        judul="Hapus kelas?"
        pesan={`Kelas ${kelasDihapus?.nama ?? ""} beserta semua sesinya akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        memproses={memprosesHapus}
        onBatal={() => setKelasDihapus(null)}
        onKonfirmasi={konfirmasiHapus}
      />

      <KonfirmasiHapus
        visible={Boolean(hapusTargetSesi)}
        judul={
          hapusTargetSesi?.mode === "seri" &&
          hapusTargetSesi.grup.seriId &&
          hapusTargetSesi.grup.daftar.length > 1
            ? `Hapus ${hapusTargetSesi.grup.daftar.length} sesi sekaligus?`
            : "Hapus sesi ini?"
        }
        pesan={
          hapusTargetSesi?.mode === "seri" &&
          hapusTargetSesi.grup.seriId &&
          hapusTargetSesi.grup.daftar.length > 1
            ? `Seluruh ${hapusTargetSesi.grup.daftar.length} pertemuan untuk ${hapusTargetSesi.grup.utama.namaPraktikum} beserta data presensinya akan dihapus sekaligus.`
            : hapusTargetSesi?.mode === "satuan"
              ? `Hanya pertemuan ${hapusTargetSesi.sesi.modul || ""} (${hapusTargetSesi.sesi.namaPraktikum}) yang akan dihapus. Pertemuan lainnya tetap aman.`
              : `Sesi ${hapusTargetSesi?.grup.utama.namaPraktikum ?? ""} (${hapusTargetSesi?.grup.utama.modul ?? ""}) beserta seluruh presensinya akan dihapus.`
        }
        memproses={memprosesHapusSesi}
        onBatal={() => setHapusTargetSesi(null)}
        onKonfirmasi={konfirmasiHapusSesi}
      />

      {kelasPeserta ? (
        <KelolaPeserta
          visible={Boolean(kelasPeserta)}
          kelas={kelasPeserta}
          daftarPraktikan={daftarPraktikan}
          onBatal={() => setKelasPeserta(null)}
          onTambah={(uid) => tambahPeserta(kelasPeserta.id!, uid)}
          onHapus={(uid) => hapusPeserta(kelasPeserta.id!, uid)}
        />
      ) : null}
    </SafeAreaView>
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
  },
  separator: { height: 16 },
  header: { marginBottom: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backLink: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, marginLeft: -8 },
  backArrow: { color: warna.utama, fontSize: 28, lineHeight: 32 },
  backText: { color: warna.utama, fontSize: 14, lineHeight: 22, fontWeight: "600" },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: warna.permukaanLembut,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: warna.garis,
    marginBottom: 18,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    backgroundColor: warna.utama,
  },
  segmentText: {
    color: warna.teksIsi,
    fontSize: 14,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: warna.utamaTeks,
  },
  headingRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 10 },
  title: { color: warna.teks, fontSize: 28, lineHeight: 36, fontWeight: "800" },
  countBadge: { backgroundColor: warna.permukaan, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  countText: { color: warna.utama, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  subtitle: { color: warna.teksRedup, fontSize: 15, lineHeight: 24 },
  primaryBtn: { minHeight: 48, paddingHorizontal: 20, borderRadius: 999, backgroundColor: warna.utama, alignItems: "center", justifyContent: "center", marginTop: 16, alignSelf: "flex-start" },
  primaryText: { color: warna.utamaTeks, fontSize: 14, fontWeight: "700" },
  card: {
    backgroundColor: warna.kartuKaca,
    borderWidth: 1,
    borderColor: warna.garis,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { color: warna.teks, fontSize: 18, lineHeight: 26, fontWeight: "800" },
  cardSub: { color: warna.teksRedup, fontSize: 14, lineHeight: 22 },
  cardMeta: { color: warna.teksIsi, fontSize: 13, lineHeight: 20 },
  manageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: warna.permukaan },
  manageText: { color: warna.utama, fontSize: 13, fontWeight: "700" },
  cardActions: { flexDirection: "row", gap: 12 },
  editBtn: { flex: 1, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: warna.garis, backgroundColor: warna.kartu, alignItems: "center", justifyContent: "center" },
  editText: { color: warna.teksIsi, fontSize: 14, fontWeight: "700" },
  deleteBtn: { flex: 1, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: warna.errorGaris, backgroundColor: warna.errorLatar, alignItems: "center", justifyContent: "center" },
  deleteText: { color: warna.error, fontSize: 14, fontWeight: "700" },
  expandToggleBtn: {
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: warna.permukaanLembut,
    borderWidth: 1,
    borderColor: warna.garis,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  expandToggleText: { color: warna.utama, fontSize: 13, fontWeight: "700" },
  subSessionList: {
    gap: 10,
    paddingTop: 4,
  },
  subSessionItem: {
    backgroundColor: warna.kartu,
    borderWidth: 1,
    borderColor: warna.garis,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  subSessionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  subSessionTitle: { color: warna.teks, fontSize: 14, fontWeight: "800" },
  subSessionMeta: { color: warna.teksRedup, fontSize: 12, lineHeight: 18 },
  subSessionActions: { flexDirection: "row", gap: 8, marginTop: 2 },
  subEditBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: warna.garis,
    backgroundColor: warna.permukaanLembut,
    alignItems: "center",
    justifyContent: "center",
  },
  subEditText: { color: warna.utama, fontSize: 12, fontWeight: "700" },
  subDeleteBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: warna.errorGaris,
    backgroundColor: warna.errorLatar,
    alignItems: "center",
    justifyContent: "center",
  },
  subDeleteText: { color: warna.error, fontSize: 12, fontWeight: "700" },
  denied: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  deniedTitle: { color: warna.teks, fontSize: 22, fontWeight: "700" },
  deniedText: { color: warna.teksRedup, fontSize: 15, lineHeight: 24, textAlign: "center" },
  deniedBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: warna.utama },
  deniedBtnText: { color: warna.utamaTeks, fontWeight: "700" },
});
