import { AlertDialog, Button, Divider, Header, LoadingIndicator } from "@/components";
import { bookingService } from "@/service/booking/bookingService";
import { extraChargeService } from "@/service/extraCharge/extraChargeService";
import { publicHomestayService } from "@/service/homestay/publicHomestayService";
import { reviewService } from "@/service/review/reviewService";
import type { Booking, ExtraCharge } from "@/types";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
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

const { width } = Dimensions.get("window");

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: "#d97706", bg: "#fef3c7", label: "Chờ thanh toán cọc" },
  CONFIRMED: { color: "#059669", bg: "#d1fae5", label: "Đã xác nhận" },
  CHECKED_IN: { color: "#2563eb", bg: "#dbeafe", label: "Đang lưu trú" },
  COMPLETED: { color: "#0891b2", bg: "#cffafe", label: "Hoàn thành" },
  CANCELLED: { color: "#dc2626", bg: "#fee2e2", label: "Đã hủy" },
  REJECTED: { color: "#dc2626", bg: "#fee2e2", label: "Bị từ chối" },
};

const PAYMENT_CFG: Record<string, { color: string; label: string }> = {
  UNPAID: { color: "#d97706", label: "Chưa thanh toán" },
  DEPOSIT_PAID: { color: "#2563eb", label: "Đã cọc" },
  FULLY_PAID: { color: "#059669", label: "Đã thanh toán đủ" },
};

