import {
  EmptyState,
  HomestayCard,
  LoadingSkeletonCard,
  SectionTitle,
} from "@/components";
import { tokenStorage } from "@/service/auth/tokenStorage";
import { bookingService } from "@/service/booking/bookingService";
import {
  fetchReviewSummary,
  publicHomestayService,
} from "@/service/homestay/publicHomestayService";
import { districtService, type District } from "@/service/location/districtService";
import { provinceService, type Province } from "@/service/location/provinceService";
import { wishlistService } from "@/service/wishlist/wishlistService";
import type { Booking, Homestay } from "@/types";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [allHomestays, setAllHomestays] = useState<Homestay[]>([]);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [checkInDate, setCheckInDate] = useState(new Date());
  const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86400000));
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [userName, setUserName] = useState("");

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [picker, setPicker] = useState<"province" | "district" | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);

  const checkInStr = checkInDate.toISOString().split("T")[0];
  const checkOutStr = checkOutDate.toISOString().split("T")[0];

  const loadHomestays = useCallback(async () => {
    try {
      const items = await publicHomestayService.list({ page: 1, pageSize: 100 });
      const summaries = await Promise.allSettled(items.map((h) => fetchReviewSummary(h.id)));
      const sorted = [...items].sort((a, b) => {
        const ia = items.indexOf(a);
        const ib = items.indexOf(b);
        const sa = summaries[ia];
        const sb = summaries[ib];
        const avgA = sa.status === "fulfilled" ? sa.value.avg : 0;
        const avgB = sb.status === "fulfilled" ? sb.value.avg : 0;
        const cntA = sa.status === "fulfilled" ? sa.value.count : 0;
        const cntB = sb.status === "fulfilled" ? sb.value.count : 0;
        if (avgB !== avgA) return avgB - avgA;
        return cntB - cntA;
      });
      setAllHomestays(sorted);
    } catch (error) {
      showToast("Lỗi tải dữ liệu", "error");
      logger.error("Failed to load homestays", error);
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
    tokenStorage.getUser().then((u) => {
      if (u?.name) setUserName(u.name.split(" ").pop() || "");
    });
    tokenStorage.getToken().then((t) => {
      if (t) {
        bookingService.getMyBookings().then(setMyBookings).catch(() => {});
        wishlistService
          .getMyWishlist()
          .then((list) => setWishlistIds(new Set(list.map((h) => h.id))))
          .catch(() => {});
      } else {
        setMyBookings([]);
        setWishlistIds(new Set());
      }
    });
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

  const bookedHomestayIds = useMemo(() => {
    const selIn = new Date(checkInStr);
    const selOut = new Date(checkOutStr);
    const blocked = new Set<string>();
    myBookings.forEach((b) => {
      if (b.status === "CANCELLED" || b.status === "REJECTED") return;
      if (selIn < new Date(b.checkOut) && selOut > new Date(b.checkIn)) {
        blocked.add(b.homestayId);
      }
    });
    return blocked;
  }, [checkInStr, checkOutStr, myBookings]);

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

    const selIn = new Date(checkInStr);
    const selOut = new Date(checkOutStr);
    const hasLocationFilter = !!(selectedProvince || selectedDistrict);
    if (!hasLocationFilter && myBookings.length) {
      result = result.filter(
        (h) =>
          !myBookings.some((b) => {
            if (b.status === "CANCELLED" || b.status === "REJECTED") return false;
            if (b.homestayId !== h.id) return false;
            return selIn < new Date(b.checkOut) && selOut > new Date(b.checkIn);
          }),
      );
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
    allHomestays,
    selectedProvince,
    selectedDistrict,
    allDistricts,
    checkInStr,
    checkOutStr,
    myBookings,
    searchText,
  ]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadHomestays();
    tokenStorage.getToken().then((t) => {
      if (t) {
        bookingService.getMyBookings().then(setMyBookings).catch(() => {});
        wishlistService
          .getMyWishlist()
          .then((list) => setWishlistIds(new Set(list.map((h) => h.id))))
          .catch(() => {});
      }
    });
  }, [loadHomestays]);

  const handleCheckInDate = (_: unknown, date?: Date) => {
    setShowCheckInPicker(false);
    if (date) setCheckInDate(date);
  };

  const handleCheckOutDate = (_: unknown, date?: Date) => {
    setShowCheckOutPicker(false);
    if (date) {
      if (date <= checkInDate) {
        showToast("Ngày trả phòng phải sau ngày nhận phòng", "warning");
        return;
      }
      setCheckOutDate(date);
    }
  };

  const handleWishlistToggle = useCallback(
    async (hid: string) => {
      const isWishlisted = wishlistIds.has(hid);
      setWishlistIds((prev) => {
        const next = new Set(prev);
        isWishlisted ? next.delete(hid) : next.add(hid);
        return next;
      });
      try {
        if (isWishlisted) {
          await wishlistService.remove(hid);
          showToast("Đã xóa khỏi yêu thích", "info");
        } else {
          await wishlistService.add(hid);
          showToast("Đã thêm vào yêu thích", "success");
        }
      } catch {
        setWishlistIds((prev) => {
          const next = new Set(prev);
          isWishlisted ? next.add(hid) : next.delete(hid);
          return next;
        });
        showToast("Không thể cập nhật yêu thích", "error");
      }
    },
    [wishlistIds],
  );

  const formatDate = (d: Date) =>
    d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

  const filteredHomestays = homestays;

  const clearFilters = () => {
    setSearchText("");
    setSelectedProvince("");
    setSelectedDistrict("");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={loading ? Array(4).fill(null) : filteredHomestays}
        keyExtractor={(item, index) =>
          loading ? `skeleton-${index}` : item?.id || `homestay-${index}`
        }
        renderItem={({ item }) => {
          if (loading) return <LoadingSkeletonCard />;
          const booked = bookedHomestayIds.has(item!.id);
          return (
            <View>
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
                onPress={() => navigation.navigate("HomestayDetail", { id: item!.id })}
                onWishlistPress={() => handleWishlistToggle(item!.id)}
                isFavorite={wishlistIds.has(item!.id)}
              />
              {booked ? (
                <View style={styles.bookedPill}>
                  <Text style={styles.bookedPillText}>Bạn đã có đặt phòng trong khoảng ngày này</Text>
                </View>
              ) : null}
            </View>
          );
        }}
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={["#1d4ed8", "#0891b2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBanner}
            >
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroGreeting}>
                    {userName ? `Xin chào, ${userName} 👋` : "Xin chào 👋"}
                  </Text>
                  <Text style={styles.heroTitle}>Tìm homestay</Text>
                  <Text style={styles.heroTitle}>hoàn hảo cho bạn</Text>
                </View>
                <View style={styles.heroIcon}>
                  <MaterialCommunityIcons name="waves" size={32} color="rgba(255,255,255,0.8)" />
                </View>
              </View>

              <View style={styles.filterRow}>
                <TouchableOpacity style={styles.filterChip} onPress={() => setPicker("province")}>
                  <MaterialCommunityIcons name="map-marker" size={16} color="#fff" />
                  <Text style={styles.filterChipText} numberOfLines={1}>
                    {selectedProvince || "Tất cả tỉnh"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, !selectedProvince && styles.filterChipDisabled]}
                  disabled={!selectedProvince}
                  onPress={() => selectedProvince && setPicker("district")}
                >
                  <MaterialCommunityIcons name="map-outline" size={16} color="#fff" />
                  <Text style={styles.filterChipText} numberOfLines={1}>
                    {allDistricts.find((d) => d.id === selectedDistrict)?.name || "Quận/huyện"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={20} color="#64748b" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm theo tên, địa điểm..."
                  placeholderTextColor="#94a3b8"
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {searchText ? (
                  <TouchableOpacity onPress={() => setSearchText("")}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.dateRow}>
                <TouchableOpacity style={styles.dateChip} onPress={() => setShowCheckInPicker(true)}>
                  <MaterialCommunityIcons name="calendar-arrow-right" size={16} color="#fff" />
                  <View>
                    <Text style={styles.dateChipLabel}>Nhận phòng</Text>
                    <Text style={styles.dateChipValue}>{formatDate(checkInDate)}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.dateSeparator}>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="rgba(255,255,255,0.6)" />
                </View>

                <TouchableOpacity style={styles.dateChip} onPress={() => setShowCheckOutPicker(true)}>
                  <MaterialCommunityIcons name="calendar-arrow-left" size={16} color="#fff" />
                  <View>
                    <Text style={styles.dateChipLabel}>Trả phòng</Text>
                    <Text style={styles.dateChipValue}>{formatDate(checkOutDate)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <View style={styles.resultsRow}>
              <Text style={styles.resultsText}>
                {filteredHomestays.length} homestay
                {searchText || selectedProvince || selectedDistrict ? " (đã lọc)" : " nổi bật"}
              </Text>
              {(searchText || selectedProvince || selectedDistrict) ? (
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={styles.clearText}>Xóa bộ lọc</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <SectionTitle title="Homestay nổi bật" subtitle="Ưu tiên đánh giá cao (giống trang web)" />
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="home-search-outline"
              title="Không tìm thấy kết quả"
              description="Thử bỏ bớt bộ lọc hoặc từ khóa"
              action={{ label: "Xóa bộ lọc", onPress: clearFilters }}
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0891b2" />
        }
      />

      {showCheckInPicker && (
        <DateTimePicker
          value={checkInDate}
          mode="date"
          display="spinner"
          onChange={handleCheckInDate}
          minimumDate={new Date()}
        />
      )}
      {showCheckOutPicker && (
        <DateTimePicker
          value={checkOutDate}
          mode="date"
          display="spinner"
          onChange={handleCheckOutDate}
          minimumDate={new Date(checkInDate.getTime() + 86400000)}
        />
      )}

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
  listContent: { paddingBottom: 24 },
  heroBanner: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  heroGreeting: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", lineHeight: 28 },
  heroIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  filterChip: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12,
  },
  filterChipDisabled: { opacity: 0.45 },
  filterChipText: { flex: 1, color: "#fff", fontSize: 12, fontWeight: "600" },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1e293b" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateChip: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  dateChipLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  dateChipValue: { fontSize: 13, fontWeight: "700", color: "#fff" },
  dateSeparator: { alignItems: "center" },
  resultsRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
  },
  resultsText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  clearText: { fontSize: 13, color: "#0891b2", fontWeight: "600" },
  bookedPill: {
    marginHorizontal: 16, marginTop: -8, marginBottom: 8,
    backgroundColor: "#fef3c7", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
    alignSelf: "flex-start",
  },
  bookedPillText: { fontSize: 11, color: "#92400e", fontWeight: "600" },
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
