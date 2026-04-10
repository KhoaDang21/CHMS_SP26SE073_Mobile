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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
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
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={[styles.detailHeader, { paddingTop: insets.top + 14 }]}>
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
              <Text style={styles.closeTicketText}>{closing ? "..." : "Xong"}</Text>
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

        <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesList} showsVerticalScrollIndicator={false}>
          {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
            <View style={styles.emptyMessages}>
              <MaterialCommunityIcons name="message-outline" size={40} color="#cbd5e1" />
              <Text style={styles.emptyMessagesText}>Chưa có phản hồi nào</Text>
            </View>
          )}
          {(selectedTicket.messages || []).map((msg) => {
            const isCustomer = msg.sender === "CUSTOMER";
            return (
              <View key={msg.id} style={[styles.msgRow, isCustomer && styles.msgRowRight]}>
                <View style={[styles.msgBubble, isCustomer ? styles.msgBubbleCustomer : styles.msgBubbleStaff]}>
                  {!isCustomer && <Text style={styles.msgSenderName}>Hỗ trợ viên</Text>}
                  <Text style={[styles.msgText, isCustomer && styles.msgTextCustomer]}>{msg.message}</Text>
                  <Text style={[styles.msgTime, isCustomer && styles.msgTimeCustomer]}>
                    {new Date(msg.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {isClosed ? (
              <Text style={styles.closedNote}>Ticket này đã được giải quyết và đóng.</Text>
            ) : (
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.msgInput}
                  placeholder="Nhập nội dung phản hồi..."
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  placeholderTextColor="#94a3b8"
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
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Create Ticket — Step 1: Select Booking ──────────────────────────────────
  if (createStep === 1) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={[styles.detailHeader, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setCreateStep(0)}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Chọn lượt lưu trú cần hỗ trợ</Text>
        </View>
        {loadingBookings ? (
          <LoadingIndicator />
        ) : eligibleBookings.length === 0 ? (
          <View style={styles.emptyMessages}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="calendar-remove-outline" size={48} color="#94a3b8" />
            </View>
            <Text style={styles.emptyMessagesText}>Không tìm thấy lượt lưu trú</Text>
            <Text style={styles.emptyMessagesSubText}>Chỉ có thể khiếu nại cho lượt ở đang diễn ra hoặc đã hoàn thành.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {eligibleBookings.map((b: any) => (
              <TouchableOpacity
                key={b.id}
                style={styles.bookingSelectItem}
                onPress={() => handleSelectBooking(b.id, b.homestayName)}
                activeOpacity={0.7}
              >
                <View style={styles.bookingSelectIcon}>
                  <MaterialCommunityIcons name="home-city-outline" size={24} color="#0891b2" />
                </View>
                <View style={styles.bookingSelectInfo}>
                  <Text style={styles.bookingSelectName} numberOfLines={1}>{b.homestayName || "Đặt phòng"}</Text>
                  <Text style={styles.bookingSelectDate}>
                    {new Date(b.checkIn).toLocaleDateString("vi-VN")} – {new Date(b.checkOut).toLocaleDateString("vi-VN")}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: b.status === "CHECKED_IN" ? "#e0f2fe" : "#ecfeff", alignSelf: "flex-start", marginTop: 6 }]}>
                    <Text style={[styles.statusPillText, { color: b.status === "CHECKED_IN" ? "#0369a1" : "#0891b2" }]}>
                      {b.status === "CHECKED_IN" ? "Đang lưu trú" : "Đã hoàn thành"}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
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
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={[styles.detailHeader, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setCreateStep(1)}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Nội dung hỗ trợ</Text>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* Selected booking */}
            <View style={styles.selectedBookingBox}>
              <MaterialCommunityIcons name="home-outline" size={18} color="#0369a1" />
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedBookingLabel}>Cần hỗ trợ cho:</Text>
                <Text style={styles.selectedBookingName} numberOfLines={1}>{selectedBookingName}</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateStep(1)} style={styles.changeBtn}>
                <Text style={styles.changeText}>Thay đổi</Text>
              </TouchableOpacity>
            </View>

            {/* Category chips */}
            <View>
              <Text style={styles.formLabel}>Bạn đang gặp vấn đề gì?</Text>
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

            <Input label="Tiêu đề yêu cầu" placeholder="Ví dụ: Không có nước nóng" value={title} onChangeText={setTitle} editable={!sending} />
            <Input label="Chi tiết vấn đề" placeholder="Mô tả cụ thể vấn đề của bạn để chúng tôi hỗ trợ tốt nhất..." value={description} onChangeText={setDescription} multiline numberOfLines={5} editable={!sending} />

            {/* Priority */}
            <View>
              <Text style={styles.formLabel}>Mức độ cần thiết</Text>
              <View style={styles.priorityRow}>
                {(["LOW", "NORMAL", "HIGH"] as const).map((p) => {
                  const cfg = { LOW: { label: "Thấp", color: "#64748b" }, NORMAL: { label: "Vừa", color: "#0891b2" }, HIGH: { label: "Gấp", color: "#ef4444" } }[p];
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.priorityBtn, priority === p && { borderColor: cfg.color, backgroundColor: `${cfg.color}10` }]}
                      onPress={() => setPriority(p)}
                    >
                      <View style={[styles.priorityDot, { backgroundColor: priority === p ? cfg.color : "#e2e8f0" }]} />
                      <Text style={[styles.priorityBtnText, priority === p && { color: cfg.color, fontWeight: "800" }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.mainSubmitBtn, (!title.trim() || !description.trim() || sending) && styles.mainSubmitBtnDisabled]}
              onPress={handleCreateTicket}
              disabled={!title.trim() || !description.trim() || sending}
            >
              <Text style={styles.mainSubmitBtnText}>{sending ? "Đang gửi..." : "Gửi yêu cầu hỗ trợ"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Main List ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <Header title="Hỗ trợ" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Header title="Hỗ trợ & Khiếu nại" />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const statusCfg = STATUS_COLOR[item.status] ?? STATUS_COLOR.OPEN;
          return (
            <TouchableOpacity
              style={styles.ticketCard}
              onPress={() => setSelectedTicket(item)}
              activeOpacity={0.7}
            >
              <View style={styles.ticketCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketId}>Mã ticket: #{item.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={styles.ticketTitle} numberOfLines={1}>{item.title}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[styles.statusPillText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
                </View>
              </View>
              <View style={styles.ticketFooter}>
                <View style={styles.priorityBadge}>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={14}
                    color={item.priority === "HIGH" ? "#ef4444" : "#64748b"}
                  />
                  <Text style={[styles.priorityText, item.priority === "HIGH" && { color: "#ef4444" }]}>
                    {item.priority === "HIGH" ? "Khẩn cấp" : item.priority === "LOW" ? "Thấp" : "Bình thường"}
                  </Text>
                </View>
                <View style={styles.msgCountContainer}>
                  <MaterialCommunityIcons name="message-text-outline" size={14} color="#94a3b8" />
                  <Text style={styles.msgCount}>{(item.messages || []).length}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listSubtitle}>Chào bạn, chúng tôi có thể giúp gì?</Text>
            <TouchableOpacity style={styles.createBtn} onPress={openCreateFlow} activeOpacity={0.8}>
              <MaterialCommunityIcons name="plus-circle" size={20} color="#fff" />
              <Text style={styles.createBtnText}>Gửi yêu cầu hỗ trợ mới</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="headphones-off"
            title="Chưa có yêu cầu nào"
            description="Mọi yêu cầu hỗ trợ hoặc khiếu nại của bạn sẽ hiển thị tại đây."
          />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0891b2" />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  listHeader: { padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", marginBottom: 8 },
  listSubtitle: { fontSize: 14, color: "#64748b", marginBottom: 16, fontWeight: "500" },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0891b2",
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  listContent: { paddingBottom: 40, flexGrow: 1 },

  ticketCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  ticketCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  ticketId: { fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: "600", letterSpacing: 0.5 },
  ticketTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  ticketFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f8fafc" },
  priorityBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  priorityText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  msgCountContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  msgCount: { fontSize: 12, color: "#94a3b8", fontWeight: "700" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: "800" },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },

  // Detail
  detailHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#f1f5f9" },
  detailHeaderInfo: { flex: 1, gap: 2 },
  detailTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  closeTicketBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#ecfeff", borderWidth: 1, borderColor: "#cffafe" },
  closeTicketText: { fontSize: 12, fontWeight: "700", color: "#0891b2" },
  descriptionBox: { backgroundColor: "#f0f9ff", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#e0f2fe" },
  descriptionLabel: { fontSize: 11, fontWeight: "800", color: "#0369a1", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  descriptionText: { fontSize: 14, color: "#0c4a6e", lineHeight: 22, fontWeight: "400" },
  messagesContainer: { flex: 1, backgroundColor: "#f8fafc" },
  messagesList: { padding: 16, gap: 14 },
  emptyMessages: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 80 },
  emptyMessagesText: { fontSize: 15, fontWeight: "600", color: "#94a3b8" },
  emptyMessagesSubText: { fontSize: 13, color: "#cbd5e1", textAlign: "center", paddingHorizontal: 40, lineHeight: 20 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  msgRow: { alignItems: "flex-start" },
  msgRowRight: { alignItems: "flex-end" },
  msgBubble: { maxWidth: "85%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  msgBubbleCustomer: { backgroundColor: "#0891b2", borderBottomRightRadius: 4 },
  msgBubbleStaff: { backgroundColor: "#fff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  msgSenderName: { fontSize: 11, fontWeight: "800", color: "#0891b2", marginBottom: 4 },
  msgText: { fontSize: 15, color: "#1e293b", lineHeight: 22 },
  msgTextCustomer: { color: "#fff", fontWeight: "500" },
  msgTime: { fontSize: 10, color: "#94a3b8", marginTop: 6 },
  msgTimeCustomer: { color: "rgba(255,255,255,0.7)", textAlign: "right" },
  inputArea: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingHorizontal: 16, paddingTop: 12 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  msgInput: { flex: 1, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, color: "#1e293b" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#0891b2", justifyContent: "center", alignItems: "center", shadowColor: "#0891b2", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  sendBtnDisabled: { backgroundColor: "#cbd5e1", shadowOpacity: 0, elevation: 0 },
  closedNote: { textAlign: "center", fontSize: 14, color: "#94a3b8", paddingVertical: 16, fontWeight: "500" },

  // Booking select
  bookingSelectItem: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#f1f5f9", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  bookingSelectIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#ecfeff", justifyContent: "center", alignItems: "center" },
  bookingSelectInfo: { flex: 1 },
  bookingSelectName: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  bookingSelectDate: { fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: "500" },

  // Create form
  selectedBookingBox: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f0f9ff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#bae6fd" },
  selectedBookingLabel: { fontSize: 11, fontWeight: "700", color: "#0369a1", textTransform: "uppercase", marginBottom: 2 },
  selectedBookingName: { fontSize: 15, fontWeight: "800", color: "#0c4a6e" },
  changeBtn: { backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#bae6fd" },
  changeText: { fontSize: 12, color: "#0891b2", fontWeight: "700" },
  formLabel: { fontSize: 15, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "#f1f5f9", backgroundColor: "#fff" },
  categoryChipActive: { borderColor: "#0891b2", backgroundColor: "#ecfeff" },
  categoryChipIcon: { fontSize: 16 },
  categoryChipText: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  categoryChipTextActive: { color: "#0891b2", fontWeight: "800" },
  priorityRow: { flexDirection: "row", gap: 10 },
  priorityBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#f1f5f9", backgroundColor: "#fff" },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  priorityBtnText: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  mainSubmitBtn: { backgroundColor: "#0891b2", borderRadius: 18, paddingVertical: 16, alignItems: "center", marginTop: 10, shadowColor: "#0891b2", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  mainSubmitBtnDisabled: { backgroundColor: "#cbd5e1", shadowOpacity: 0, elevation: 0 },
  mainSubmitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
