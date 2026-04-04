import { Button, Card, Divider, EmptyState, Header, Input, LoadingIndicator, StatusBadge } from "@/components";
import { bookingService } from "@/service/booking/bookingService";
import { supportService, type SupportTicket } from "@/service/support/supportService";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  OPEN: { bg: "#dbeafe", text: "#1d4ed8", label: "Mở" },
  IN_PROGRESS: { bg: "#fef3c7", text: "#d97706", label: "Đang xử lý" },
  RESOLVED: { bg: "#d1fae5", text: "#059669", label: "Đã giải quyết" },
  CLOSED: { bg: "#f3f4f6", text: "#6b7280", label: "Đã đóng" },
};

const QUICK_CATEGORIES = [
  { label: "Vệ sinh phòng", icon: "🧹" },
  { label: "Tiện nghi hỏng", icon: "🔧" },
  { label: "Thái độ nhân viên", icon: "👤" },
  { label: "Yêu cầu hoàn tiền", icon: "💰" },
  { label: "Khác", icon: "💬" },
];

export default function SupportScreen() {
  const [items, setItems] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  // Create ticket flow
  const [createStep, setCreateStep] = useState<0 | 1 | 2>(0); // 0=hidden, 1=select booking, 2=form
  const [eligibleBookings, setEligibleBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [selectedBookingName, setSelectedBookingName] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"HIGH" | "NORMAL" | "LOW">("NORMAL");

  const loadTickets = useCallback(async () => {
    try {
      const data = await supportService.getTickets();
      setItems(data || []);
    } catch (error) {
      showToast("Không thể tải danh sách ticket", "error");

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadTickets();
  }, [loadTickets]);

  const openCreateFlow = useCallback(async () => {
    setLoadingBookings(true);
    setCreateStep(1);
    try {
      const bookings = await bookingService.getMyBookings();
      setEligibleBookings(bookings.filter((b: any) => b.status === "COMPLETED" || b.status === "CHECKED_IN"));
    } catch {
      setEligibleBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  const handleSelectBooking = (id: string, name: string) => {
    setSelectedBookingId(id);
    setSelectedBookingName(name || "Đặt phòng");
    setCreateStep(2);
  };

  const handleCreateTicket = useCallback(async () => {
    if (!title.trim() || !description.trim()) {
      showToast("Vui lòng điền đầy đủ thông tin", "warning");
      return;
    }
    try {
      setSending(true);
      await supportService.createTicket({ title, description, priority, bookingId: selectedBookingId || undefined });
      setCreateStep(0);
      setTitle(""); setDescription(""); setPriority("NORMAL");
      setSelectedBookingId(""); setSelectedBookingName("");
      showToast("Tạo ticket thành công", "success");
      loadTickets();
    } catch (e: any) {
      showToast(e?.message || "Không thể tạo ticket", "error");
    } finally {
      setSending(false);
    }
  }, [title, description, priority, selectedBookingId, loadTickets]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !selectedTicket) return;
    try {
      setSending(true);
      await supportService.sendMessage(selectedTicket.id, { message: messageText });
      setMessageText("");
      Keyboard.dismiss();
      const updated = await supportService.getTicketDetail(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      showToast("Gửi tin nhắn thành công", "success");
    } catch {
      showToast("Không thể gửi tin nhắn", "error");
    } finally {
      setSending(false);
    }
  }, [messageText, selectedTicket]);

  const handleCloseTicket = useCallback(async () => {
    if (!selectedTicket) return;
    try {
      setClosing(true);
      const res = await supportService.closeTicket(selectedTicket.id);
      if (res.success) {
        showToast("Đã đóng ticket", "success");
        const updated = await supportService.getTicketDetail(selectedTicket.id);
        if (updated) setSelectedTicket(updated);
        loadTickets();
      }
    } catch {
      showToast("Không thể đóng ticket", "error");
    } finally {
      setClosing(false);
    }
  }, [selectedTicket, loadTickets]);

  // ── Ticket Detail View ──────────────────────────────────────────────────────
  if (selectedTicket) {
    const isClosed = selectedTicket.status === "CLOSED" || selectedTicket.status === "RESOLVED";
    const statusCfg = STATUS_COLOR[selectedTicket.status] ?? STATUS_COLOR.OPEN;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedTicket(null)}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.detailHeaderInfo}>
            <Text style={styles.detailTitle} numberOfLines={1}>{selectedTicket.title}</Text>
            <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusPillText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
            </View>
          </View>
          {!isClosed && (
            <TouchableOpacity
              style={styles.closeTicketBtn}
              onPress={handleCloseTicket}
              disabled={closing}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#059669" />
              <Text style={styles.closeTicketText}>{closing ? "..." : "Đóng"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        {selectedTicket.description ? (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionLabel}>Mô tả vấn đề</Text>
            <Text style={styles.descriptionText}>{selectedTicket.description}</Text>
          </View>
        ) : null}

        <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesList}>
          {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
            <View style={styles.emptyMessages}>
              <MaterialCommunityIcons name="message-outline" size={40} color="#cbd5e1" />
              <Text style={styles.emptyMessagesText}>Chưa có tin nhắn nào</Text>
            </View>
          )}
          {(selectedTicket.messages || []).map((msg) => {
            const isCustomer = msg.sender === "CUSTOMER";
            return (
              <View key={msg.id} style={[styles.msgRow, isCustomer && styles.msgRowRight]}>
                <View style={[styles.msgBubble, isCustomer ? styles.msgBubbleCustomer : styles.msgBubbleStaff]}>
                  {!isCustomer && <Text style={styles.msgSenderName}>Nhân viên hỗ trợ</Text>}
                  <Text style={[styles.msgText, isCustomer && styles.msgTextCustomer]}>{msg.message}</Text>
                  <Text style={[styles.msgTime, isCustomer && styles.msgTimeCustomer]}>
                    {new Date(msg.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.inputArea}>
          {isClosed ? (
            <Text style={styles.closedNote}>Ticket này đã đóng.</Text>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.msgInput}
                placeholder="Nhập tin nhắn..."
                value={messageText}
                onChangeText={setMessageText}
                multiline
                editable={!sending}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!messageText.trim() || sending) && styles.sendBtnDisabled]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sending}
              >
                <MaterialCommunityIcons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Create Ticket — Step 1: Select Booking ──────────────────────────────────
  if (createStep === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setCreateStep(0)}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Chọn lượt ở</Text>
        </View>
        {loadingBookings ? (
          <LoadingIndicator />
        ) : eligibleBookings.length === 0 ? (
          <View style={styles.emptyMessages}>
            <MaterialCommunityIcons name="calendar-remove-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyMessagesText}>Không có lượt ở phù hợp</Text>
            <Text style={styles.emptyMessagesSubText}>Chỉ có thể gửi khiếu nại cho lượt ở đang diễn ra hoặc đã hoàn thành</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {eligibleBookings.map((b: any) => (
              <TouchableOpacity
                key={b.id}
                style={styles.bookingSelectItem}
                onPress={() => handleSelectBooking(b.id, b.homestayName)}
                activeOpacity={0.7}
              >
                <View style={styles.bookingSelectIcon}>
                  <MaterialCommunityIcons name="home-outline" size={22} color="#0891b2" />
                </View>
                <View style={styles.bookingSelectInfo}>
                  <Text style={styles.bookingSelectName} numberOfLines={1}>{b.homestayName || "Đặt phòng"}</Text>
                  <Text style={styles.bookingSelectDate}>
                    {new Date(b.checkIn).toLocaleDateString("vi-VN")} – {new Date(b.checkOut).toLocaleDateString("vi-VN")}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: b.status === "CHECKED_IN" ? "#dbeafe" : "#d1fae5", alignSelf: "flex-start", marginTop: 4 }]}>
                    <Text style={[styles.statusPillText, { color: b.status === "CHECKED_IN" ? "#1d4ed8" : "#059669" }]}>
                      {b.status === "CHECKED_IN" ? "Đang ở" : "Đã hoàn thành"}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ── Create Ticket — Step 2: Form ────────────────────────────────────────────
  if (createStep === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setCreateStep(1)}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Chi tiết khiếu nại</Text>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
            {/* Selected booking */}
            <TouchableOpacity style={styles.selectedBookingBox} onPress={() => setCreateStep(1)}>
              <MaterialCommunityIcons name="home-outline" size={18} color="#0891b2" />
              <Text style={styles.selectedBookingName} numberOfLines={1}>{selectedBookingName}</Text>
              <Text style={styles.changeText}>Đổi</Text>
            </TouchableOpacity>

            {/* Category chips */}
            <View>
              <Text style={styles.formLabel}>Loại vấn đề</Text>
              <View style={styles.categoryGrid}>
                {QUICK_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.label}
                    style={[styles.categoryChip, title === cat.label && styles.categoryChipActive]}
                    onPress={() => setTitle(cat.label)}
                  >
                    <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                    <Text style={[styles.categoryChipText, title === cat.label && styles.categoryChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input label="Tiêu đề *" placeholder="Mô tả ngắn gọn vấn đề" value={title} onChangeText={setTitle} editable={!sending} />
            <Input label="Mô tả chi tiết *" placeholder="Mô tả chi tiết vấn đề..." value={description} onChangeText={setDescription} multiline numberOfLines={4} editable={!sending} />

            {/* Priority */}
            <View>
              <Text style={styles.formLabel}>Mức độ ưu tiên</Text>
              <View style={styles.priorityRow}>
                {(["LOW", "NORMAL", "HIGH"] as const).map((p) => {
                  const cfg = { LOW: { label: "Thấp", color: "#6b7280" }, NORMAL: { label: "Bình thường", color: "#2563eb" }, HIGH: { label: "Khẩn cấp", color: "#dc2626" } }[p];
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.priorityBtn, priority === p && { borderColor: cfg.color, backgroundColor: `${cfg.color}12` }]}
                      onPress={() => setPriority(p)}
                    >
                      <View style={[styles.priorityDot, { backgroundColor: priority === p ? cfg.color : "#d1d5db" }]} />
                      <Text style={[styles.priorityBtnText, priority === p && { color: cfg.color, fontWeight: "700" }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Button title={sending ? "Đang gửi..." : "Gửi khiếu nại"} onPress={handleCreateTicket} loading={sending} disabled={sending} size="large" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Main List ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Hỗ Trợ" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Hỗ Trợ" />
      <View style={styles.createBtnWrapper}>
        <TouchableOpacity style={styles.createBtn} onPress={openCreateFlow}>
          <MaterialCommunityIcons name="plus" size={18} color="#fff" />
          <Text style={styles.createBtnText}>Gửi khiếu nại mới</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const statusCfg = STATUS_COLOR[item.status] ?? STATUS_COLOR.OPEN;
          return (
            <Card style={styles.ticketCard} onPress={() => setSelectedTicket(item)}>
              <View style={styles.ticketCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketId}>#{item.id.slice(0, 8)}</Text>
                  <Text style={styles.ticketTitle} numberOfLines={2}>{item.title}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[styles.statusPillText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
                </View>
              </View>
              <Divider style={{ marginVertical: 8 }} />
              <View style={styles.ticketFooter}>
                <View style={styles.priorityBadge}>
                  <MaterialCommunityIcons name="flag-outline" size={12} color="#64748b" />
                  <Text style={styles.priorityText}>{item.priority || "NORMAL"}</Text>
                </View>
                <Text style={styles.msgCount}>{(item.messages || []).length} tin nhắn</Text>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="headphones-off"
            title="Chưa có ticket"
            description="Tạo ticket để liên hệ với đội hỗ trợ"
          />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0891b2" />}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : { padding: 16, gap: 10 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  createBtnWrapper: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0891b2", borderRadius: 12, paddingVertical: 12 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  ticketCard: { marginBottom: 0 },
  ticketCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  ticketId: { fontSize: 11, color: "#94a3b8", marginBottom: 4 },
  ticketTitle: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  ticketFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priorityBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  priorityText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  msgCount: { fontSize: 12, color: "#94a3b8" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },

  // Detail
  detailHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  detailHeaderInfo: { flex: 1, gap: 4 },
  detailTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#0f172a" },
  closeTicketBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#d1fae5", backgroundColor: "#f0fdf4" },
  closeTicketText: { fontSize: 12, fontWeight: "600", color: "#059669" },
  descriptionBox: { backgroundColor: "#eff6ff", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#dbeafe" },
  descriptionLabel: { fontSize: 11, fontWeight: "700", color: "#3b82f6", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  descriptionText: { fontSize: 13, color: "#1e40af", lineHeight: 20 },
  messagesContainer: { flex: 1 },
  messagesList: { padding: 16, gap: 10 },
  emptyMessages: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60 },
  emptyMessagesText: { fontSize: 15, fontWeight: "600", color: "#94a3b8" },
  emptyMessagesSubText: { fontSize: 13, color: "#cbd5e1", textAlign: "center", paddingHorizontal: 32 },
  msgRow: { alignItems: "flex-start" },
  msgRowRight: { alignItems: "flex-end" },
  msgBubble: { maxWidth: "80%", borderRadius: 14, padding: 12 },
  msgBubbleCustomer: { backgroundColor: "#0891b2", borderBottomRightRadius: 4 },
  msgBubbleStaff: { backgroundColor: "#fff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  msgSenderName: { fontSize: 11, fontWeight: "700", color: "#0891b2", marginBottom: 4 },
  msgText: { fontSize: 14, color: "#1e293b", lineHeight: 20 },
  msgTextCustomer: { color: "#fff" },
  msgTime: { fontSize: 10, color: "#94a3b8", marginTop: 4 },
  msgTimeCustomer: { color: "rgba(255,255,255,0.7)", textAlign: "right" },
  inputArea: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingHorizontal: 12, paddingVertical: 10 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgInput: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100, backgroundColor: "#f8fafc" },
  sendBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#0891b2", justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { opacity: 0.4 },
  closedNote: { textAlign: "center", fontSize: 13, color: "#94a3b8", paddingVertical: 12 },

  // Booking select
  bookingSelectItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  bookingSelectIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#e0f2fe", justifyContent: "center", alignItems: "center" },
  bookingSelectInfo: { flex: 1 },
  bookingSelectName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  bookingSelectDate: { fontSize: 12, color: "#64748b", marginTop: 2 },

  // Create form
  selectedBookingBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#e0f2fe", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#bae6fd" },
  selectedBookingName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#0369a1" },
  changeText: { fontSize: 12, color: "#0891b2", fontWeight: "600" },
  formLabel: { fontSize: 14, fontWeight: "600", color: "#1e293b", marginBottom: 10 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  categoryChipActive: { borderColor: "#0891b2", backgroundColor: "#e0f2fe" },
  categoryChipIcon: { fontSize: 14 },
  categoryChipText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  categoryChipTextActive: { color: "#0891b2", fontWeight: "700" },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityBtnText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
});
