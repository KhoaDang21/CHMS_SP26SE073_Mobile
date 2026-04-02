import {
    AlertDialog,
    Button,
    Divider,
    Header,
    Input,
    LoadingIndicator,
} from "@/components";
import { bookingService } from "@/service/booking/bookingService";
import { publicHomestayService } from "@/service/homestay/publicHomestayService";
import { wishlistService } from "@/service/wishlist/wishlistService";
import type { Homestay } from "@/types";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function HomestayDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const id = route.params?.id as string;
  const [item, setItem] = useState<Homestay | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [checkInDate, setCheckInDate] = useState(new Date());
  const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86400000));
  const [guestCount, setGuestCount] = useState(1);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await publicHomestayService.getById(id);
        setItem(data);
      } catch (error) {
        showToast("Không thể tải chi tiết căn nhà", "error");
        logger.error("Failed to load homestay details", error);
      } finally {
        setLoading(false);
      }
    };
    load();
    wishlistService.getMyWishlist().then((list) => {
      setIsFavorite(list.some((h) => h.id === id));
    }).catch(() => {});
  }, [id]);

  const handleWishlistToggle = useCallback(async () => {
    const prev = isFavorite;
    setIsFavorite(!prev);
    try {
      if (prev) {
        await wishlistService.remove(id);
        showToast("Đã xóa khỏi yêu thích", "info");
      } else {
        await wishlistService.add(id);
        showToast("Đã thêm vào yêu thích", "success");
      }
    } catch {
      setIsFavorite(prev);
      showToast("Không thể cập nhật yêu thích", "error");
    }
  }, [id, isFavorite]);

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

  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / 86400000);
  const totalPrice = item ? item.pricePerNight * nights : 0;

  const handleBooking = useCallback(async () => {
    if (!item || !phone) {
      showToast("Vui lòng nhập số điện thoại liên hệ", "warning");
      return;
    }
    try {
      setBooking(true);
      const res = await bookingService.createBooking({
        homestayId: item.id,
        checkIn: checkInDate.toISOString().split("T")[0],
        checkOut: checkOutDate.toISOString().split("T")[0],
        guestsCount: guestCount,
        contactPhone: phone,
      });
      if (res.success) {
        setSuccessMessage(res.message || "Đặt phòng thành công!");
        setSuccessDialogVisible(true);
      } else {
        showToast(res.message || "Không thể đặt phòng", "error");
      }
    } catch (error: any) {
      showToast(error?.message || "Đặt phòng thất bại", "error");
    } finally {
      setBooking(false);
    }
  }, [item, checkInDate, checkOutDate, guestCount, phone]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header showBack title="" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header showBack title="" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Không tìm thấy căn nhà</Text>
        </View>
      </SafeAreaView>
    );
  }

  const images = item.images?.length ? item.images : ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800"];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* Sticky Header */}
        <View style={styles.stickyHeader}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={handleWishlistToggle} activeOpacity={0.7}>
            <MaterialCommunityIcons
              name={isFavorite ? "heart" : "heart-outline"}
              size={22}
              color={isFavorite ? "#ef4444" : "#1e293b"}
            />
          </TouchableOpacity>
        </View>

        {/* Image Gallery */}
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              setActiveImageIndex(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
          >
            {images.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={styles.galleryImage} resizeMode="cover" />
            ))}
          </ScrollView>
          {/* Dots */}
          {images.length > 1 && (
            <View style={styles.dots}>
              {images.map((_, idx) => (
                <View key={idx} style={[styles.dot, idx === activeImageIndex && styles.dotActive]} />
              ))}
            </View>
          )}
          {/* Image count */}
          <View style={styles.imageCount}>
            <MaterialCommunityIcons name="image-multiple" size={14} color="#fff" />
            <Text style={styles.imageCountText}>{activeImageIndex + 1}/{images.length}</Text>
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.infoSection}>
          <Text style={styles.homestayTitle}>{item.name}</Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#0891b2" />
            <Text style={styles.location} numberOfLines={2}>
              {[item.districtName, item.provinceName].filter(Boolean).join(", ") || item.address}
            </Text>
          </View>

          {/* Rating & Price Row */}
          <View style={styles.metaRow}>
            {item.averageRating ? (
              <View style={styles.ratingChip}>
                <MaterialCommunityIcons name="star" size={14} color="#fbbf24" />
                <Text style={styles.ratingValue}>{item.averageRating.toFixed(1)}</Text>
                {item.reviewCount ? <Text style={styles.reviewCount}>({item.reviewCount})</Text> : null}
              </View>
            ) : null}
            <View style={styles.priceChip}>
              <Text style={styles.priceValue}>₫{item.pricePerNight.toLocaleString("vi-VN")}</Text>
              <Text style={styles.priceUnit}>/đêm</Text>
            </View>
          </View>
        </View>

        <Divider />

        {/* Quick Features */}
        <View style={styles.featuresRow}>
          {item.bedrooms ? (
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="bed-outline" size={22} color="#0891b2" />
              <Text style={styles.featureValue}>{item.bedrooms}</Text>
              <Text style={styles.featureLabel}>Phòng ngủ</Text>
            </View>
          ) : null}
          {item.bathrooms ? (
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="shower" size={22} color="#0891b2" />
              <Text style={styles.featureValue}>{item.bathrooms}</Text>
              <Text style={styles.featureLabel}>Phòng tắm</Text>
            </View>
          ) : null}
          {item.maxGuests ? (
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="account-group-outline" size={22} color="#0891b2" />
              <Text style={styles.featureValue}>{item.maxGuests}</Text>
              <Text style={styles.featureLabel}>Khách tối đa</Text>
            </View>
          ) : null}
          {item.amenities?.length ? (
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="check-decagram-outline" size={22} color="#0891b2" />
              <Text style={styles.featureValue}>{item.amenities.length}</Text>
              <Text style={styles.featureLabel}>Tiện ích</Text>
            </View>
          ) : null}
        </View>

        {/* Description */}
        {item.description ? (
          <>
            <Divider />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Giới thiệu</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </>
        ) : null}

        {/* Amenities */}
        {item.amenities?.length ? (
          <>
            <Divider />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tiện ích</Text>
              <View style={styles.amenitiesGrid}>
                {item.amenities.map((a: any, idx: number) => (
                  <View key={idx} style={styles.amenityChip}>
                    <MaterialCommunityIcons name="check-circle-outline" size={14} color="#10b981" />
                    <Text style={styles.amenityText}>{a.name || a}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {/* Booking Section */}
        <Divider />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đặt phòng</Text>

          {/* Date Pickers */}
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowCheckInPicker(true)}>
              <MaterialCommunityIcons name="calendar-arrow-right" size={18} color="#0891b2" />
              <View>
                <Text style={styles.dateBtnLabel}>Nhận phòng</Text>
                <Text style={styles.dateBtnValue}>{checkInDate.toLocaleDateString("vi-VN")}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.dateArrow}>
              <MaterialCommunityIcons name="arrow-right" size={16} color="#94a3b8" />
            </View>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowCheckOutPicker(true)}>
              <MaterialCommunityIcons name="calendar-arrow-left" size={18} color="#0891b2" />
              <View>
                <Text style={styles.dateBtnLabel}>Trả phòng</Text>
                <Text style={styles.dateBtnValue}>{checkOutDate.toLocaleDateString("vi-VN")}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Nights summary */}
          <View style={styles.nightsSummary}>
            <MaterialCommunityIcons name="weather-night" size={16} color="#64748b" />
            <Text style={styles.nightsText}>{nights} đêm</Text>
            <Text style={styles.nightsTotal}>· Tổng: ₫{totalPrice.toLocaleString("vi-VN")}</Text>
          </View>

          {/* Guest Counter */}
          <View style={styles.counterRow}>
            <Text style={styles.counterLabel}>Số khách</Text>
            <View style={styles.counter}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
              >
                <MaterialCommunityIcons name="minus" size={18} color="#0891b2" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{guestCount}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setGuestCount(Math.min(item.maxGuests || 10, guestCount + 1))}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#0891b2" />
              </TouchableOpacity>
            </View>
          </View>

          <Input
            label="Số điện thoại liên hệ"
            placeholder="Nhập số điện thoại"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            icon="phone-outline"
          />

          <Button
            title={booking ? "Đang đặt phòng..." : `Đặt phòng · ₫${totalPrice.toLocaleString("vi-VN")}`}
            onPress={handleBooking}
            loading={booking}
            disabled={booking}
            size="large"
          />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {showCheckInPicker && (
        <DateTimePicker value={checkInDate} mode="date" display="spinner" onChange={handleCheckInDate} minimumDate={new Date()} />
      )}
      {showCheckOutPicker && (
        <DateTimePicker value={checkOutDate} mode="date" display="spinner" onChange={handleCheckOutDate} minimumDate={new Date(checkInDate.getTime() + 86400000)} />
      )}

      <AlertDialog
        visible={successDialogVisible}
        title="Đặt phòng thành công"
        message={successMessage}
        confirmText="OK"
        onConfirm={() => {
          setSuccessDialogVisible(false);
          navigation.navigate("Bookings");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 16, color: "#ef4444", fontWeight: "600" },

  // Sticky Header
  stickyHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#e2e8f0",
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#1e293b", textAlign: "center", marginHorizontal: 8 },

  // Gallery
  galleryContainer: { position: "relative", height: 260, backgroundColor: "#e2e8f0" },
  galleryImage: { width, height: 260 },
  dots: { position: "absolute", bottom: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { width: 18, backgroundColor: "#fff" },
  imageCount: {
    position: "absolute", top: 12, right: 12,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  imageCountText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // Info
  infoSection: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 16 },
  homestayTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 4, marginBottom: 12 },
  location: { fontSize: 13, color: "#64748b", flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  ratingValue: { fontSize: 14, fontWeight: "700", color: "#92400e" },
  reviewCount: { fontSize: 12, color: "#92400e" },
  priceChip: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  priceValue: { fontSize: 22, fontWeight: "800", color: "#0891b2" },
  priceUnit: { fontSize: 13, color: "#64748b" },

  // Features
  featuresRow: {
    flexDirection: "row", backgroundColor: "#fff",
    paddingHorizontal: 16, paddingVertical: 16, gap: 8,
  },
  featureItem: { flex: 1, alignItems: "center", gap: 4, backgroundColor: "#f0f9ff", borderRadius: 12, paddingVertical: 12 },
  featureValue: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  featureLabel: { fontSize: 10, color: "#64748b", textAlign: "center" },

  // Section
  section: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  description: { fontSize: 14, color: "#64748b", lineHeight: 22 },

  // Amenities
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  amenityText: { fontSize: 12, color: "#15803d", fontWeight: "500" },

  // Booking
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  dateBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#e0f2fe", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
  },
  dateBtnLabel: { fontSize: 11, color: "#0891b2", marginBottom: 2 },
  dateBtnValue: { fontSize: 13, fontWeight: "700", color: "#0891b2" },
  dateArrow: { alignItems: "center" },
  nightsSummary: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#f8fafc", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
  },
  nightsText: { fontSize: 13, color: "#64748b" },
  nightsTotal: { fontSize: 13, fontWeight: "700", color: "#0891b2" },
  counterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  counterLabel: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  counter: { flexDirection: "row", alignItems: "center", gap: 16 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e0f2fe", justifyContent: "center", alignItems: "center" },
  counterValue: { fontSize: 18, fontWeight: "700", color: "#0f172a", minWidth: 28, textAlign: "center" },
});
