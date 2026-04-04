import { EmptyState, Header, LoadingIndicator } from "@/components";
import { wishlistService } from "@/service/wishlist/wishlistService";
import type { Homestay } from "@/types";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

function sortByRating(list: Homestay[]): Homestay[] {
  // Data is already enriched by wishlistService.getMyWishlist()
  // Just sort by rating and review count
  return [...list].sort((a, b) => {
    const avgA = a.averageRating ?? 0;
    const avgB = b.averageRating ?? 0;
    if (avgB !== avgA) return avgB - avgA;
    return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  });
}

export default function WishlistScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadWishlist = useCallback(async () => {
    try {
      const raw = await wishlistService.getMyWishlist();

      if (!raw || raw.length === 0) {
        setItems([]);
      } else {
        const sorted = sortByRating(raw);
        setItems(sorted);
      }
    } catch (error) {
      showToast("Không thể tải danh sách yêu thích", "error");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadWishlist();
    }, [loadWishlist]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadWishlist();
  }, [loadWishlist]);

  const handleRemove = useCallback(async (id: string) => {
    setRemovingId(id);
    try {
      await wishlistService.remove(id);
      setItems((prev) => prev.filter((h) => h.id !== id));
      showToast("Đã xóa khỏi yêu thích", "info");
    } catch (error) {
      showToast("Không thể xóa", "error");
    } finally {
      setRemovingId(null);
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Yêu Thích" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: Homestay }) => {
    const isRemoving = removingId === item.id;

    if (!item) {
      return null;
    }

    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate("HomestayDetail", { id: item.id, homestay: item })}
        android_ripple={{ color: "rgba(0,0,0,0.06)" }}
      >
        {/* Image */}
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: item.images?.[0] || "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600" }}
            style={styles.image}
            resizeMode="cover"
          />
          {/* Gradient overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.55)"]}
            style={styles.imageGradient}
          />
          {/* Remove button — dùng TouchableOpacity riêng, không lồng trong Pressable */}
          <TouchableOpacity
            style={[styles.heartBtn, isRemoving && { opacity: 0.5 }]}
            onPress={(e) => {
              e.stopPropagation?.();
              handleRemove(item.id);
            }}
            disabled={isRemoving}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="heart" size={18} color="#ef4444" />
          </TouchableOpacity>
          {/* Rating badge */}
          {(item.averageRating ?? 0) > 0 && (
            <View style={styles.ratingBadge}>
              <MaterialCommunityIcons name="star" size={11} color="#fbbf24" />
              <Text style={styles.ratingText}>{(item.averageRating ?? 0).toFixed(1)}</Text>
              {(item.reviewCount ?? 0) > 0 && (
                <Text style={styles.reviewCountText}>({item.reviewCount})</Text>
              )}
            </View>
          )}
          {/* Price badge */}
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>₫{item.pricePerNight.toLocaleString("vi-VN")}</Text>
            <Text style={styles.priceUnit}>/đêm</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={12} color="#64748b" />
            <Text style={styles.locationText} numberOfLines={1}>
              {[item.districtName, item.provinceName].filter(Boolean).join(", ") || item.address}
            </Text>
          </View>
          {/* Features row */}
          <View style={styles.featuresRow}>
            {!!item.bedrooms && (
              <View style={styles.featureChip}>
                <MaterialCommunityIcons name="bed-outline" size={11} color="#0891b2" />
                <Text style={styles.featureText}>{item.bedrooms}</Text>
              </View>
            )}
            {!!item.bathrooms && (
              <View style={styles.featureChip}>
                <MaterialCommunityIcons name="shower" size={11} color="#0891b2" />
                <Text style={styles.featureText}>{item.bathrooms}</Text>
              </View>
            )}
            {!!item.maxGuests && (
              <View style={styles.featureChip}>
                <MaterialCommunityIcons name="account-group-outline" size={11} color="#0891b2" />
                <Text style={styles.featureText}>{item.maxGuests}</Text>
              </View>
            )}
          </View>
          {/* Book button */}
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => navigation.navigate("HomestayDetail", { id: item.id, homestay: item })}
            activeOpacity={0.85}
          >
            <Text style={styles.bookBtnText}>Xem chi tiết</Text>
            <MaterialCommunityIcons name="arrow-right" size={13} color="#0891b2" />
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Yêu Thích" />
      <FlatList
        data={items}
        keyExtractor={(h) => h.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                {items.length} homestay · sắp xếp theo đánh giá
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="Chưa có yêu thích"
            description="Lưu những homestay bạn thích để xem lại sau"
            action={{ label: "Khám phá ngay", onPress: () => navigation.navigate("Home") }}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0891b2" />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  listHeader: { paddingVertical: 14 },
  listHeaderText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  columnWrapper: { gap: 12, marginBottom: 12 },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrap: { width: "100%", height: 140, position: "relative", borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  imageGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 70 },

  heartBtn: {
    position: "absolute", top: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 2,
  },
  ratingBadge: {
    position: "absolute", top: 8, left: 8,
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10,
  },
  ratingText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  reviewCountText: { fontSize: 10, color: "rgba(255,255,255,0.75)" },
  priceBadge: {
    position: "absolute", bottom: 8, left: 8,
    flexDirection: "row", alignItems: "baseline", gap: 2,
  },
  priceText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  priceUnit: { fontSize: 10, color: "rgba(255,255,255,0.8)" },

  cardContent: { padding: 10 },
  cardName: { fontSize: 13, fontWeight: "700", color: "#0f172a", marginBottom: 4, lineHeight: 18 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 8 },
  locationText: { fontSize: 11, color: "#64748b", flex: 1 },
  featuresRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  featureChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#e0f2fe", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  featureText: { fontSize: 10, color: "#0891b2", fontWeight: "600" },

  bookBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    marginTop: 8, paddingVertical: 7, borderRadius: 8,
    backgroundColor: "#e0f2fe", borderWidth: 1, borderColor: "#bae6fd",
  },
  bookBtnText: { fontSize: 11, fontWeight: "700", color: "#0891b2" },
});
