import {
    EmptyState,
    HomestayCard,
    LoadingSkeletonCard,
    SectionTitle,
} from "@/components";
import { tokenStorage } from "@/service/auth/tokenStorage";
import { publicHomestayService } from "@/service/homestay/publicHomestayService";
import { wishlistService } from "@/service/wishlist/wishlistService";
import type { Homestay } from "@/types";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
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

  const loadHomestays = useCallback(async () => {
    try {
      const data = await publicHomestayService.list();
      setHomestays(data || []);
    } catch (error) {
      showToast("Lỗi tải dữ liệu", "error");
      logger.error("Failed to load homestays", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHomestays();
    tokenStorage.getUser().then((u) => { if (u?.name) setUserName(u.name.split(" ").pop() || ""); });
    wishlistService.getMyWishlist().then((list) => {
      setWishlistIds(new Set(list.map((h) => h.id)));
    }).catch(() => {});
  }, [loadHomestays]);

  const filteredHomestays = useMemo(() => {
    if (!searchText) return homestays;
    const q = searchText.toLowerCase();
    return homestays.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.provinceName?.toLowerCase().includes(q)
    );
  }, [homestays, searchText]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadHomestays();
  }, [loadHomestays]);

  const handleCheckInDate = (_: any, date?: Date) => {
    setShowCheckInPicker(false);
    if (date) setCheckInDate(date);
  };

  const handleCheckOutDate = (_: any, date?: Date) => {
    setShowCheckOutPicker(false);
    if (date) {
      if (date <= checkInDate) {
        showToast("Ngày trả phòng phải sau ngày nhận phòng", "warning");
        return;
      }
      setCheckOutDate(date);
    }
  };

  const handleWishlistToggle = useCallback(async (id: string) => {
    const isWishlisted = wishlistIds.has(id);
    setWishlistIds((prev) => {
      const next = new Set(prev);
      isWishlisted ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      if (isWishlisted) {
        await wishlistService.remove(id);
        showToast("Đã xóa khỏi yêu thích", "info");
      } else {
        await wishlistService.add(id);
        showToast("Đã thêm vào yêu thích", "success");
      }
    } catch {
      // revert
      setWishlistIds((prev) => {
        const next = new Set(prev);
        isWishlisted ? next.add(id) : next.delete(id);
        return next;
      });
      showToast("Không thể cập nhật yêu thích", "error");
    }
  }, [wishlistIds]);

  const formatDate = (d: Date) => d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={loading ? Array(4).fill(null) : filteredHomestays}
        keyExtractor={(item, index) =>
          loading ? `skeleton-${index}` : item?.id || `homestay-${index}`
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
              location={item!.districtName && item!.provinceName ? `${item!.districtName}, ${item!.provinceName}` : item!.address}
              onPress={() => navigation.navigate("HomestayDetail", { id: item!.id })}
              onWishlistPress={() => handleWishlistToggle(item!.id)}
              isFavorite={wishlistIds.has(item!.id)}
            />
          );
        }}
        ListHeaderComponent={
          <View>
            {/* Hero Banner */}
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

              {/* Search Box */}
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

              {/* Date Filters */}
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

            {/* Results Info */}
            <View style={styles.resultsRow}>
              <Text style={styles.resultsText}>
                {filteredHomestays.length} homestay{searchText ? ` cho "${searchText}"` : " nổi bật"}
              </Text>
              {searchText ? (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <Text style={styles.clearText}>Xóa bộ lọc</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <SectionTitle
              title="Homestay nổi bật"
              subtitle="Được đánh giá cao nhất"
            />
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="home-search-outline"
              title="Không tìm thấy kết quả"
              description="Thử tìm kiếm với từ khóa khác"
              action={{ label: "Xóa bộ lọc", onPress: () => setSearchText("") }}
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
        <DateTimePicker value={checkInDate} mode="date" display="spinner" onChange={handleCheckInDate} minimumDate={new Date()} />
      )}
      {showCheckOutPicker && (
        <DateTimePicker value={checkOutDate} mode="date" display="spinner" onChange={handleCheckOutDate} minimumDate={new Date(checkInDate.getTime() + 86400000)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  listContent: { paddingBottom: 24 },

  // Hero
  heroBanner: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  heroGreeting: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", lineHeight: 28 },
  heroIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },

  // Search
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1e293b" },

  // Date
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

  // Results
  resultsRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
  },
  resultsText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  clearText: { fontSize: 13, color: "#0891b2", fontWeight: "600" },
});
