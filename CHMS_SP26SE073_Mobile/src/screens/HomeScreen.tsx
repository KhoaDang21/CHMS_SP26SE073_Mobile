import { useEffect, useState, useCallback, useMemo } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { Homestay } from "@/types";
import { publicHomestayService } from "@/service/homestay/publicHomestayService";
import {
  HomestayCard,
  LoadingSkeletonCard,
  EmptyState,
  Header,
  SectionTitle,
} from "@/components";
import { showToast } from "@/utils/toast";
import { logger } from "@/utils/logger";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [checkInDate, setCheckInDate] = useState(new Date());
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);

  // Initialize favorites from wishlist (if needed)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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
  }, [loadHomestays]);

  // Filter homestays based on search
  const filteredHomestays = useMemo(() => {
    if (!searchText) return homestays;

    const query = searchText.toLowerCase();
    return homestays.filter(
      (h) =>
        h.name.toLowerCase().includes(query) ||
        h.address.toLowerCase().includes(query) ||
        h.provinceName?.toLowerCase().includes(query)
    );
  }, [homestays, searchText]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadHomestays();
  }, [loadHomestays]);

  const handleCheckInDate = (event: any, date?: Date) => {
    setShowCheckInPicker(false);
    if (date) setCheckInDate(date);
  };

  const handleCheckOutDate = (event: any, date?: Date) => {
    setShowCheckOutPicker(false);
    if (date) {
      if (date <= checkInDate) {
        showToast("Ngày trả phòng phải sau ngày nhận phòng", "warning");
        return;
      }
      setCheckOutDate(date);
    }
  };

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  const handleHomestayPress = useCallback(
    (id: string) => {
      navigation.navigate("HomestayDetail", { id });
    },
    [navigation]
  );

  const handleWishlistToggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        showToast("Đã xóa khỏi yêu thích", "info");
      } else {
        newSet.add(id);
        showToast("Đã thêm yêu thích", "success");
      }
      return newSet;
    });
  }, []);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Header title="CHMS" />

      <FlatList
        data={loading ? Array(4).fill(null) : filteredHomestays}
        keyExtractor={(item, index) =>
          loading ? `skeleton-${index}` : item?.id || `homestay-${index}`
        }
        renderItem={({ item, index }) => {
          if (loading) {
            return <LoadingSkeletonCard />;
          }

          return (
            <HomestayCard
              id={item!.id}
              name={item!.name}
              image={item!.images?.[0]}
              price={item!.pricePerNight}
              rating={item!.averageRating}
              reviewCount={item!.reviewCount}
              onPress={() => handleHomestayPress(item!.id)}
              onWishlistPress={() => handleWishlistToggle(item!.id)}
              isFavorite={favorites.has(item!.id)}
            />
          );
        }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>
                Chào mừng đến CHMS Mobile
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Tìm kiếm những căn nhà tuyệt vời để lưu trú
              </Text>
            </View>

            {/* Search Box */}
            <View style={styles.searchBoxContainer}>
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color="#64748b"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm..."
                placeholderTextColor="#cbd5e1"
                value={searchText}
                onChangeText={handleSearch}
              />
              {searchText ? (
                <TouchableOpacity onPress={() => handleSearch("")}>
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Filter Section */}
            <View style={styles.filterSection}>
              <TouchableOpacity
                style={styles.filterTag}
                onPress={() => setShowCheckInPicker(true)}
              >
                <MaterialCommunityIcons
                  name="calendar"
                  size={16}
                  color="#0891b2"
                />
                <Text style={styles.filterTagText}>
                  {checkInDate.toLocaleDateString("vi-VN")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterTag}
                onPress={() => setShowCheckOutPicker(true)}
              >
                <MaterialCommunityIcons
                  name="calendar"
                  size={16}
                  color="#0891b2"
                />
                <Text style={styles.filterTagText}>
                  {checkOutDate.toLocaleDateString("vi-VN")}
                </Text>
              </TouchableOpacity>

              {/* Date Pickers */}
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
                  minimumDate={
                    new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000)
                  }
                />
              )}
            </View>

            {/* Results Count or Info */}
            <View style={styles.infoSection}>
              <MaterialCommunityIcons
                name="information-outline"
                size={16}
                color="#1e40af"
              />
              <Text style={styles.infoText}>
                Tìm thấy {filteredHomestays.length} căn nhà
              </Text>
            </View>

            {/* Features Section */}
            <SectionTitle
              title="Nổi bật"
              subtitle="Những địa điểm phổ biến nhất"
            />
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="home-outline"
              title="Không tìm thấy kết quả"
              description="Thử tìm kiếm với từ khóa khác"
              action={{
                label: "Xóa bộ lọc",
                onPress: () => handleSearch(""),
              }}
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0891b2"
          />
        }
        scrollIndicatorInsets={{ right: 1 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  listHeader: {
    marginBottom: 20,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  searchBoxContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1e293b",
    paddingVertical: 10,
  },
  filterSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  filterTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  filterTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0891b2",
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#dbeafe",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: "#1e40af",
    fontWeight: "500",
  },
});
