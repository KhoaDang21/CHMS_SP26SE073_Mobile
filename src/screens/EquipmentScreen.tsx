import { Button, LoadingIndicator } from "@/components";
import {
    equipmentService,
    type EquipmentItem,
    type EquipmentRequest,
    type EquipmentRequestBatchPayload,
} from "@/service/equipment/equipmentService";
import type { Booking } from "@/types";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
    useFocusEffect,
    useNavigation,
    useRoute,
} from "@react-navigation/native";
import { useCallback, useState } from "react";
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

export default function EquipmentScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const booking = route.params?.booking as Booking;

  const [activeTab, setActiveTab] = useState<"available" | "requests">(
    "available",
  );
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load equipment danh sách + requests
  const loadData = useCallback(async () => {
    try {
      const [equipmentData, requestsData] = await Promise.all([
        booking?.homestayId
          ? equipmentService.getEquipmentByHomestay(booking.homestayId)
          : Promise.resolve([]),
        equipmentService.getEquipmentRequests(),
      ]);
      setEquipment(equipmentData);
      setRequests(requestsData);
      setSelectedItems({});
    } catch (error) {
      console.error("Error loading equipment:", error);
    }
  }, [booking?.homestayId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        try {
          await loadData();
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [loadData]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleSelectQuantity = (equipmentId: string, quantity: number) => {
    if (quantity <= 0) {
      const newSelected = { ...selectedItems };
      delete newSelected[equipmentId];
      setSelectedItems(newSelected);
    } else {
      setSelectedItems((prev) => ({
        ...prev,
        [equipmentId]: quantity,
      }));
    }
  };

  const handleSubmitRequest = useCallback(async () => {
    const items = Object.entries(selectedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([equipmentId, quantity]) => ({
        equipmentId,
        quantity,
      }));

    if (items.length === 0) {
      showToast("Vui lòng chọn ít nhất 1 đồ dùng", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload: EquipmentRequestBatchPayload = {
        bookingId: booking.id,
        items,
      };

      const result = await equipmentService.submitEquipmentRequest(payload);

      if (result.success) {
        showToast(result.message, "success");
        setSelectedItems({});
        // Optional: navigate back hoặc refresh
      } else {
        showToast(result.message, "error");
      }
    } finally {
      setSubmitting(false);
    }
  }, [selectedItems, booking.id]);

  const selectedCount = Object.values(selectedItems).reduce(
    (sum, qty) => sum + qty,
    0,
  );
  const totalFee = equipment.reduce((sum, item) => {
    const qty = selectedItems[item.id] ?? 0;
    return sum + item.rentalFee * qty;
  }, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerWrapper}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color="#0f172a"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mượn đồ dùng</Text>
          <View style={{ width: 40 }} />
        </View>
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrapper}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color="#0f172a"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mượn đồ dùng</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "available" && styles.tabActive]}
          onPress={() => setActiveTab("available")}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === "available" && styles.tabLabelActive,
            ]}
          >
            Đồ dùng ({equipment.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "requests" && styles.tabActive]}
          onPress={() => setActiveTab("requests")}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === "requests" && styles.tabLabelActive,
            ]}
          >
            Yêu cầu ({requests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Available Equipment Tab */}
      {activeTab === "available" && (
        <>
          <FlatList
            data={equipment}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EquipmentCard
                item={item}
                selectedQuantity={selectedItems[item.id] ?? 0}
                onQuantityChange={(qty) => handleSelectQuantity(item.id, qty)}
              />
            )}
            contentContainerStyle={styles.listContainer}
            scrollEnabled={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="inbox"
                  size={48}
                  color="#cbd5e1"
                />
                <Text style={styles.emptyText}>
                  Không có đồ dùng nào để mượn
                </Text>
              </View>
            }
          />

          {equipment.length > 0 && (
            <View style={styles.footer}>
              <View style={styles.summary}>
                <View>
                  <Text style={styles.summaryLabel}>Tổng số lượng</Text>
                  <Text style={styles.summaryValue}>{selectedCount}</Text>
                </View>
                <View>
                  <Text style={styles.summaryLabel}>Tổng tiền</Text>
                  <Text style={styles.summaryValue}>
                    {totalFee.toLocaleString("vi-VN")}đ
                  </Text>
                </View>
              </View>
              <Button
                title="Xác nhận mượn"
                disabled={selectedCount === 0 || submitting}
                loading={submitting}
                onPress={handleSubmitRequest}
                style={styles.submitButton}
              />
            </View>
          )}
        </>
      )}

      {/* My Requests Tab */}
      {activeTab === "requests" && (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RequestCard request={item} />}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="inbox" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Bạn chưa có yêu cầu mượn nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function EquipmentCard({
  item,
  selectedQuantity,
  onQuantityChange,
}: {
  item: EquipmentItem;
  selectedQuantity: number;
  onQuantityChange: (qty: number) => void;
}) {
  const isOutOfStock = item.availableQuantity <= 0;

  return (
    <View style={styles.card}>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.image} />
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text style={styles.itemName}>{item.name}</Text>
            {isOutOfStock && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Hết hàng</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemFee}>
            {item.rentalFee.toLocaleString("vi-VN")}đ
          </Text>
        </View>

        {item.description && (
          <Text style={styles.itemDescription}>{item.description}</Text>
        )}

        <View style={styles.quantityRow}>
          <Text style={styles.quantityLabel}>
            Còn: {item.availableQuantity}
          </Text>

          <View style={styles.quantityControl}>
            <TouchableOpacity
              disabled={selectedQuantity === 0 || isOutOfStock}
              onPress={() => onQuantityChange(selectedQuantity - 1)}
              style={styles.quantityButton}
            >
              <MaterialCommunityIcons
                name="minus"
                size={18}
                color={
                  selectedQuantity === 0 || isOutOfStock ? "#cbd5e1" : "#2563eb"
                }
              />
            </TouchableOpacity>

            <Text style={styles.quantityValue}>{selectedQuantity}</Text>

            <TouchableOpacity
              disabled={
                selectedQuantity >= item.availableQuantity || isOutOfStock
              }
              onPress={() => onQuantityChange(selectedQuantity + 1)}
              style={styles.quantityButton}
            >
              <MaterialCommunityIcons
                name="plus"
                size={18}
                color={
                  selectedQuantity >= item.availableQuantity || isOutOfStock
                    ? "#cbd5e1"
                    : "#2563eb"
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function RequestCard({ request }: { request: EquipmentRequest }) {
  const statusConfig: Record<
    string,
    { label: string; color: string; bgColor: string }
  > = {
    PENDING: {
      label: "Chờ duyệt",
      color: "#d97706",
      bgColor: "#fef3c7",
    },
    HANDED_OVER: {
      label: "Đang mượn",
      color: "#059669",
      bgColor: "#d1fae5",
    },
    REJECTED: {
      label: "Bị từ chối",
      color: "#dc2626",
      bgColor: "#fee2e2",
    },
    RETURNED: {
      label: "Đã trả",
      color: "#0891b2",
      bgColor: "#cffafe",
    },
  };

  const cfg = statusConfig[request.status] || statusConfig.PENDING;

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestEquipment}>{request.equipmentName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bgColor }]}>
          <Text style={[styles.statusBadgeText, { color: cfg.color }]}>
            {cfg.label}
          </Text>
        </View>
      </View>

      <View style={styles.requestRow}>
        <Text style={styles.requestLabel}>Số lượng</Text>
        <Text style={styles.requestValue}>{request.quantity} cái</Text>
      </View>

      <View style={styles.requestRow}>
        <Text style={styles.requestLabel}>Ngày yêu cầu</Text>
        <Text style={styles.requestValue}>
          {request.requestedAt
            ? new Date(request.requestedAt).toLocaleDateString("vi-VN")
            : "-"}
        </Text>
      </View>

      {request.status === "HANDED_OVER" && request.handedOverAt && (
        <View style={styles.requestRow}>
          <Text style={styles.requestLabel}>Ngày mượn</Text>
          <Text style={styles.requestValue}>
            {new Date(request.handedOverAt).toLocaleDateString("vi-VN")}
          </Text>
        </View>
      )}

      {request.status === "RETURNED" && request.returnedAt && (
        <View style={styles.requestRow}>
          <Text style={styles.requestLabel}>Ngày trả</Text>
          <Text style={styles.requestValue}>
            {new Date(request.returnedAt).toLocaleDateString("vi-VN")}
          </Text>
        </View>
      )}

      {request.status === "REJECTED" && request.rejectionReason && (
        <View style={styles.requestRow}>
          <Text style={styles.requestLabel}>Lý do từ chối</Text>
          <Text style={[styles.requestValue, { color: "#dc2626" }]}>
            {request.rejectionReason}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  tabsWrapper: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#2563eb",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
    textAlign: "center",
  },
  tabLabelActive: {
    color: "#2563eb",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  image: {
    width: "100%",
    height: 160,
    backgroundColor: "#f1f5f9",
  },
  cardContent: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  outOfStockBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outOfStockText: {
    fontSize: 11,
    color: "#dc2626",
    fontWeight: "500",
  },
  itemFee: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
  },
  itemDescription: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 8,
    lineHeight: 18,
  },
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    backgroundColor: "#f9fafb",
  },
  quantityButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  quantityValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
    minWidth: 32,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    padding: 16,
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  submitButton: {
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 8,
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  requestEquipment: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  requestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  requestLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  requestValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
});
