import { diningService, type AvailableTimeSlot, type DiningCombo, type DiningOrder, type ServeLocation } from "@/service/dining/diningService";
import { bookingService } from "@/service/booking/bookingService";
import { publicHomestayService } from "@/service/homestay/publicHomestayService";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { Booking } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const dateISO = (d: Date) => d.toISOString().slice(0, 10);
const timeLabel = (t: string) => String(t || "").slice(0, 5);
const fmtVND = (n: number) => `₫${Number(n || 0).toLocaleString("vi-VN")}`;

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "Chờ xác nhận", color: "#d97706", bg: "#fef3c7" },
  PREPARING: { label: "Đang làm",     color: "#2563eb", bg: "#dbeafe" },
  SERVED:    { label: "Đã phục vụ",   color: "#059669", bg: "#d1fae5" },
  CANCELLED: { label: "Đã hủy",       color: "#64748b", bg: "#f1f5f9" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ComboCard({ combo, selected, onPress }: { combo: DiningCombo; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.comboCard, selected && styles.comboCardSelected]}
      activeOpacity={0.8}
    >
      {combo.imageUrl ? (
        <Image source={{ uri: combo.imageUrl }} style={styles.comboImg} resizeMode="cover" />
      ) : (
        <View style={[styles.comboImg, styles.comboImgPlaceholder]}>
          <MaterialCommunityIcons name="food" size={28} color="#94a3b8" />
        </View>
      )}
      <View style={styles.comboInfo}>
        <Text style={styles.comboName} numberOfLines={1}>{combo.name}</Text>
        <Text style={styles.comboDesc} numberOfLines={2}>{combo.description}</Text>
        <View style={styles.comboMeta}>
          <Text style={styles.comboPrice}>{fmtVND(combo.price)}</Text>
          <Text style={styles.comboPeople}>· Tối đa {combo.maxPeople} người</Text>
        </View>
      </View>
      {selected && (
        <View style={styles.comboCheck}>
          <MaterialCommunityIcons name="check-circle" size={22} color="#0891b2" />
        </View>
      )}
    </TouchableOpacity>
  );
}

function SlotButton({ slot, selected, onPress }: { slot: AvailableTimeSlot; selected: boolean; onPress: () => void }) {
  const disabled = !slot.isAvailable;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.slotBtn, selected && styles.slotBtnSelected, disabled && styles.slotBtnDisabled]}
      activeOpacity={0.7}
    >
      <Text style={[styles.slotTime, selected && styles.slotTimeSelected, disabled && styles.slotTimeDisabled]}>
        {timeLabel(slot.startTime)}
      </Text>
      <Text style={[styles.slotSub, disabled && styles.slotSubDisabled]}>
        {disabled ? (slot.disableReason || "Không khả dụng") : `Còn ${slot.remainingCapacity}`}
      </Text>
    </TouchableOpacity>
  );
}

