import { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { bookingService } from "@/service/booking/bookingService";
import type { Booking } from "@/types";
import {
  Header,
  StatusBadge,
  Button,
  EmptyState,
  Card,
  Divider,
  AlertDialog,
  LoadingIndicator,
} from "@/components";
import { showToast } from "@/utils/toast";
import { logger } from "@/utils/logger";

export default function BookingsScreen() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      const data = await bookingService.getMyBookings();
      setItems(data || []);
    } catch (error) {
      showToast("Không thể tải danh sách đặt phòng", "error");
      logger.error("Failed to load bookings", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings();
  }, [loadBookings]);

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
    } catch (error) {
      showToast("Lỗi khi hủy đặt phòng", "error");
    } finally {
      setCancelDialogVisible(false);
      setSelectedBookingId(null);
    }
  }, [selectedBookingId, loadBookings]);

  const getStatusIcon = (status: string) => {
    const statusMap: { [key: string]: string } = {
      PENDING: "clock-outline",
      CONFIRMED: "check-circle-outline",
      COMPLETED: "check-all",
      CANCELLED: "close-circle-outline",
      CHECKED_IN: "login",
      REJECTED: "alert-circle-outline",
    };
    return statusMap[status] || "help-circle-outline";
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN");
    } catch {
      return dateString;
    }
  };

  const getDaysDifference = (checkIn: string, checkOut: string) => {
    try {
      const start = new Date(checkIn).getTime();
      const end = new Date(checkOut).getTime();
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Đặt Phòng" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Đặt Phòng" />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const nights = getDaysDifference(item.checkIn, item.checkOut);

          return (
            <Card style={styles.bookingCard} onPress={() => { }}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.titleSection}>
                  <MaterialCommunityIcons
                    name={getStatusIcon(item.status)}
                    size={20}
                    color="#0891b2"
                  />
                  <View>
                    <Text style={styles.homestayName} numberOfLines={1}>
                      {item.homestayName || "Căn nhà"}
                    </Text>
                    <Text style={styles.bookingId}>#{item.id.slice(0, 8)}</Text>
                  </View>
                </View>
                <StatusBadge status={item.status} />
              </View>

              <Divider style={styles.cardDivider} />

              {/* Dates */}
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Nhận Phòng</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(item.checkIn)}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={16}
                  color="#cbd5e1"
                />
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Trả Phòng</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(item.checkOut)}
                  </Text>
                </View>
              </View>

              {/* Nights */}
              <View style={styles.nightsRow}>
                <MaterialCommunityIcons
                  name="moon-waning-crescent"
                  size={16}
                  color="#64748b"
                />
                <Text style={styles.nightsText}>{nights} đêm</Text>
              </View>

              {/* Guests */}
              {item.guestsCount && (
                <View style={styles.guestsRow}>
                  <MaterialCommunityIcons
                    name="account-multiple"
                    size={16}
                    color="#64748b"
                  />
                  <Text style={styles.guestsText}>
                    {item.guestsCount} khách
                  </Text>
                </View>
              )}

              {/* Price Section */}
              <Divider style={styles.cardDivider} />
              <View style={styles.priceSection}>
                <View>
                  <Text style={styles.priceLabel}>Tổng Giá</Text>
                  <Text style={styles.priceValue}>
                    ₫{typeof item.totalPrice === "number"
                      ? item.totalPrice.toLocaleString("vi-VN")
                      : "0"}
                  </Text>
                </View>
                {item.paymentStatus && (
                  <StatusBadge status={item.paymentStatus} />
                )}
              </View>

              {/* Actions */}
              {item.status === "PENDING" && (
                <Button
                  title="Hủy Đặt Phòng"
                  variant="danger"
                  size="small"
                  onPress={() => {
                    setSelectedBookingId(item.id);
                    setCancelDialogVisible(true);
                  }}
                  style={styles.cancelButton}
                />
              )}
            </Card>
          );
        }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.summaryBox}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Tất Cả</Text>
                <Text style={styles.summaryValue}>{items.length}</Text>
              </View>
              <View style={styles.dividerV} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Chờ Xác Nhận</Text>
                <Text style={styles.summaryValue}>
                  {items.filter((i) => i.status === "PENDING").length}
                </Text>
              </View>
              <View style={styles.dividerV} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Hoàn Thành</Text>
                <Text style={styles.summaryValue}>
                  {items.filter((i) => i.status === "COMPLETED").length}
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Không có đặt phòng"
            description="Bạn chưa có đặt phòng nào. Hãy tìm và đặt một căn nhà hôm nay!"
            action={{
              label: "Tìm Căn Nhà",
              onPress: () => { },
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

      {/* Cancel Booking Confirmation */}
      <AlertDialog
        visible={cancelDialogVisible}
        title="Hủy Đặt Phòng"
        message="Bạn có chắc chắn muốn hủy đặt phòng này không?"
        confirmText="Hủy"
        cancelText="Đóng"
        confirmButtonColor="danger"
        onConfirm={handleCancelBooking}
        onCancel={() => {
          setCancelDialogVisible(false);
          setSelectedBookingId(null);
        }}
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
    marginBottom: 16,
  },
  summaryBox: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0891b2",
  },
  dividerV: {
    width: 1,
    backgroundColor: "#e2e8f0",
  },
  bookingCard: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  homestayName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
  },
  bookingId: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  cardDivider: {
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  nightsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  nightsText: {
    fontSize: 13,
    color: "#64748b",
  },
  guestsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  guestsText: {
    fontSize: 13,
    color: "#64748b",
  },
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0891b2",
  },
  cancelButton: {
    marginTop: 12,
  },
});
