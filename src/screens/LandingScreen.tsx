import { EmptyState, DatePickerModal, HomestayCard, LoadingSkeletonCard } from "@/components";
import { tokenStorage } from "@/service/auth/tokenStorage";
import { bookingService } from "@/service/booking/bookingService";
import { fetchReviewSummary, publicHomestayService } from "@/service/homestay/publicHomestayService";
import { districtService, type District } from "@/service/location/districtService";
import { provinceService, type Province } from "@/service/location/provinceService";
import type { Booking, Homestay } from "@/types";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Linking,
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


export default function LandingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Location filters
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [picker, setPicker] = useState<"province" | "district" | null>(null);

  // Date filters
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [activePicker, setActivePicker] = useState<"checkIn" | "checkOut" | null>(null);

  // Search
  const [searchText, setSearchText] = useState("");
  const [myBookings, setMyBookings] = useState<Booking[]>([]);

  const checkInStr = checkInDate ? checkInDate.toISOString().split("T")[0] : null;
  const checkOutStr = checkOutDate ? checkOutDate.toISOString().split("T")[0] : null;

  const handleLoginPress = useCallback(() => navigation.navigate("Login"), [navigation]);
  const handleRegisterPress = useCallback(() => navigation.navigate("Register"), [navigation]);

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
      setHomestays(sorted);
    } catch (e) {

      showToast("Không thể tải danh sách homestay", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHomestays();
    provinceService.getAllProvinces().then(setProvinces);
    districtService.getAllDistricts().then(setAllDistricts);
    tokenStorage.getToken().then((t) => {
      if (t) {
        bookingService.getMyBookings().then(setMyBookings).catch(() => { });
      }
    });
  }, [loadHomestays]);

  useEffect(() => {
    setSelectedDistrict("");
    if (!selectedProvince) {
      setFilteredDistricts([]);
    } else {
      setFilteredDistricts(allDistricts.filter((d) => d.provinceName === selectedProvince));
    }
  }, [selectedProvince, allDistricts]);

  const filteredHomestays = useMemo(() => {
    const district = allDistricts.find((d) => d.id === selectedDistrict);
    let result = homestays.filter((h) => {
      const matchProvince =
        !selectedProvince ||
        (h.provinceName || "").toLowerCase() === selectedProvince.toLowerCase();
      const matchDistrict =
        !district ||
        (h.districtName || "").toLowerCase() === district.name.toLowerCase();
      return matchProvince && matchDistrict;
    });

    // Đồng bộ FE web: chỉ ẩn khi không có location filter
    const hasLocationFilter = !!(selectedProvince || selectedDistrict);
    if (checkInStr && checkOutStr && !hasLocationFilter) {
      const selIn = new Date(checkInStr);
      const selOut = new Date(checkOutStr);
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
    return result;
  }, [homestays, selectedProvince, selectedDistrict, allDistricts, checkInStr, checkOutStr, myBookings, searchText]);

  const hasFilter = !!(selectedProvince || selectedDistrict || searchText || checkInDate);

  const clearFilters = () => {
    setSearchText("");
    setSelectedProvince("");
    setSelectedDistrict("");
    setCheckInDate(null);
    setCheckOutDate(null);
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadHomestays();
  }, [loadHomestays]);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  const addDays = (d: Date, days: number) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd;
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        key="landing-2col"
        data={filteredHomestays}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          <>
            {/* Hero Section */}
            <LinearGradient
              colors={["#1e3a8a", "#0369a1", "#0891b2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.hero, { paddingTop: insets.top + 12 }]}
            >
              <View style={styles.blob1} />
              <View style={styles.blob2} />

              <View style={styles.logoRow}>
                <View style={styles.logoIcon}>
                  <MaterialCommunityIcons name="waves" size={20} color="#fff" />
                </View>
                <View>
                  <Text style={styles.logoName}>CHMS</Text>
                  <Text style={styles.logoSub}>Coastal Homestays</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>Khám Phá Kỳ Nghỉ{"\n"}Ven Biển</Text>
              <Text style={styles.heroSub}>Hàng ngàn homestay đẹp nhất — đặt phòng ngay</Text>
              <View style={styles.ctaRow}>
                <TouchableOpacity style={styles.ctaSecondary} onPress={handleLoginPress} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="login" size={16} color="#fff" />
                  <Text style={styles.ctaSecondaryText}>Đăng Nhập</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctaPrimary} onPress={handleRegisterPress} activeOpacity={0.85}>
                  <LinearGradient colors={["#10b981", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGrad}>
                    <MaterialCommunityIcons name="star-plus-outline" size={16} color="#fff" />
                    <Text style={styles.ctaPrimaryText}>Đăng Ký Ngay</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Search & Filter Card */}
            <View style={styles.filterCard}>
              {/* Search */}
              <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={20} color="#64748b" />
                <TextInput
                  placeholder="Tìm theo tên, địa điểm..."
                  placeholderTextColor="#94a3b8"
                  value={searchText}
                  onChangeText={setSearchText}
                  style={styles.searchInput}
                />
                {searchText ? (
                  <TouchableOpacity onPress={() => setSearchText("")}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Province + District */}
              <View style={styles.locationRow}>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setPicker("province")}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={selectedProvince ? "#0891b2" : "#64748b"} />
                  <Text style={[styles.selectText, selectedProvince && styles.selectTextActive]} numberOfLines={1}>
                    {selectedProvince || "Tỉnh/Thành"}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectBtn, !selectedProvince && styles.selectDisabled]}
                  disabled={!selectedProvince}
                  onPress={() => selectedProvince && setPicker("district")}
                >
                  <MaterialCommunityIcons name="map-outline" size={16} color={selectedDistrict ? "#0891b2" : "#64748b"} />
                  <Text style={[styles.selectText, selectedDistrict && styles.selectTextActive]} numberOfLines={1}>
                    {allDistricts.find((d) => d.id === selectedDistrict)?.name || "Quận/Huyện"}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Date pickers */}
              <View style={styles.dateRow}>
                <TouchableOpacity style={[styles.dateBtn, checkInDate && styles.dateBtnActive]} onPress={() => setActivePicker("checkIn")}>
                  <MaterialCommunityIcons name="calendar-arrow-right" size={16} color={checkInDate ? "#0891b2" : "#94a3b8"} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateBtnLabel}>Nhận phòng</Text>
                    <Text style={[styles.dateBtnValue, checkInDate && styles.dateBtnValueActive]}>
                      {checkInDate ? formatDate(checkInDate) : "Chọn ngày"}
                    </Text>
                  </View>
                  {checkInDate && (
                    <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); setCheckInDate(null); setCheckOutDate(null); }}>
                      <MaterialCommunityIcons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                <View style={styles.dateSep}>
                  <MaterialCommunityIcons name="arrow-right" size={14} color="#94a3b8" />
                </View>
                <TouchableOpacity style={[styles.dateBtn, checkOutDate && styles.dateBtnActive]} onPress={() => setActivePicker("checkOut")}>
                  <MaterialCommunityIcons name="calendar-arrow-left" size={16} color={checkOutDate ? "#0891b2" : "#94a3b8"} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateBtnLabel}>Trả phòng</Text>
                    <Text style={[styles.dateBtnValue, checkOutDate && styles.dateBtnValueActive]}>
                      {checkOutDate ? formatDate(checkOutDate) : "Chọn ngày"}
                    </Text>
                  </View>
                  {checkOutDate && (
                    <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); setCheckOutDate(null); }}>
                      <MaterialCommunityIcons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              {hasFilter && (
                <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                  <MaterialCommunityIcons name="filter-remove-outline" size={16} color="#ef4444" />
                  <Text style={styles.clearBtnText}>Xóa bộ lọc</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Results Header - show count */}
            <View style={styles.resultHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>
                  {hasFilter ? "Kết Quả Tìm Kiếm" : "Khám Phá Homestay"}
                </Text>
                {checkInDate && checkOutDate && (
                  <Text style={styles.resultDateRange}>
                    {formatDate(checkInDate)} – {formatDate(checkOutDate)}
                  </Text>
                )}
              </View>
              <View style={styles.resultCountBadge}>
                <Text style={styles.resultCount}>{filteredHomestays.length} kết quả</Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="home-search-outline"
              title="Không có homestay"
              description={hasFilter ? "Thử bỏ bớt bộ lọc" : "Vui lòng kiểm tra lại"}
              action={hasFilter ? { label: "Xóa bộ lọc", onPress: clearFilters } : undefined}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <HomestayCard
            id={item.id}
            name={item.name}
            image={item.images?.[0]}
            price={item.pricePerNight}
            rating={item.averageRating}
            reviewCount={item.reviewCount}
            location={
              item.districtName && item.provinceName
                ? `${item.districtName}, ${item.provinceName}`
                : item.address
            }
            onPress={() => navigation.navigate("HomestayDetail", { id: item.id, homestay: item })}
            onWishlistPress={() => {
              showToast("Đăng nhập để lưu yêu thích", "info");
              navigation.navigate("Login");
            }}
            isFavorite={false}
            compact
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={() =>
          loading ? (
            <View style={styles.skeletonWrap}>
              {[...Array(4)].map((_, i) => <LoadingSkeletonCard key={i} compact />)}
            </View>
          ) : (
            <View style={styles.footerSection}>
              {/* Contact info */}
              <View style={styles.footerContact}>
                <TouchableOpacity style={styles.footerContactItem} onPress={() => Linking.openURL("tel:+84123456789")}>
                  <MaterialCommunityIcons name="phone" size={14} color="#0891b2" />
                  <Text style={styles.footerContactText}>+84 123 456 789</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerContactItem} onPress={() => Linking.openURL("mailto:support@chms.vn")}>
                  <MaterialCommunityIcons name="email" size={14} color="#0891b2" />
                  <Text style={styles.footerContactText}>support@chms.vn</Text>
                </TouchableOpacity>
                <View style={styles.footerContactItem}>
                  <MaterialCommunityIcons name="map-marker" size={14} color="#0891b2" />
                  <Text style={styles.footerContactText}>FPT University, Hồ Chí Minh</Text>
                </View>
              </View>

              {/* Social */}
              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL("https://facebook.com")}>
                  <MaterialCommunityIcons name="facebook" size={20} color="#1877f2" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL("https://instagram.com")}>
                  <MaterialCommunityIcons name="instagram" size={20} color="#e1306c" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL("https://twitter.com")}>
                  <MaterialCommunityIcons name="twitter" size={20} color="#1da1f2" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL("https://youtube.com")}>
                  <MaterialCommunityIcons name="youtube" size={20} color="#ff0000" />
                </TouchableOpacity>
              </View>

              <View style={styles.footerDivider} />
              <Text style={styles.footerCopy}>© 2026 CHMS - SP26SE073. All rights reserved.</Text>
              <Text style={styles.footerMade}>Made with ❤️ by FPT University</Text>
            </View>
          )
        }
      />

      {/* Date Picker Modal — chỉ 1 modal tại một thời điểm */}
      <DatePickerModal
        visible={activePicker !== null}
        value={
          activePicker === "checkOut"
            ? (checkOutDate || addDays(checkInDate || new Date(), 1))
            : (checkInDate || new Date())
        }
        minimumDate={
          activePicker === "checkOut"
            ? addDays(checkInDate || new Date(), 1)
            : new Date()
        }
        title={activePicker === "checkIn" ? "Chọn ngày nhận phòng" : "Chọn ngày trả phòng"}
        onConfirm={(date) => {
          if (activePicker === "checkIn") {
            setCheckInDate(date);
            if (checkOutDate && checkOutDate <= date) {
              setCheckOutDate(addDays(date, 1));
            }
          } else {
            setCheckOutDate(date);
          }
          setActivePicker(null);
        }}
        onCancel={() => setActivePicker(null)}
      />

      {/* Province / District Modal */}
      <Modal visible={picker !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPicker(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {picker === "province" ? "Chọn tỉnh/thành" : "Chọn quận/huyện"}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {picker === "province" ? (
                <>
                  <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedProvince(""); setPicker(null); }}>
                    <Text style={styles.modalItemText}>Tất cả tỉnh/thành</Text>
                  </TouchableOpacity>
                  {provinces.map((p) => (
                    <TouchableOpacity key={p.id} style={styles.modalItem} onPress={() => { setSelectedProvince(p.name); setPicker(null); }}>
                      <Text style={[styles.modalItemText, selectedProvince === p.name && styles.modalItemActive]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedDistrict(""); setPicker(null); }}>
                    <Text style={styles.modalItemText}>Tất cả quận/huyện</Text>
                  </TouchableOpacity>
                  {filteredDistricts.map((d) => (
                    <TouchableOpacity key={d.id} style={styles.modalItem} onPress={() => { setSelectedDistrict(d.id); setPicker(null); }}>
                      <Text style={[styles.modalItemText, selectedDistrict === d.id && styles.modalItemActive]}>{d.name}</Text>
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
  listContent: { paddingBottom: 0 },
  columnWrapper: { gap: 10, marginBottom: 10, paddingHorizontal: 12 },

  // Hero
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    overflow: "hidden",
  },
  blob1: {
    position: "absolute", width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.07)", top: -80, right: -60,
  },
  blob2: {
    position: "absolute", width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.05)", bottom: 40, left: -40,
  },

  // Logo
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  logoName: { fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  logoSub: { fontSize: 8, color: "rgba(255,255,255,0.7)", fontWeight: "600" },

  heroTitle: { fontSize: 26, fontWeight: "900", color: "#fff", lineHeight: 33, marginBottom: 8 },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 18, marginBottom: 16 },

  ctaRow: { flexDirection: "row", gap: 10 },
  ctaPrimary: { borderRadius: 12, overflow: "hidden", flex: 1 },
  ctaGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11 },
  ctaPrimaryText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  ctaSecondary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)", paddingVertical: 10, flex: 1,
  },
  ctaSecondaryText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // Filter Card
  filterCard: {
    marginTop: -12, marginBottom: 8,
    backgroundColor: "#fff", borderRadius: 0, padding: 14,
    borderBottomWidth: 1, borderBottomColor: "#e2e8f0",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    gap: 10,
  },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f8fafc", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a" },
  locationRow: { flexDirection: "row", gap: 8 },
  selectBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: "#f8fafc",
  },
  selectDisabled: { opacity: 0.45 },
  selectText: { flex: 1, fontSize: 12, color: "#64748b", fontWeight: "500" },
  selectTextActive: { color: "#0891b2", fontWeight: "700" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, backgroundColor: "#f8fafc",
  },
  dateBtnActive: { borderColor: "#0891b2", backgroundColor: "#e0f2fe" },
  dateBtnLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  dateBtnValue: { fontSize: 13, color: "#64748b", fontWeight: "700", marginTop: 1 },
  dateBtnValueActive: { color: "#0891b2" },
  dateSep: { alignItems: "center" },
  clearBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 8, borderRadius: 8, backgroundColor: "#fef2f2",
    borderWidth: 1, borderColor: "#fecaca",
  },
  clearBtnText: { fontSize: 13, fontWeight: "600", color: "#ef4444" },

  // Result Header
  resultHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f1f5f9",
  },
  resultTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  resultDateRange: { fontSize: 11, color: "#0891b2", fontWeight: "500", marginTop: 2 },
  resultCountBadge: { backgroundColor: "#f1f5f9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  resultCount: { fontSize: 12, fontWeight: "600", color: "#64748b" },

  // Skeleton
  skeletonWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 10 },

  // Footer
  footerSection: {
    backgroundColor: "#0f172a", paddingHorizontal: 16, paddingTop: 28, paddingBottom: 24,
  },
  footerContact: { gap: 8, marginBottom: 16 },
  footerContactItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerContactText: { fontSize: 12, color: "#94a3b8" },
  socialRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 16 },
  socialBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: "#1e293b", justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#334155",
  },
  footerDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 12 },
  footerCopy: { fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 4 },
  footerMade: { fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 16, maxHeight: "70%",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12, color: "#0f172a" },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  modalItemText: { fontSize: 14, color: "#1e293b", fontWeight: "500" },
  modalItemActive: { color: "#0891b2", fontWeight: "700" },
});
