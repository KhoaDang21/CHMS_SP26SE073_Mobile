import {
  Button,
  Card,
  EmptyState,
  Header,
  LoadingIndicator,
} from "@/components";
import { wishlistService } from "@/service/wishlist/wishlistService";
import type { Homestay } from "@/types";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WishlistScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWishlist = useCallback(async () => {
    try {
      const data = await wishlistService.getMyWishlist();
      setItems(data || []);
    } catch (error) {
      showToast("Không thể tải danh sách yêu thích", "error");
      logger.error("Failed to load wishlist", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadWishlist();
  }, [loadWishlist]);

  const handleRemoveFromWishlist = useCallback(
    async (id: string) => {
      try {
        await wishlistService.remove(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
        showToast("Đã xóa khỏi danh sách yêu thích", "info");
      } catch (error) {
        showToast("Không thể xóa khỏi danh sách", "error");
        logger.error("Failed to remove from wishlist", error);
      }
    },
    []
  );

  const handleHomestayPress = useCallback(
    (id: string) => {
      navigation.navigate("HomestayDetail", { id });
    },
    [navigation]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Danh Sách Yêu Thích" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Danh Sách Yêu Thích" />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card
            style={styles.wishlistCard}
            onPress={() => handleHomestayPress(item.id)}
          >
            {/* Image Container */}
            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri: item.images?.[0] || "https://via.placeholder.com/300x200?text=Homestay",
                }}
                style={styles.image}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleRemoveFromWishlist(item.id);
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="heart"
                  size={20}
                  color="#ef4444"
                />
              </TouchableOpacity>

              {/* Rating Badge */}
              {item.averageRating !== undefined && (
                <View style={styles.ratingBadge}>
                  <MaterialCommunityIcons
                    name="star"
                    size={14}
                    color="#fbbf24"
                  />
                  <Text style={styles.ratingText}>
                    {item.averageRating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.homestayName} numberOfLines={2}>
                {item.name}
              </Text>

              <View style={styles.locationRow}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={14}
                  color="#64748b"
                />
                <Text style={styles.location} numberOfLines={1}>
                  {item.districtName}, {item.provinceName}
                </Text>
              </View>

              {/* Details */}
              <View style={styles.detailsRow}>
                {item.bedrooms && (
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons
                      name="bed-outline"
                      size={14}
                      color="#0891b2"
                    />
                    <Text style={styles.detailText}>{item.bedrooms}</Text>
                  </View>
                )}
                {item.bathrooms && (
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons
                      name="water-outline"
                      size={14}
                      color="#0891b2"
                    />
                    <Text style={styles.detailText}>{item.bathrooms}</Text>
                  </View>
                )}
                {item.maxGuests && (
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons
                      name="account-multiple-outline"
                      size={14}
                      color="#0891b2"
                    />
                    <Text style={styles.detailText}>{item.maxGuests}</Text>
                  </View>
                )}
              </View>

              {/* Price */}
              <View style={styles.footer}>
                <View>
                  <Text style={styles.priceLabel}>Giá</Text>
                  <Text style={styles.price}>
                    ₫{item.pricePerNight.toLocaleString("vi-VN")}
                  </Text>
                </View>
                <Button
                  title="Xem Chi Tiết"
                  size="small"
                  onPress={() => handleHomestayPress(item.id)}
                />
              </View>
            </View>
          </Card>
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.infoText}>
              Bạn có {items.length} căn nhà yêu thích
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="Chưa có yêu thích"
            description="Bắt đầu lưu những căn nhà yêu thích của bạn"
            action={{
              label: "Khám Phá Thêm",
              onPress: () => navigation.navigate("Home"),
            }}
          />
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
    paddingVertical: 16,
  },
  listHeader: {
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  wishlistCard: {
    marginBottom: 16,
    flexDirection: "row",
    overflow: "visible",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  imageContainer: {
    position: "relative",
    width: 120,
    height: 120,
    backgroundColor: "#f1f5f9",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  image: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0f172a",
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "space-between",
  },
  homestayName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  location: {
    fontSize: 12,
    color: "#64748b",
    flex: 1,
  },
  detailsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailText: {
    fontSize: 11,
    color: "#0891b2",
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  priceLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0891b2",
  },
});
