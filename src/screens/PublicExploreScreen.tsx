import {
  EmptyState,
  HomestayCard,
  LoadingSkeletonCard,
  SectionTitle,
} from "@/components";
import {
  fetchReviewSummary,
  publicHomestayService,
} from "@/service/homestay/publicHomestayService";
import { districtService, type District } from "@/service/location/districtService";
import { provinceService, type Province } from "@/service/location/provinceService";
import type { Homestay } from "@/types";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function PublicExploreScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [picker, setPicker] = useState<"province" | "district" | null>(null);

  const [allHomestays, setAllHomestays] = useState<Homestay[]>([]);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const loadHomestays = useCallback(async () => {
    try {
      const items = await publicHomestayService.list({ page: 1, pageSize: 100 });
      const summaries = await Promise.allSettled(items.map((h) => fetchReviewSummary(h.id)));
      const withRatings = items.map((h, i) => {
        const s = summaries[i];
        return {
          ...h,
          averageRating: s.status === "fulfilled" && s.value.count > 0 ? s.value.avg : h.averageRating,
          reviewCount: s.status === "fulfilled" ? s.value.count : h.reviewCount ?? 0,
        };
      });
      const sorted = [...withRatings].sort((a, b) => {
        const avgA = a.averageRating ?? 0;
        const avgB = b.averageRating ?? 0;
        const cntA = a.reviewCount ?? 0;
        const cntB = b.reviewCount ?? 0;
        if (avgB !== avgA) return avgB - avgA;
        return cntB - cntA;
      });
      setAllHomestays(sorted);
      setHomestays(sorted);
    } catch (e) {

      showToast("Không thể tải danh sách homestay", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    provinceService.getAllProvinces().then(setProvinces);
    districtService.getAllDistricts().then(setAllDistricts);
  }, []);

  useEffect(() => {
    loadHomestays();
  }, [loadHomestays]);

  useEffect(() => {
    setSelectedDistrict("");
    if (!selectedProvince) {
      setFilteredDistricts([]);
    } else {
      setFilteredDistricts(
        allDistricts.filter((d) => d.provinceName === selectedProvince),
      );
    }
  }, [selectedProvince, allDistricts]);

  useEffect(() => {
    const district = allDistricts.find((d) => d.id === selectedDistrict);
    let result = allHomestays.filter((h) => {
      const matchProvince =
        !selectedProvince ||
        (h.provinceName || "").toLowerCase() === selectedProvince.toLowerCase();
      const matchDistrict =
        !district ||
        (h.districtName || "").toLowerCase() === district.name.toLowerCase();
      return matchProvince && matchDistrict;
    });

    if (checkInDate && checkOutDate) {
      const selIn = new Date(checkInDate);
      const selOut = new Date(checkOutDate);
      const hasLocation = !!(selectedProvince || selectedDistrict);
      if (!hasLocation) {
        result = result.filter(() => true);
      }
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q) ||
          (h.provinceName || "").toLowerCase().includes(q),
      );
    }

    setHomestays(result);
  }, [
    selectedProvince,
    selectedDistrict,
    checkInDate,
    checkOutDate,
    allHomestays,
    allDistricts,
    searchText,
  ]);

  const addDays = (dateStr: string, days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const displayHomestays = homestays;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#1d4ed8", "#0891b2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.heroTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Khám phá homestay</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.heroSub}>
          Xem trước khi đăng nhập · Đặt phòng sau khi có tài khoản
        </Text>
      </LinearGradient>

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Tỉnh / Thành</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setPicker("province")}>
          <Text style={styles.selectText}>
            {selectedProvince || "Tất cả tỉnh/thành"}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={22} color="#64748b" />
        </TouchableOpacity>

        <Text style={styles.filterLabel}>Quận / Huyện</Text>
        <TouchableOpacity
          style={[styles.selectBtn, !selectedProvince && styles.selectDisabled]}
          disabled={!selectedProvince}
          onPress={() => selectedProvince && setPicker("district")}
        >
          <Text style={styles.selectText}>
            {allDistricts.find((d) => d.id === selectedDistrict)?.name ||
              "Tất cả quận/huyện"}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={22} color="#64748b" />
        </TouchableOpacity>

        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Text style={styles.filterLabel}>Nhận phòng</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              value={checkInDate}
              onChangeText={(t) => {
                setCheckInDate(t);
                if (checkOutDate && t && new Date(checkOutDate) <= new Date(t)) {
                  setCheckOutDate(addDays(t, 1));
                }
              }}
            />
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.filterLabel}>Trả phòng</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              value={checkOutDate}
              onChangeText={(t) => {
                if (checkInDate && t && new Date(t) <= new Date(checkInDate)) {
                  setCheckOutDate(addDays(checkInDate, 1));
                } else {
                  setCheckOutDate(t);
                }
              }}
            />
          </View>
        </View>
        <Text style={styles.hint}>
          Gợi ý: nhập ngày theo định dạng {today} hoặc để trống để xem tất cả.
        </Text>

        <View style={styles.searchRow}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên, địa điểm..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <FlatList
        data={loading ? Array(4).fill(null) : displayHomestays}
        keyExtractor={(item, index) =>
          loading ? `sk-${index}` : item?.id || `h-${index}`
        }
        renderItem={({ item }) => {
          if (loading) return <LoadingSkeletonCard />;
          return (
            <HomestayCard
              id={item!.id}
              name={item!.name}
              image={item!.images?.[0]}
              price={item!.pricePerNight}
              rating={item!.averageRating}
              reviewCount={item!.reviewCount}
              location={
                item!.districtName && item!.provinceName
                  ? `${item!.districtName}, ${item!.provinceName}`
                  : item!.address
              }
              onPress={() => navigation.navigate("HomestayDetail", { id: item!.id, homestay: item })}
              onWishlistPress={() => {
                showToast("Đăng nhập để lưu yêu thích", "info");
                navigation.navigate("Login");
              }}
              isFavorite={false}
              seasonalPricings={item!.seasonalPricings}
            />
          );
        }}
        ListHeaderComponent={
          <SectionTitle
            title={
              selectedProvince || selectedDistrict || searchText
                ? `Kết quả (${displayHomestays.length})`
                : "Homestay nổi bật"
            }
            subtitle="Chạm để xem chi tiết"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="home-search-outline"
              title="Không có homestay phù hợp"
              description="Thử bỏ bớt bộ lọc hoặc từ khóa"
            />
          ) : null
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadHomestays();
            }}
          />
        }
      />

      <View style={styles.loginBar}>
        <Text style={styles.loginBarText}>Đã có tài khoản?</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.loginBarLink}>Đăng nhập</Text>
        </TouchableOpacity>
        <Text style={styles.loginBarText}> · </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.loginBarLink}>Đăng ký</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={picker !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPicker(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {picker === "province" ? "Chọn tỉnh/thành" : "Chọn quận/huyện"}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {picker === "province" ? (
                <>
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedProvince("");
                      setPicker(null);
                    }}
                  >
                    <Text>Tất cả tỉnh/thành</Text>
                  </TouchableOpacity>
                  {provinces.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.modalItem}
                      onPress={() => {
                        setSelectedProvince(p.name);
                        setPicker(null);
                      }}
                    >
                      <Text>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedDistrict("");
                      setPicker(null);
                    }}
                  >
                    <Text>Tất cả quận/huyện</Text>
                  </TouchableOpacity>
                  {filteredDistricts.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={styles.modalItem}
                      onPress={() => {
                        setSelectedDistrict(d.id);
                        setPicker(null);
                      }}
                    >
                      <Text>{d.name}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  hero: { paddingHorizontal: 16, paddingBottom: 16 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center",
  },
  heroTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 8 },
  filterCard: {
    marginHorizontal: 12, marginTop: -8, marginBottom: 8,
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#e2e8f0",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  filterLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 6 },
  selectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 12,
  },
  selectDisabled: { opacity: 0.45 },
  selectText: { fontSize: 14, color: "#0f172a" },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  dateCol: { flex: 1 },
  dateInput: {
    borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 10, fontSize: 13, color: "#0f172a",
  },
  hint: { fontSize: 11, color: "#94a3b8", marginBottom: 10 },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a" },
  list: { paddingHorizontal: 12, paddingBottom: 56 },
  loginBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  loginBarText: { fontSize: 13, color: "#64748b" },
  loginBarLink: { fontSize: 13, fontWeight: "700", color: "#0891b2" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 16, maxHeight: "70%",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12, color: "#0f172a" },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
});
