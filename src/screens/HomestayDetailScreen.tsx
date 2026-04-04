import {
  AlertDialog,
  Button,
  Divider,
  Header,
  Input,
  LoadingIndicator,
} from "@/components";
import { apiClient } from "@/service/api/apiClient";
import { tokenStorage } from "@/service/auth/tokenStorage";
import { bookingService } from "@/service/booking/bookingService";
import { apiConfig } from "@/service/constants/apiConfig";
import { publicHomestayService } from "@/service/homestay/publicHomestayService";
import { wishlistService } from "@/service/wishlist/wishlistService";
import type { Homestay } from "@/types";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface Review {
  id: string;
  customerName: string;
  rating: number;
  cleanlinessRating?: number;
  locationRating?: number;
  valueRating?: number;
  communicationRating?: number;
  comment: string;
  replyFromOwner?: string;
  createdAt: string;
}

const { width } = Dimensions.get("window");

export default function HomestayDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const id = route.params?.id as string;
  const initialHomestay = route.params?.homestay as Homestay | undefined;
  const [item, setItem] = useState<Homestay | null>(initialHomestay || null);
  const [loading, setLoading] = useState(!initialHomestay);
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
  const [hasSession, setHasSession] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Validate ID exists
  useEffect(() => {
    if (!id && !initialHomestay) {
      showToast("ID căn nhà không hợp lệ", "error");
    }
  }, [id, initialHomestay]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await publicHomestayService.getById(id);
        if (data) {
          setItem(data);
        } else if (!initialHomestay) {
          // Only show error if we don't have fallback data
          showToast("Không thể tải chi tiết căn nhà", "error");
        }
      } catch (error) {
        console.warn("Failed to load homestay detail:", error);
        if (!initialHomestay) {
          showToast("Không thể tải chi tiết căn nhà", "error");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, initialHomestay]);

  // Fetch reviews
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const loadReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await apiClient.get<any>(apiConfig.endpoints.publicHomestays.reviews(id));
        if (!mounted) return;
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const mapped: Review[] = list.map((r: any) => ({
          id: r.id,
          customerName: r.customerName ?? "Khách",
          rating: r.rating ?? 0,
          cleanlinessRating: r.cleanlinessRating ?? 0,
          locationRating: r.locationRating ?? 0,
          valueRating: r.valueRating ?? 0,
          communicationRating: r.communicationRating ?? 0,
          comment: r.comment ?? "",
          replyFromOwner: r.replyFromOwner,
          createdAt: r.createdAt ?? "",
        }));
        setReviews(mapped);
      } catch (error) {
        if (mounted) setReviews([]);
      } finally {
        if (mounted) setReviewsLoading(false);
      }
    };
    loadReviews();
    return () => {
      mounted = false;
    };
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const token = await tokenStorage.getToken();
        if (cancelled) return;
        setHasSession(Boolean(token));
        if (token) {
          try {
            const list = await wishlistService.getMyWishlist();
            if (!cancelled) setIsFavorite(list.some((h) => h.id === id));
          } catch {
            if (!cancelled) setIsFavorite(false);
          }
        } else {
          setIsFavorite(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  const handleWishlistToggle = useCallback(async () => {
    if (!hasSession) {
      showToast("Đăng nhập để lưu yêu thích", "info");
      navigation.navigate("Login");
      return;
    }
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

  const avgRating =
    reviews.length > 0
      ? Math.round(
        (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
      ) / 10
      : item?.averageRating ?? null;

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
  };

  const handleBooking = useCallback(async () => {
    if (!hasSession) {
      showToast("Vui lòng đăng nhập để đặt phòng", "info");
      navigation.navigate("Login");
      return;
    }
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
  }, [item, checkInDate, checkOutDate, guestCount, phone, hasSession, navigation]);

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
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* Sticky Header */}
        <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
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
                    <Text style={styles.amenityText}>{typeof a === "string" ? a : (a?.name ?? String(a))}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {/* Reviews Section */}
        <Divider />
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Đánh giá</Text>
            {avgRating !== null && (
              <View style={styles.avgRatingBadge}>
                <MaterialCommunityIcons name="star" size={16} color="#fbbf24" />
                <Text style={styles.avgRatingValue}>{avgRating}</Text>
                <Text style={styles.avgRatingCount}>({reviews.length})</Text>
              </View>
            )}
          </View>

          {/* Rating subcategories breakdown */}
          {reviews.length > 0 && (() => {
            const hasSubRatings = reviews.some((r) =>
              (r.cleanlinessRating ?? 0) > 0 || (r.locationRating ?? 0) > 0 || (r.valueRating ?? 0) > 0 || (r.communicationRating ?? 0) > 0
            );
            if (!hasSubRatings) return null;
            const avg = (key: keyof Omit<Review, "id" | "customerName" | "comment" | "replyFromOwner" | "createdAt">) =>
              Math.round(
                (reviews.reduce((s, r) => s + ((r[key] as number) ?? 0), 0) / reviews.length) * 10
              ) / 10;
            const categories = [
              { label: "Vệ sinh", rating: avg("cleanlinessRating") },
              { label: "Vị trí", rating: avg("locationRating") },
              { label: "Giá trị", rating: avg("valueRating") },
              { label: "Giao tiếp", rating: avg("communicationRating") },
            ];
            return (
              <View style={styles.ratingsGrid}>
                {categories.map((cat) => (
                  <View key={cat.label} style={styles.ratingCategory}>
                    <Text style={styles.ratingCategoryValue}>{cat.rating}</Text>
                    <Text style={styles.ratingCategoryLabel}>{cat.label}</Text>
                    <View style={styles.ratingBar}>
                      <View
                        style={[
                          styles.ratingBarFill,
                          { width: `${(cat.rating / 5) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            );
          })()}

          {reviewsLoading && (
            <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
          )}

          {!reviewsLoading && reviews.length === 0 && (
            <Text style={styles.emptyText}>Chưa có đánh giá nào cho homestay này.</Text>
          )}

          {!reviewsLoading && reviews.length > 0 && (
            <View style={styles.reviewsList}>
              {reviews.map((review, idx) => (
                <View key={review.id || idx} style={styles.reviewItem}>
                  {idx > 0 && <View style={styles.reviewDivider} />}
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerAvatarText}>
                        {getInitials(review.customerName)}
                      </Text>
                    </View>
                    <View style={styles.reviewInfo}>
                      <View style={styles.reviewerNameRow}>
                        <Text style={styles.reviewerName}>{review.customerName}</Text>
                        <Text style={styles.reviewDate}>
                          {review.createdAt
                            ? new Date(review.createdAt).toLocaleDateString("vi-VN")
                            : ""}
                        </Text>
                      </View>
                      <View style={styles.reviewStars}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <MaterialCommunityIcons
                            key={i}
                            name={i < review.rating ? "star" : "star-outline"}
                            size={14}
                            color={i < review.rating ? "#fbbf24" : "#e5e7eb"}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                  {review.replyFromOwner && (
                    <View style={styles.ownerReply}>
                      <Text style={styles.ownerReplyLabel}>Phản hồi từ chủ nhà</Text>
                      <Text style={styles.ownerReplyText}>{review.replyFromOwner}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Booking Section */}
        <Divider />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đặt phòng</Text>

          {!hasSession ? (
            <View style={styles.guestBookingBox}>
              <MaterialCommunityIcons name="lock-outline" size={28} color="#0891b2" />
              <Text style={styles.guestBookingTitle}>Đăng nhập để đặt phòng</Text>
              <Text style={styles.guestBookingDesc}>
                Bạn vẫn có thể xem ảnh, mô tả và giá. Đăng nhập để hoàn tất đặt phòng và thanh toán.
              </Text>
              <Button title="Đăng nhập" onPress={() => navigation.navigate("Login")} />
            </View>
          ) : null}

          {hasSession ? (
            <>
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
            </>
          ) : null}
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
          navigation.navigate("MainTabs" as never, { screen: "Bookings" } as never);
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
    paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  headerBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#0f172a", marginHorizontal: 12, paddingRight: 4 },

  // Gallery
  galleryContainer: { position: "relative", height: 280, backgroundColor: "#0f172a" },
  galleryImage: { width, height: 280 },
  dots: { position: "absolute", bottom: 16, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { width: 14, backgroundColor: "#fff", borderRadius: 2.5 },
  imageCount: {
    position: "absolute", top: 14, right: 14,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  imageCountText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  // Info
  infoSection: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 20 },
  homestayTitle: { fontSize: 24, fontWeight: "900", color: "#0f172a", marginBottom: 8 },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 14 },
  location: { fontSize: 13, color: "#64748b", flex: 1, lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "space-between" },
  ratingChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#fffbeb", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: "#fed7aa",
  },
  ratingValue: { fontSize: 15, fontWeight: "800", color: "#b45309" },
  reviewCount: { fontSize: 12, color: "#92400e" },
  priceChip: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  priceValue: { fontSize: 26, fontWeight: "900", color: "#0891b2" },
  priceUnit: { fontSize: 12, color: "#64748b", fontWeight: "500" },

  // Features
  featuresRow: {
    flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 18, gap: 10,
  },
  featureItem: {
    flex: 1, alignItems: "center", gap: 6,
    backgroundColor: "#f0f9ff", borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: "#cffafe"
  },
  featureValue: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  featureLabel: { fontSize: 11, color: "#64748b", textAlign: "center", fontWeight: "600" },

  // Section
  section: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a", marginBottom: 14 },
  description: { fontSize: 14, color: "#475569", lineHeight: 22, fontWeight: "500" },

  // Amenities
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  amenityChip: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "#f0fdf4", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: "#dcfce7",
  },
  amenityText: { fontSize: 13, color: "#15803d", fontWeight: "600" },

  // Booking
  dateRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  dateBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#ecf9ff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: "#cffafe"
  },
  dateBtnLabel: { fontSize: 11, color: "#0891b2", fontWeight: "600" },
  dateBtnValue: { fontSize: 14, fontWeight: "800", color: "#0d8fb2" },
  dateArrow: { paddingHorizontal: 4 },
  nightsSummary: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f1f5f9", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16,
    borderWidth: 1, borderColor: "#e2e8f0"
  },
  nightsText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  nightsTotal: { fontSize: 13, fontWeight: "800", color: "#0891b2" },
  counterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  counterLabel: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  counter: { flexDirection: "row", alignItems: "center", gap: 14 },
  counterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#ecf9ff", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#cffafe" },
  counterValue: { fontSize: 18, fontWeight: "800", color: "#0f172a", minWidth: 32, textAlign: "center" },
  guestBookingBox: {
    alignItems: "center", gap: 12, paddingVertical: 20, paddingHorizontal: 16,
    backgroundColor: "#ecf9ff", borderRadius: 14, borderWidth: 1.5, borderColor: "#a3e4f5", marginBottom: 14,
  },
  guestBookingTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a", textAlign: "center" },
  guestBookingDesc: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 20, fontWeight: "500" },

  // Reviews Styles
  reviewsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  avgRatingBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: "#fef3c7", borderRadius: 20, borderWidth: 0.5, borderColor: "#fbbf24"
  },
  avgRatingValue: { fontSize: 14, fontWeight: "700", color: "#f59e0b" },
  avgRatingCount: { fontSize: 12, color: "#92400e", fontWeight: "500" },

  ratingsGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16,
    paddingHorizontal: 8, paddingVertical: 12, backgroundColor: "#f8fafc", borderRadius: 10
  },
  ratingCategory: { flex: 0.22, alignItems: "center", gap: 6 },
  ratingCategoryValue: { fontSize: 14, fontWeight: "700", color: "#0891b2" },
  ratingCategoryLabel: { fontSize: 11, color: "#64748b", fontWeight: "600", textAlign: "center" },
  ratingBar: {
    width: "100%", height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, overflow: "hidden",
    marginTop: 2
  },
  ratingBarFill: { height: 4, backgroundColor: "#0891b2", borderRadius: 2 },

  loadingText: { textAlign: "center", color: "#94a3b8", fontSize: 14, paddingVertical: 16 },
  emptyText: { textAlign: "center", color: "#94a3b8", fontSize: 14, paddingVertical: 20 },

  reviewsList: { gap: 0 },
  reviewItem: { paddingVertical: 14 },
  reviewDivider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 12 },
  reviewHeader: { flexDirection: "row", gap: 10 },
  reviewerAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#0891b2",
    justifyContent: "center", alignItems: "center"
  },
  reviewerAvatarText: { fontSize: 12, fontWeight: "700", color: "#ffffff" },
  reviewInfo: { flex: 1 },
  reviewerNameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  reviewerName: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  reviewDate: { fontSize: 12, color: "#94a3b8" },
  reviewStars: { flexDirection: "row", gap: 3 },
  reviewComment: {
    fontSize: 13, color: "#475569", lineHeight: 20, marginTop: 10, fontWeight: "500"
  },
  ownerReply: {
    marginTop: 12, paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: "#f0fdf4", borderLeftWidth: 3, borderLeftColor: "#4ade80", borderRadius: 6
  },
  ownerReplyLabel: { fontSize: 11, fontWeight: "700", color: "#16a34a", marginBottom: 4 },
  ownerReplyText: { fontSize: 12, color: "#166534", lineHeight: 18, fontWeight: "500" },
});