function OrderItem({ order, onCancel }: { order: DiningOrder; onCancel: () => void }) {
  const st = String(order.status || "").toUpperCase();
  const cfg = STATUS_CFG[st] ?? STATUS_CFG.PENDING;
  const canCancel = st === "PENDING";

  return (
    <View style={styles.orderCard}>
      {order.imageUrl ? (
        <Image source={{ uri: order.imageUrl }} style={styles.orderImg} resizeMode="cover" />
      ) : (
        <View style={[styles.orderImg, styles.comboImgPlaceholder]}>
          <MaterialCommunityIcons name="food" size={20} color="#94a3b8" />
        </View>
      )}
      <View style={styles.orderInfo}>
        <Text style={styles.orderName} numberOfLines={1}>{order.comboName}</Text>
        <Text style={styles.orderMeta}>
          {String(order.orderDate || "").slice(0, 10)} · {timeLabel(order.startTime)}
        </Text>
        <Text style={styles.orderMeta}>
          {order.serveLocation === "BEACH" ? "Bãi biển" : "Phòng"} · {fmtVND(order.price)}
        </Text>
        {!!order.note && <Text style={styles.orderNote} numberOfLines={1}>Ghi chú: {order.note}</Text>}
      </View>
      <View style={styles.orderRight}>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {canCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} activeOpacity={0.8}>
            <MaterialCommunityIcons name="close-circle-outline" size={14} color="#dc2626" />
            <Text style={styles.cancelBtnText}>Hủy</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Date Picker Modal ────────────────────────────────────────────────────────

function DatePickerModal({ visible, current, checkIn, checkOut, onSelect, onClose }: {
  visible: boolean;
  current: string;
  checkIn: string;
  checkOut: string;
  onSelect: (d: string) => void;
  onClose: () => void;
}) {
  const dates: string[] = [];
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(dateISO(new Date(d)));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Chọn ngày phục vụ</Text>
          <ScrollView>
            {dates.map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => { onSelect(d); onClose(); }}
                style={[styles.dateRow, d === current && styles.dateRowSelected]}
              >
                <Text style={[styles.dateRowText, d === current && styles.dateRowTextSelected]}>
                  {new Date(d).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                </Text>
                {d === current && <MaterialCommunityIcons name="check" size={18} color="#0891b2" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BookingDiningScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params ?? {};

  const [booking, setBooking] = useState<Booking | null>(null);
  const [homestay, setHomestay] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [combos, setCombos] = useState<DiningCombo[]>([]);
  const [slots, setSlots] = useState<AvailableTimeSlot[]>([]);
  const [orders, setOrders] = useState<DiningOrder[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [date, setDate] = useState(dateISO(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedComboId, setSelectedComboId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [serveLocation, setServeLocation] = useState<ServeLocation>("ROOM");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedCombo = useMemo(() => combos.find((c) => c.id === selectedComboId) ?? null, [combos, selectedComboId]);
  const selectedSlot = useMemo(() => slots.find((s) => s.id === selectedSlotId) ?? null, [slots, selectedSlotId]);

  const load = useCallback(async () => {
    if (!bookingId) { navigation.goBack(); return; }
    setLoading(true);
    try {
      const detail = await bookingService.getBookingDetail(bookingId);
      if (!detail) { showToast("Không tìm thấy booking", "error"); navigation.goBack(); return; }
      setBooking(detail);

      const [hs, comboList] = await Promise.all([
        publicHomestayService.getById(detail.homestayId).catch(() => null),
        diningService.getCombos(detail.homestayId),
      ]);
      setHomestay(hs);
      setCombos(comboList);
      if (comboList.length > 0) setSelectedComboId(comboList[0].id);

      // Load existing orders from booking detail
      const anyDetail = detail as any;
      const rawOrders: any[] = anyDetail?.diningOrders ?? anyDetail?.DiningOrders ?? [];
      if (Array.isArray(rawOrders)) {
        setOrders(rawOrders.map((o: any) => ({
          id: String(o?.id ?? o?.Id ?? ""),
          comboName: String(o?.comboName ?? o?.ComboName ?? ""),
          imageUrl: o?.imageUrl ?? o?.ImageUrl,
          orderDate: String(o?.orderDate ?? o?.OrderDate ?? ""),
          startTime: String(o?.startTime ?? o?.StartTime ?? "").slice(0, 5),
          serveLocation: String(o?.serveLocation ?? o?.ServeLocation ?? "ROOM"),
          status: String(o?.status ?? o?.Status ?? "PENDING"),
          price: Number(o?.price ?? o?.Price ?? 0),
          paymentStatus: String(o?.paymentStatus ?? o?.PaymentStatus ?? ""),
          note: o?.note ?? o?.Note,
        })));
      }
    } catch (e: any) {
      showToast(e?.message || "Không thể tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  const loadSlots = useCallback(async (homestayId: string, d: string) => {
    setLoadingSlots(true);
    try {
      const list = await diningService.getAvailableSlots(homestayId, d);
      setSlots(list);
      if (selectedSlotId && !list.some((s) => s.id === selectedSlotId && s.isAvailable)) {
        setSelectedSlotId("");
      }
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedSlotId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (booking?.homestayId && date) loadSlots(booking.homestayId, date);
  }, [booking?.homestayId, date]);

  const placeOrder = async () => {
    if (!booking || !selectedComboId || !selectedSlotId) return;
    if (selectedSlot && !selectedSlot.isAvailable) {
      showToast(selectedSlot.disableReason || "Khung giờ không khả dụng", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await diningService.createOrder({
        bookingId: booking.id,
        comboId: selectedComboId,
        timeSlotId: selectedSlotId,
        orderDate: date,
        serveLocation,
        note: note.trim() || undefined,
      });
      if (res.success) {
        showToast("Đặt món thành công! Tiền sẽ cộng vào hóa đơn phòng.", "success");
        setNote("");
        setSelectedSlotId("");
        await load();
        if (booking.homestayId) await loadSlots(booking.homestayId, date);
      } else {
        showToast(res.message, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    const res = await diningService.cancelOrder(orderId);
    if (res.success) {
      showToast("Đã hủy món. Tiền đã được trừ khỏi hóa đơn.", "success");
      await load();
    } else {
      showToast(res.message, "error");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đặt món ăn</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0891b2" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {homestay?.name ?? booking?.homestayName ?? "Đặt món ăn"}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#0891b2" />
          <Text style={styles.infoBannerText}>
            Tiền món ăn sẽ được cộng vào hóa đơn phòng khi checkout. Không cần thanh toán ngay.
          </Text>
        </View>

        {/* Section: Chọn ngày */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ngày phục vụ</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerBtn}>
            <MaterialCommunityIcons name="calendar" size={18} color="#0891b2" />
            <Text style={styles.datePickerText}>
              {new Date(date).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Section: Vị trí phục vụ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vị trí phục vụ</Text>
          <View style={styles.locationRow}>
            <TouchableOpacity
              onPress={() => setServeLocation("ROOM")}
              style={[styles.locationBtn, serveLocation === "ROOM" && styles.locationBtnSelected]}
            >
              <MaterialCommunityIcons name="bed-outline" size={18} color={serveLocation === "ROOM" ? "#0891b2" : "#64748b"} />
              <Text style={[styles.locationBtnText, serveLocation === "ROOM" && styles.locationBtnTextSelected]}>Phòng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setServeLocation("BEACH")}
              style={[styles.locationBtn, serveLocation === "BEACH" && styles.locationBtnSelected]}
            >
              <MaterialCommunityIcons name="beach" size={18} color={serveLocation === "BEACH" ? "#0891b2" : "#64748b"} />
              <Text style={[styles.locationBtnText, serveLocation === "BEACH" && styles.locationBtnTextSelected]}>Bãi biển</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Chọn món */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn món ({combos.length} món)</Text>
          {combos.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="food-off" size={32} color="#94a3b8" />
              <Text style={styles.emptyText}>Homestay này chưa có menu</Text>
            </View>
          ) : (
            combos.map((c) => (
              <ComboCard key={c.id} combo={c} selected={c.id === selectedComboId} onPress={() => setSelectedComboId(c.id)} />
            ))
          )}
        </View>

        {/* Section: Khung giờ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Khung giờ phục vụ</Text>
          {loadingSlots ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color="#0891b2" />
              <Text style={styles.loadingText}>Đang tải khung giờ...</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="clock-remove-outline" size={32} color="#94a3b8" />
              <Text style={styles.emptyText}>Không có khung giờ khả dụng cho ngày này</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((s) => (
                <SlotButton key={s.id} slot={s} selected={s.id === selectedSlotId} onPress={() => setSelectedSlotId(s.id)} />
              ))}
            </View>
          )}
        </View>

        {/* Section: Ghi chú */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú (tuỳ chọn)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="VD: ít cay, không hành..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            style={styles.noteInput}
          />
        </View>

        {/* Summary + Order button */}
        {selectedCombo && (
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Món đã chọn</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{selectedCombo.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Khung giờ</Text>
              <Text style={styles.summaryValue}>{selectedSlot ? timeLabel(selectedSlot.startTime) : "Chưa chọn"}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vị trí</Text>
              <Text style={styles.summaryValue}>{serveLocation === "BEACH" ? "Bãi biển" : "Phòng"}</Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 4 }]}>
              <Text style={[styles.summaryLabel, { fontWeight: "700" }]}>Tạm tính</Text>
              <Text style={styles.summaryTotal}>{fmtVND(selectedCombo.price)}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={placeOrder}
          disabled={submitting || !selectedComboId || !selectedSlotId}
          style={[styles.orderBtn, (submitting || !selectedComboId || !selectedSlotId) && styles.orderBtnDisabled]}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
          )}
          <Text style={styles.orderBtnText}>{submitting ? "Đang đặt..." : "Chốt đơn"}</Text>
        </TouchableOpacity>

        {/* Section: Đơn đã đặt */}
        {orders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đơn đã đặt ({orders.length})</Text>
            <Text style={styles.sectionSubtitle}>Chỉ hủy được khi đơn đang "Chờ xác nhận" và chưa quá giờ chốt.</Text>
            {orders
              .slice()
              .sort((a, b) => String(b.orderDate).localeCompare(String(a.orderDate)))
              .map((o) => (
                <OrderItem key={o.id} order={o} onCancel={() => cancelOrder(o.id)} />
              ))}
          </View>
        )}
      </ScrollView>

      {/* Date picker modal */}
      {booking && (
        <DatePickerModal
          visible={showDatePicker}
          current={date}
          checkIn={booking.checkIn}
          checkOut={booking.checkOut}
          onSelect={setDate}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { alignItems: "center", justifyContent: "center", paddingVertical: 24, gap: 8 },
  loadingText: { fontSize: 14, color: "#64748b" },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#0f172a" },

  infoBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#e0f2fe", margin: 16, borderRadius: 12, padding: 12,
  },
  infoBannerText: { flex: 1, fontSize: 13, color: "#0369a1", lineHeight: 18 },

  section: { paddingHorizontal: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 10, marginTop: 8 },
  sectionSubtitle: { fontSize: 12, color: "#64748b", marginBottom: 10, marginTop: -6 },

  datePickerBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  datePickerText: { flex: 1, fontSize: 14, color: "#0f172a", fontWeight: "600" },

  locationRow: { flexDirection: "row", gap: 10 },
  locationBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff",
  },
  locationBtnSelected: { borderColor: "#0891b2", backgroundColor: "#e0f2fe" },
  locationBtnText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  locationBtnTextSelected: { color: "#0891b2" },

  comboCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1.5, borderColor: "#e2e8f0",
  },
  comboCardSelected: { borderColor: "#0891b2", backgroundColor: "#f0f9ff" },
  comboImg: { width: 72, height: 72, borderRadius: 10, backgroundColor: "#f1f5f9" },
  comboImgPlaceholder: { justifyContent: "center", alignItems: "center" },
  comboInfo: { flex: 1 },
  comboName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  comboDesc: { fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 16 },
  comboMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  comboPrice: { fontSize: 14, fontWeight: "800", color: "#0891b2" },
  comboPeople: { fontSize: 12, color: "#94a3b8" },
  comboCheck: { paddingLeft: 4 },

  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slotBtn: {
    width: "30%", paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff", alignItems: "center",
  },
  slotBtnSelected: { borderColor: "#0891b2", backgroundColor: "#e0f2fe" },
  slotBtnDisabled: { backgroundColor: "#f8fafc", borderColor: "#f1f5f9" },
  slotTime: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  slotTimeSelected: { color: "#0891b2" },
  slotTimeDisabled: { color: "#cbd5e1" },
  slotSub: { fontSize: 11, color: "#64748b", marginTop: 2, textAlign: "center" },
  slotSubDisabled: { color: "#cbd5e1" },

  noteInput: {
    backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0",
    padding: 12, fontSize: 14, color: "#0f172a", textAlignVertical: "top", minHeight: 80,
  },

  summaryBox: {
    marginHorizontal: 16, marginTop: 8, backgroundColor: "#fff",
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#e2e8f0", gap: 8,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, color: "#64748b" },
  summaryValue: { fontSize: 13, fontWeight: "600", color: "#0f172a", maxWidth: "60%", textAlign: "right" },
  summaryTotal: { fontSize: 18, fontWeight: "800", color: "#0891b2" },

  orderBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: 16, marginTop: 16, paddingVertical: 16, borderRadius: 14,
    backgroundColor: "#0891b2",
  },
  orderBtnDisabled: { backgroundColor: "#94a3b8" },
  orderBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  orderCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  orderImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#f1f5f9" },
  orderInfo: { flex: 1 },
  orderName: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  orderMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  orderNote: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  orderRight: { alignItems: "flex-end", gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  cancelBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff5f5" },
  cancelBtnText: { fontSize: 11, fontWeight: "700", color: "#dc2626" },

  emptyBox: { alignItems: "center", paddingVertical: 24, gap: 8, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#f1f5f9" },
  emptyText: { fontSize: 13, color: "#94a3b8" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "70%" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 16 },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  dateRowSelected: { backgroundColor: "#f0f9ff" },
  dateRowText: { fontSize: 14, color: "#0f172a" },
  dateRowTextSelected: { color: "#0891b2", fontWeight: "700" },
});