function InfoRow({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon as any} size={16} color="#64748b" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

// Helper to parse experiences from specialRequests
function parseExperiencesFromSpecialRequests(specialRequests: string | undefined) {
  if (!specialRequests) return null;

  try {
    // Look for [EXPERIENCES_JSON] marker
    const match = specialRequests.match(/\[EXPERIENCES_JSON\](.+)$/);
    if (!match) return null;

    const jsonStr = match[1];
    const data = JSON.parse(jsonStr);

    if (data.items && Array.isArray(data.items)) {
      return data.items as Array<{ id: string; name: string; price: number; qty: number }>;
    }
    return null;
  } catch {
    return null;
  }
}

function TimelineStep({ step, label, sublabel, done, active }: { step: number; label: string; sublabel?: string; done: boolean; active: boolean }) {
  return (
    <View style={styles.timelineStep}>
      <View style={[styles.timelineDot, done ? styles.timelineDotDone : active ? styles.timelineDotActive : styles.timelineDotPending]}>
        {done ? (
          <MaterialCommunityIcons name="check" size={12} color="#fff" />
        ) : (
          <Text style={styles.timelineDotText}>{step}</Text>
        )}
      </View>
      <View style={styles.timelineContent}>
        <Text style={[styles.timelineLabel, (done || active) && { color: "#0f172a", fontWeight: "700" }]}>{label}</Text>
        {sublabel ? <Text style={styles.timelineSublabel}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

export default function BookingDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { bookingId, booking: initialBooking } = route.params ?? {};

  const [booking, setBooking] = useState<Booking | null>(initialBooking ?? null);
  const [homestay, setHomestay] = useState<any>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [hasReview, setHasReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const load = useCallback(async () => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    try {
      const [detail, policyData] = await Promise.all([
        bookingService.getBookingDetail(bookingId),
        bookingService.getCancellationPolicy(bookingId).catch(() => null),
      ]);
      if (detail) {
        setBooking(detail);
        setPolicy(policyData);
        // Load extra charges
        const charges = await extraChargeService.getByBooking(detail.id).catch(() => []);
        setExtraCharges(charges);
        // Load homestay detail
        if (detail.homestayId) {
          publicHomestayService.getById(detail.homestayId).then(setHomestay).catch(() => { });
        }
        // Check review
        reviewService.getMyReviews().then((reviews) => {
          setHasReview(reviews.some((r) => r.bookingReference === detail.id));
        }).catch(() => { });
      } else if (!booking) {
        // getBookingDetail trả về null nhưng không có initialBooking → hiện lỗi
        showToast("Không thể tải chi tiết đặt phòng", "error");
      }
    } catch {
      if (!booking) showToast("Không thể tải chi tiết đặt phòng", "error");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = useCallback(async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      const res = await bookingService.cancelBooking(booking.id);
      if (res.success) {
        showToast("Đã hủy đặt phòng", "success");
        navigation.goBack();
      } else {
        showToast(res.message || "Không thể hủy", "error");
      }
    } catch {
      showToast("Lỗi khi hủy đặt phòng", "error");
    } finally {
      setCancelling(false);
      setCancelDialog(false);
    }
  }, [booking, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Header showBack title="Chi tiết đặt phòng" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Header showBack title="Chi tiết đặt phòng" />
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Không tìm thấy đặt phòng</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = STATUS_CFG[booking.status] ?? STATUS_CFG.PENDING;
  const paymentCfg = booking.paymentStatus ? (PAYMENT_CFG[booking.paymentStatus] ?? PAYMENT_CFG.UNPAID) : null;
  const nights = Math.max(1, Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000));
  const images: string[] = homestay?.images?.length ? homestay.images : booking.homestayName ? [] : [];
  const fallbackImg = "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800";

  // Timeline logic
  const isPending = booking.status === "PENDING";
  const isConfirmed = ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(booking.status);
  const isCheckedIn = ["CHECKED_IN", "COMPLETED"].includes(booking.status);
  const isCompleted = booking.status === "COMPLETED";
  const depositPaid = ["DEPOSIT_PAID", "FULLY_PAID"].includes(booking.paymentStatus ?? "");
  const fullyPaid = booking.paymentStatus === "FULLY_PAID";
  const resolvedHomestayId = homestay?.id || booking.homestayId;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* Sticky header — chỉ back + title, không có status pill */}
        <View style={[styles.stickyHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {booking.homestayName || "Chi tiết đặt phòng"}
          </Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Image gallery */}
        {(images.length > 0 || true) && (
          <View style={styles.galleryWrap}>
            <ScrollView
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setActiveImg(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {(images.length > 0 ? images : [fallbackImg]).map((img, i) => (
                <Image key={i} source={{ uri: img }} style={styles.galleryImg} resizeMode="cover" />
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeImg && styles.dotActive]} />
                ))}
              </View>
            )}
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.4)"]} style={styles.galleryGradient} />
            <View style={styles.bookingIdBadge}>
              <Text style={styles.bookingIdText}>#{booking.id.slice(0, 8)}</Text>
            </View>
          </View>
        )}

        {/* Status banner — ngay dưới gallery */}
        <View style={[styles.statusBanner, { borderLeftColor: statusCfg.color }]}>
          <View style={styles.statusBannerLeft}>
            <View style={[styles.statusIconWrap, { backgroundColor: statusCfg.bg }]}>
              <MaterialCommunityIcons
                name={
                  booking.status === "PENDING" ? "clock-outline" :
                    booking.status === "CONFIRMED" ? "check-circle-outline" :
                      booking.status === "CHECKED_IN" ? "home-account" :
                        booking.status === "COMPLETED" ? "check-all" :
                          "close-circle-outline"
                }
                size={20}
                color={statusCfg.color}
              />
            </View>
            <View>
              <Text style={styles.statusBannerLabel}>Trạng thái đặt phòng</Text>
              <Text style={[styles.statusBannerValue, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>
          {paymentCfg && (
            <View style={styles.statusBannerRight}>
              <Text style={styles.statusBannerLabel}>Thanh toán</Text>
              <Text style={[styles.statusBannerValue, { color: paymentCfg.color }]}>{paymentCfg.label}</Text>
            </View>
          )}
        </View>

        {/* Homestay info */}
        {homestay && (
          <View style={styles.section}>
            <Text style={styles.homestayName}>{homestay.name}</Text>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={14} color="#0891b2" />
              <Text style={styles.locationText}>
                {[homestay.districtName, homestay.provinceName].filter(Boolean).join(", ") || homestay.address}
              </Text>
            </View>
            <View style={styles.featuresRow}>
              {!!homestay.bedrooms && (
                <View style={styles.featureChip}>
                  <MaterialCommunityIcons name="bed-outline" size={13} color="#0891b2" />
                  <Text style={styles.featureText}>{homestay.bedrooms} phòng ngủ</Text>
                </View>
              )}
              {!!homestay.bathrooms && (
                <View style={styles.featureChip}>
                  <MaterialCommunityIcons name="shower" size={13} color="#0891b2" />
                  <Text style={styles.featureText}>{homestay.bathrooms} phòng tắm</Text>
                </View>
              )}
              {!!homestay.maxGuests && (
                <View style={styles.featureChip}>
                  <MaterialCommunityIcons name="account-group-outline" size={13} color="#0891b2" />
                  <Text style={styles.featureText}>Tối đa {homestay.maxGuests} khách</Text>
                </View>
              )}
            </View>
            {homestay.amenities?.length > 0 && (
              <View style={styles.amenitiesWrap}>
                {(homestay.amenities as any[]).slice(0, 6).map((a: any, i: number) => (
                  <View key={i} style={styles.amenityChip}>
                    <MaterialCommunityIcons name="check-circle-outline" size={12} color="#10b981" />
                    <Text style={styles.amenityText}>{typeof a === "string" ? a : (a?.name ?? String(a))}</Text>
                  </View>
                ))}
                {homestay.amenities.length > 6 && (
                  <View style={styles.amenityChip}>
                    <Text style={styles.amenityText}>+{homestay.amenities.length - 6} khác</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <Divider />

        {/* Booking info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đặt phòng</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="calendar-arrow-right" label="Nhận phòng" value={new Date(booking.checkIn).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })} />
            <Divider style={{ marginVertical: 8 }} />
            <InfoRow icon="calendar-arrow-left" label="Trả phòng" value={new Date(booking.checkOut).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })} />
            <Divider style={{ marginVertical: 8 }} />
            <InfoRow icon="moon-waning-crescent" label="Số đêm" value={`${nights} đêm`} />
            <Divider style={{ marginVertical: 8 }} />
            <InfoRow icon="account-multiple" label="Số khách" value={`${booking.guestsCount} khách`} />
            {booking.contactPhone && (
              <>
                <Divider style={{ marginVertical: 8 }} />
                <InfoRow icon="phone-outline" label="SĐT liên hệ" value={booking.contactPhone} />
              </>
            )}
            {booking.specialRequests && (
              <>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="note-text-outline" size={16} color="#64748b" />
                  <Text style={styles.infoLabel}>Dịch vụ bổ sung</Text>
                </View>
                {(() => {
                  const experiences = parseExperiencesFromSpecialRequests(booking.specialRequests);
                  if (experiences && experiences.length > 0) {
                    return (
                      <View style={styles.experiencesContainer}>
                        {experiences.map((exp, idx) => (
                          <View key={exp.id || idx} style={styles.experienceItem}>
                            <View style={styles.experienceInfo}>
                              <Text style={styles.experienceName}>{exp.name}</Text>
                              <Text style={styles.experienceQty}>Số lượng: {exp.qty}</Text>
                            </View>
                            <Text style={styles.experiencePrice}>
                              {(exp.price * exp.qty).toLocaleString("vi-VN", {
                                style: "currency",
                                currency: "VND",
                                maximumFractionDigits: 0,
                              })}
                            </Text>
                          </View>
                        ))}
                      </View>
                    );
                  }
                  // Fallback to raw text if not in expected format
                  return <Text style={styles.specialRequestText}>{booking.specialRequests}</Text>;
                })()}
              </>
            )}
          </View>
        </View>

        <Divider />

        {/* Payment breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>
          <View style={styles.infoCard}>
            {homestay?.pricePerNight && (
              <>
                <View style={styles.priceRow}>
                  <Text style={styles.priceRowLabel}>₫{homestay.pricePerNight.toLocaleString("vi-VN")} × {nights} đêm</Text>
                  <Text style={styles.priceRowValue}>₫{(homestay.pricePerNight * nights).toLocaleString("vi-VN")}</Text>
                </View>
                <Divider style={{ marginVertical: 8 }} />
              </>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>Tổng tiền</Text>
              <Text style={[styles.priceRowValue, { fontSize: 18, fontWeight: "800", color: "#0891b2" }]}>
                ₫{(booking.totalPrice ?? 0).toLocaleString("vi-VN")}
              </Text>
            </View>
            {typeof booking.depositAmount === "number" && booking.depositAmount > 0 && (
              <>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.priceRow}>
                  <Text style={styles.priceRowLabel}>
                    Tiền cọc ({(booking as any).depositPercentage ?? 20}%)
                  </Text>
                  <Text style={[styles.priceRowValue, { color: depositPaid ? "#059669" : "#d97706" }]}>
                    ₫{booking.depositAmount.toLocaleString("vi-VN")}
                    {depositPaid ? " ✓" : ""}
                  </Text>
                </View>
              </>
            )}
            {extraCharges.length > 0 && (
              <>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.extraChargesSection}>
                  <Text style={styles.extraChargesSectionTitle}>Các khoản phí khác</Text>
                  {extraCharges.map((charge, idx) => (
                    <View key={charge.id || idx} style={styles.extraChargeRow}>
                      <Text style={styles.extraChargeLabel}>{charge.description}</Text>
                      <Text style={styles.extraChargeValue}>+₫{charge.amount.toLocaleString("vi-VN")}</Text>
                    </View>
                  ))}
                  <View style={styles.extraChargesTotalRow}>
                    <Text style={styles.extraChargesTotalLabel}>Tổng phí khác</Text>
                    <Text style={styles.extraChargesTotalValue}>
                      +₫{extraCharges.reduce((sum, c) => sum + c.amount, 0).toLocaleString("vi-VN")}
                    </Text>
                  </View>
                </View>
              </>
            )}
            {typeof booking.remainingAmount === "number" && booking.remainingAmount > 0 && (
              <>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.priceRow}>
                  <Text style={styles.priceRowLabel}>Còn lại</Text>
                  <Text style={[styles.priceRowValue, { color: fullyPaid ? "#059669" : "#f59e0b" }]}>
                    ₫{booking.remainingAmount.toLocaleString("vi-VN")}
                    {fullyPaid ? " ✓" : ""}
                  </Text>
                </View>
              </>
            )}
            {paymentCfg && (
              <>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.priceRow}>
                  <Text style={styles.priceRowLabel}>Trạng thái thanh toán</Text>
                  <Text style={[styles.priceRowValue, { color: paymentCfg.color, fontWeight: "700" }]}>
                    {paymentCfg.label}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <Divider />

        {/* Status timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiến trình đặt phòng</Text>
          <View style={styles.timelineCard}>
            <TimelineStep step={1} label="Đặt phòng" sublabel={booking.createdAt ? new Date(booking.createdAt).toLocaleDateString("vi-VN") : undefined} done={true} active={false} />
            <View style={styles.timelineLine} />
            <TimelineStep step={2} label="Thanh toán cọc" sublabel={depositPaid ? `₫${(booking.depositAmount ?? 0).toLocaleString("vi-VN")}` : "Chưa thanh toán"} done={depositPaid} active={isPending} />
            <View style={styles.timelineLine} />
            <TimelineStep step={3} label="Thanh toán còn lại" sublabel={fullyPaid ? `₫${(booking.remainingAmount ?? 0).toLocaleString("vi-VN")}` : "Thanh toán trước check-in"} done={fullyPaid} active={isConfirmed && !fullyPaid} />
            <View style={styles.timelineLine} />
            <TimelineStep step={4} label="Check-in & Lưu trú" sublabel={isCheckedIn ? (isCompleted ? "Đã hoàn thành" : "Đang lưu trú") : "Chờ đến ngày check-in"} done={isCompleted} active={isCheckedIn && !isCompleted} />
          </View>
        </View>

        {/* Cancellation policy */}
        {policy && (
          <>
            <Divider />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chính sách hủy</Text>
              <View style={styles.policyBox}>
                <MaterialCommunityIcons name="shield-alert-outline" size={16} color="#d97706" />
                <Text style={styles.policyText}>
                  {typeof policy === "string" ? policy : policy?.policy ?? JSON.stringify(policy)}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Actions */}
        <View style={styles.section}>
          {/* Payment button */}
          {(booking.status === "PENDING" || (booking.status === "CONFIRMED" && booking.paymentStatus === "DEPOSIT_PAID")) && (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => navigation.navigate("PaymentInitiation", { bookingId: booking.id, booking })}
            >
              <LinearGradient colors={["#1d4ed8", "#0891b2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.payBtnGradient}>
                <MaterialCommunityIcons name="credit-card-outline" size={18} color="#fff" />
                <Text style={styles.payBtnText}>
                  {booking.status === "PENDING"
                    ? `Đặt cọc ngay · ₫${(booking.depositAmount ?? 0).toLocaleString("vi-VN")}`
                    : `Thanh toán còn lại · ₫${(booking.remainingAmount ?? 0).toLocaleString("vi-VN")}`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Edit + Cancel for PENDING */}
          {booking.status === "PENDING" && (
            <View style={styles.actionsRow}>
              <Button
                title="Chỉnh sửa"
                variant="outline"
                size="large"
                style={{ flex: 1 }}
                onPress={() => navigation.navigate("BookingEdit", { bookingId: booking.id, booking })}
              />
              <Button
                title="Hủy đặt phòng"
                variant="danger"
                size="large"
                style={{ flex: 1 }}
                onPress={() => setCancelDialog(true)}
                loading={cancelling}
              />
            </View>
          )}

          {/* Write review for COMPLETED */}
          {booking.status === "COMPLETED" && !hasReview && (
            <Button
              title="Viết đánh giá"
              size="large"
              onPress={() => navigation.navigate("CreateReview", { bookingId: booking.id, homestayName: booking.homestayName })}
            />
          )}
          {booking.status === "COMPLETED" && hasReview && (
            <View style={styles.reviewedBox}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#059669" />
              <Text style={styles.reviewedText}>Bạn đã đánh giá homestay này</Text>
            </View>
          )}

          {/* View homestay */}
          {resolvedHomestayId ? (
            <Button
              title="Xem homestay"
              variant="outline"
              size="large"
              style={{ marginTop: 8 }}
              onPress={() =>
                navigation.navigate("HomestayDetail", {
                  id: resolvedHomestayId,
                  homestay: homestay ?? undefined,
                })
              }
            />
          ) : null}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <AlertDialog
        visible={cancelDialog}
        title="Hủy đặt phòng"
        message="Bạn có chắc muốn hủy đặt phòng này không? Hành động này không thể hoàn tác."
        confirmText="Hủy đặt phòng"
        cancelText="Đóng"
        confirmButtonColor="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelDialog(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  errorBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 16, color: "#ef4444", fontWeight: "600" },

  stickyHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  headerBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#0f172a" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  // Status banner
  statusBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14,
    borderLeftWidth: 4, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  statusBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusBannerRight: { alignItems: "flex-end" },
  statusIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  statusBannerLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "500", marginBottom: 2 },
  statusBannerValue: { fontSize: 14, fontWeight: "800" },

  galleryWrap: { height: 240, position: "relative", backgroundColor: "#0f172a" },
  galleryImg: { width, height: 240 },
  galleryGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80 },
  dots: { position: "absolute", bottom: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { width: 14, backgroundColor: "#fff" },
  bookingIdBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bookingIdText: { fontSize: 11, color: "#fff", fontWeight: "600" },

  section: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 18 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a", marginBottom: 14 },

  homestayName: { fontSize: 20, fontWeight: "900", color: "#0f172a", marginBottom: 8 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  locationText: { fontSize: 13, color: "#64748b", flex: 1 },
  featuresRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  featureChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#e0f2fe", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  featureText: { fontSize: 12, color: "#0891b2", fontWeight: "600" },
  amenitiesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#f0fdf4", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: "#dcfce7" },
  amenityText: { fontSize: 11, color: "#15803d", fontWeight: "600" },

  infoCard: { backgroundColor: "#f8fafc", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoLabel: { flex: 1, fontSize: 13, color: "#64748b" },
  infoValue: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  specialRequestText: { fontSize: 13, color: "#475569", lineHeight: 20, marginTop: 6, marginLeft: 26 },

  experiencesContainer: { marginTop: 8, marginLeft: 26 },
  experienceItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, paddingHorizontal: 10, backgroundColor: "#f1f5f9", borderRadius: 8, marginBottom: 6 },
  experienceInfo: { flex: 1 },
  experienceName: { fontSize: 13, fontWeight: "600", color: "#0f172a", marginBottom: 2 },
  experienceQty: { fontSize: 12, color: "#64748b" },
  experiencePrice: { fontSize: 13, fontWeight: "700", color: "#0f172a", minWidth: 80, textAlign: "right" },

  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceRowLabel: { fontSize: 13, color: "#64748b" },
  priceRowValue: { fontSize: 14, fontWeight: "600", color: "#0f172a" },

  extraChargesSection: { marginTop: 4 },
  extraChargesSectionTitle: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 8, textTransform: "uppercase" },
  extraChargeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, paddingLeft: 4 },
  extraChargeLabel: { fontSize: 12, color: "#475569", fontWeight: "500" },
  extraChargeValue: { fontSize: 12, fontWeight: "600", color: "#ea580c" },
  extraChargesTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  extraChargesTotalLabel: { fontSize: 13, fontWeight: "600", color: "#475569" },
  extraChargesTotalValue: { fontSize: 13, fontWeight: "700", color: "#ea580c" },

  timelineCard: { backgroundColor: "#f8fafc", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  timelineStep: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  timelineDotDone: { backgroundColor: "#059669" },
  timelineDotActive: { backgroundColor: "#0891b2" },
  timelineDotPending: { backgroundColor: "#e2e8f0" },
  timelineDotText: { fontSize: 12, fontWeight: "700", color: "#94a3b8" },
  timelineContent: { flex: 1, paddingBottom: 4 },
  timelineLabel: { fontSize: 13, color: "#94a3b8", fontWeight: "500" },
  timelineSublabel: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  timelineLine: { width: 2, height: 16, backgroundColor: "#e2e8f0", marginLeft: 13, marginVertical: 2 },

  policyBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#fffbeb", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#fde68a" },
  policyText: { flex: 1, fontSize: 13, color: "#92400e", lineHeight: 20 },

  payBtn: { marginBottom: 12, borderRadius: 14, overflow: "hidden" },
  payBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  payBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  reviewedBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#d1fae5", borderRadius: 12, padding: 12, marginBottom: 10 },
  reviewedText: { fontSize: 13, color: "#059669", fontWeight: "600" },
});
