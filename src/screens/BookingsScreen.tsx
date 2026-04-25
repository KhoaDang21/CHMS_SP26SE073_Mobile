import { AlertDialog, Button, Card, Divider, EmptyState, Header, LoadingIndicator, StatusBadge } from "@/components";
import { bookingService } from "@/service/booking/bookingService";
import { refundService, type PendingRefund } from "@/service/refund/refundService";
import { reviewService } from "@/service/review/reviewService";
import type { Booking } from "@/types";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { ComponentProps } from "react";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterTab = "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ xác nhận" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "CANCELLED", label: "Đã hủy" },
];

const STATUS_META: Record<string, { color: string; icon: ComponentProps<typeof MaterialCommunityIcons>["name"] }> = {
  PENDING: { color: "#f59e0b", icon: "clock-outline" },
  CONFIRMED: { color: "#10b981", icon: "check-circle-outline" },
  COMPLETED: { color: "#0891b2", icon: "check-all" },
  CANCELLED: { color: "#ef4444", icon: "close-circle-outline" },
  CHECKED_IN: { color: "#10b981", icon: "login" },
  REJECTED: { color: "#ef4444", icon: "alert-circle-outline" },
};

export default function BookingsScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [reviewedBookings, setReviewedBookings] = useState<Set<string>>(new Set());
  const [refundsMap, setRefundsMap] = useState<Map<string, PendingRefund>>(new Map());

  const loadBookings = useCallback(async () => {
    try {
      const data = await bookingService.getMyBookings();
      // Sắp xếp mới nhất lên đầu theo createdAt (giống FE web)
      const sorted = [...(data || [])].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      setItems(sorted);
      // Load refunds
      const refunds = await refundService.getMyRefunds().catch(() => []);
      const map = new Map(refunds.map((r) => [r.bookingId, r]));
      setRefundsMap(map);
    } catch (error) {
      showToast("Không thể tải danh sách đặt phòng", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      const reviews = await reviewService.getMyReviews();
      const ids = new Set(reviews.map((r) => r.bookingReference).filter(Boolean));
      setReviewedBookings(ids);
    } catch { /* silent */ }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadBookings();
      loadReviews();
    }, [loadBookings, loadReviews]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings();
    loadReviews();
  }, [loadBookings, loadReviews]);

  const handleCancelBooking = useCallback(async () => {
    if (!selectedBookingId) return;
    try {
      const res = await bookingService.cancelBooking(selectedBookingId);
      if (res.success) {
        showToast("Hủy đặt phòng thành công", "success");
        loadBookings();
      } else {
        showToast(res.message || "Không thể hủy đặt phòng", "error");
      }
    } catch {
      showToast("Lỗi khi hủy đặt phòng", "error");
    } finally {
      setCancelDialogVisible(false);
      setSelectedBookingId(null);
    }
  }, [selectedBookingId, loadBookings]);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("vi-VN"); } catch { return d; }
  };

  const getNights = (checkIn: string, checkOut: string) => {
    try { return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000); } catch { return 0; }
  };

  const filteredItems = activeFilter === "ALL" ? items : items.filter((i) => i.status === activeFilter);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Header title="Đặt Phòng" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  const renderCard = ({ item }: { item: Booking }) => {
    const nights = getNights(item.checkIn, item.checkOut);
    const meta = STATUS_META[item.status] ?? STATUS_META.PENDING;
    const hasReview = reviewedBookings.has(item.id);
    const refund = refundsMap.get(item.id);

    return (
      <Card style={styles.bookingCard} onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id, booking: item })}>
        {/* Colored header bar */}
        <View style={[styles.cardHeaderBar, { backgroundColor: meta.color }]}>
          <View style={styles.cardHeaderLeft}>
            <MaterialCommunityIcons name={meta.icon} size={16} color="#fff" />
            <Text style={styles.cardHeaderTitle} numberOfLines={1}>{item.homestayName || "Căn nhà"}</Text>
          </View>
          <Text style={styles.cardHeaderId}>#{item.id.slice(0, 8)}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.statusRow}>
            <StatusBadge status={item.status} />
            {item.paymentStatus && <StatusBadge status={item.paymentStatus} />}
            {refund && (
              <View style={[styles.refundBadge, refund.refundStatus === "COMPLETED" ? styles.refundBadgeCompleted : styles.refundBadgePending]}>
                <MaterialCommunityIcons name={refund.refundStatus === "COMPLETED" ? "check-circle" : "clock-outline"} size={12} color="#fff" />
                <Text style={styles.refundBadgeText}>{refund.refundStatus === "COMPLETED" ? "Đã hoàn" : "Chờ hoàn"}</Text>
              </View>
            )}
          </View>

          <Divider style={styles.divider} />

          <View style={styles.datesRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Nhận phòng</Text>
              <Text style={styles.dateValue}>{formatDate(item.checkIn)}</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={16} color="#cbd5e1" />
            <View style={[styles.dateItem, { alignItems: "flex-end" }]}>
              <Text style={styles.dateLabel}>Trả phòng</Text>
              <Text style={styles.dateValue}>{formatDate(item.checkOut)}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <MaterialCommunityIcons name="moon-waning-crescent" size={13} color="#0891b2" />
              <Text style={styles.metaText}>{nights} đêm</Text>
            </View>
            {!!item.guestsCount && (
              <View style={styles.metaChip}>
                <MaterialCommunityIcons name="account-multiple" size={13} color="#0891b2" />
                <Text style={styles.metaText}>{item.guestsCount} khách</Text>
              </View>
            )}
          </View>

          <Divider style={styles.divider} />

          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tổng giá</Text>
              <Text style={styles.priceValue}>₫{typeof item.totalPrice === "number" ? item.totalPrice.toLocaleString("vi-VN") : "—"}</Text>
            </View>
            {typeof item.depositAmount === "number" && item.depositAmount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceSubLabel}>Tiền cọc</Text>
                <Text style={styles.priceSubValue}>₫{item.depositAmount.toLocaleString("vi-VN")}</Text>
              </View>
            )}
            {typeof item.remainingAmount === "number" && item.remainingAmount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceSubLabel}>Còn lại</Text>
                <Text style={[styles.priceSubValue, { color: "#f59e0b" }]}>₫{item.remainingAmount.toLocaleString("vi-VN")}</Text>
              </View>
            )}
            {refund && (
              <View style={styles.priceRow}>
                <Text style={styles.priceSubLabel}>Hoàn tiền</Text>
                <Text style={[styles.priceSubValue, { color: refund.refundStatus === "COMPLETED" ? "#059669" : "#d97706" }]}>₫{refund.refundAmount.toLocaleString("vi-VN")}</Text>
              </View>
            )}
          </View>

          {/* Actions for PENDING */}
          {item.status === "PENDING" && (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.btnPrimary]} onPress={() => navigation.navigate("PaymentInitiation", { bookingId: item.id, booking: item })}>
                <MaterialCommunityIcons name="credit-card-outline" size={14} color="#fff" />
                <Text style={styles.btnTextLight}>Thanh toán</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.btnSecondary]} onPress={() => {
                if (item.status === "PENDING") {
                  navigation.navigate("BookingEdit", { bookingId: item.id, booking: item });
                } else {
                  showToast("Chỉ có thể chỉnh sửa khi chưa thanh toán cọc", "warning");
                }
              }}>
                <MaterialCommunityIcons name="pencil-outline" size={14} color="#0891b2" />
                <Text style={styles.btnTextDark}>Chỉnh sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.btnDanger]} onPress={() => { setSelectedBookingId(item.id); setCancelDialogVisible(true); }}>
                <MaterialCommunityIcons name="close-circle-outline" size={14} color="#ef4444" />
                <Text style={styles.btnTextDanger}>Hủy</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Write review for COMPLETED */}
          {item.status === "COMPLETED" && !hasReview && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnReview, { marginTop: 12, width: "100%" }]}
              onPress={() => navigation.navigate("CreateReview", { bookingId: item.id, homestayName: item.homestayName })}
            >
              <MaterialCommunityIcons name="star-outline" size={14} color="#fff" />
              <Text style={styles.btnTextLight}>Viết đánh giá</Text>
            </TouchableOpacity>
          )}

          {/* Đặt món — hiện khi CONFIRMED hoặc CHECKED_IN, giống FE web */}
          {(item.status === "CONFIRMED" || item.status === "CHECKED_IN") && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnDining, { marginTop: 12, width: "100%" }]}
              onPress={() => navigation.navigate("BookingDining", { bookingId: item.id })}
            >
              <MaterialCommunityIcons name="silverware-fork-knife" size={14} color="#fff" />
              <Text style={styles.btnTextLight}>🍽️ Đặt món ăn</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Header title="Đặt Phòng" />

      {/* Filter tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {FILTER_TABS.map((tab) => {
            const count = tab.key === "ALL" ? items.length : items.filter((i) => i.status === tab.key).length;
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity key={tab.key} style={[styles.tab, isActive && styles.tabActive]} onPress={() => setActiveFilter(tab.key)}>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Không có đặt phòng"
            description="Bạn chưa có đặt phòng nào. Hãy tìm và đặt một căn nhà hôm nay!"
            action={{ label: "Tìm Căn Nhà", onPress: () => { } }}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0891b2" />}
      />

      <AlertDialog
        visible={cancelDialogVisible}
        title="Hủy Đặt Phòng"
        message="Bạn có chắc chắn muốn hủy đặt phòng này không?"
        confirmText="Hủy đặt phòng"
        cancelText="Đóng"
        confirmButtonColor="danger"
        onConfirm={handleCancelBooking}
        onCancel={() => { setCancelDialogVisible(false); setSelectedBookingId(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f9ff" },
  tabsWrapper: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "transparent" },
  tabActive: { backgroundColor: "#e0f2fe", borderColor: "#0891b2" },
  tabLabel: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  tabLabelActive: { color: "#0891b2", fontWeight: "700" },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabBadgeActive: { backgroundColor: "#0891b2" },
  tabBadgeText: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  tabBadgeTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  bookingCard: { marginBottom: 14, padding: 0, overflow: "hidden", borderRadius: 14 },
  cardHeaderBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  cardHeaderTitle: { fontSize: 14, fontWeight: "700", color: "#fff", flex: 1 },
  cardHeaderId: { fontSize: 11, color: "rgba(255,255,255,0.8)" },
  cardBody: { paddingHorizontal: 14, paddingVertical: 12 },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  divider: { marginVertical: 10 },
  datesRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  dateItem: { flex: 1 },
  dateLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "500", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.4 },
  dateValue: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#e0f2fe", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 12, color: "#0891b2", fontWeight: "600" },
  priceSection: { gap: 4 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  priceValue: { fontSize: 18, fontWeight: "800", color: "#0891b2" },
  priceSubLabel: { fontSize: 12, color: "#94a3b8" },
  priceSubValue: { fontSize: 13, fontWeight: "600", color: "#475569" },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, flex: 1 },
  btnPrimary: { backgroundColor: "#0891b2" },
  btnSecondary: { backgroundColor: "#e0f2fe", borderWidth: 1, borderColor: "#0891b2" },
  btnDanger: { backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#ef4444" },
  btnReview: { backgroundColor: "#f59e0b" },
  btnDining: { backgroundColor: "#ea580c" },
  btnTextLight: { fontSize: 12, fontWeight: "700", color: "#fff" },
  btnTextDark: { fontSize: 12, fontWeight: "700", color: "#0891b2" },
  btnTextDanger: { fontSize: 12, fontWeight: "700", color: "#ef4444" },
  refundBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  refundBadgePending: { backgroundColor: "#d97706" },
  refundBadgeCompleted: { backgroundColor: "#059669" },
  refundBadgeText: { fontSize: 11, fontWeight: "600", color: "#fff" },
});
