import { EmptyState, Header, LoadingIndicator } from "@/components";
import { bookingService } from "@/service/booking/bookingService";
import {
  supportService,
  type SupportTicket,
  type SupportTicketDetail,
  type TicketPriority,
  type TicketStatus,
} from "@/service/support/supportService";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TicketStatus, { bg: string; text: string; label: string; icon: string }> = {
  OPEN: { bg: "#dbeafe", text: "#1d4ed8", label: "Mở", icon: "email-open-outline" },
  IN_PROGRESS: { bg: "#fef3c7", text: "#d97706", label: "Đang xử lý", icon: "clock-outline" },
  RESOLVED: { bg: "#d1fae5", text: "#059669", label: "Đã giải quyết", icon: "check-circle-outline" },
  CLOSED: { bg: "#f3f4f6", text: "#6b7280", label: "Đã đóng", icon: "lock-outline" },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  HIGH: { label: "Khẩn cấp", color: "#ef4444" },
  NORMAL: { label: "Bình thường", color: "#0891b2" },
  LOW: { label: "Thấp", color: "#64748b" },
};

const QUICK_CATEGORIES = [
  { label: "Vệ sinh phòng", icon: "🧹" },
  { label: "Tiện nghi hỏng", icon: "🔧" },
  { label: "Thái độ nhân viên", icon: "👤" },
  { label: "Yêu cầu hoàn tiền", icon: "💰" },
  { label: "Khác", icon: "💬" },
];

const FILTER_TABS: { key: TicketStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "OPEN", label: "Mở" },
  { key: "IN_PROGRESS", label: "Đang xử lý" },
  { key: "RESOLVED", label: "Đã giải quyết" },
  { key: "CLOSED", label: "Đã đóng" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
  if (!dateStr) return "";
  const normalized = dateStr.endsWith("Z") || dateStr.includes("+") ? dateStr : `${dateStr}Z`;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1) return "Vừa xong";
  if (diff < 60) return `${diff} phút trước`;
  if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
  return d.toLocaleDateString("vi-VN");
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return "";
  const normalized = dateStr.endsWith("Z") || dateStr.includes("+") ? dateStr : `${dateStr}Z`;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─── Status Timeline ──────────────────────────────────────────────────────────

function StatusTimeline({ status }: { status: TicketStatus }) {
  const steps: { key: TicketStatus; label: string }[] = [
    { key: "OPEN", label: "Đã gửi" },
    { key: "IN_PROGRESS", label: "Đang xử lý" },
    { key: "RESOLVED", label: "Đã giải quyết" },
  ];
  const ORDER: Record<TicketStatus, number> = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 2 };
  const current = ORDER[status] ?? 0;

  return (
    <View style={tlStyles.row}>
      {steps.map((step, i) => {
        const done = i <= current;
        const active = i === current;
        return (
          <View key={step.key} style={[tlStyles.stepWrap, i < steps.length - 1 && { flex: 1 }]}>
            <View style={tlStyles.stepInner}>
              <View style={[tlStyles.dot, active && tlStyles.dotActive, done && !active && tlStyles.dotDone]}>
                <MaterialCommunityIcons
                  name={active ? "clock-outline" : done ? "check" : "circle-outline"}
                  size={12}
                  color={active ? "#fff" : done ? "#059669" : "#cbd5e1"}
                />
              </View>
              <Text style={[tlStyles.label, active && tlStyles.labelActive, done && !active && tlStyles.labelDone]}>
                {step.label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[tlStyles.line, i < current && tlStyles.lineDone]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const tlStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14 },
  stepWrap: { flexDirection: "row", alignItems: "center" },
  stepInner: { alignItems: "center", gap: 4 },
  dot: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "#e2e8f0" },
  dotActive: { backgroundColor: "#0891b2", borderColor: "#0891b2" },
  dotDone: { backgroundColor: "#ecfdf5", borderColor: "#6ee7b7" },
  label: { fontSize: 10, color: "#94a3b8", fontWeight: "600", textAlign: "center", maxWidth: 64 },
  labelActive: { color: "#0891b2" },
  labelDone: { color: "#059669" },
  line: { flex: 1, height: 2, backgroundColor: "#e2e8f0", marginBottom: 14, marginHorizontal: 4 },
  lineDone: { backgroundColor: "#6ee7b7" },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SupportScreen() {
  const insets = useSafeAreaInsets();

  // List state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "ALL">("ALL");
  const [searchText, setSearchText] = useState("");

  // Detail state
  const [selectedDetail, setSelectedDetail] = useState<SupportTicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Create flow state
  const [createStep, setCreateStep] = useState<0 | 1 | 2>(0);
  const [eligibleBookings, setEligibleBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [selectedBookingName, setSelectedBookingName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("NORMAL");
  const [submitting, setSubmitting] = useState(false);
  const [createImage, setCreateImage] = useState<{ uri: string; name: string; type: string } | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadTickets = useCallback(async () => {
    try {
      const data = await supportService.getTickets();
      setTickets(data);
    } catch {
      showToast("Không thể tải danh sách yêu cầu", "error");
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

  const openDetail = useCallback(async (ticket: SupportTicket) => {
    setLoadingDetail(true);
    setSelectedDetail({ ...ticket, replies: [] });
    const detail = await supportService.getTicketDetail(ticket.id);
    if (detail) setSelectedDetail(detail);
    setLoadingDetail(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }, []);

  // ── Image picker (chat) ─────────────────────────────────────────────────────

  const pickImage = useCallback(() => {
    const doLaunch = async (source: "camera" | "library") => {
      const perm = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (perm.status !== "granted") {
        showToast("Cần cấp quyền truy cập " + (source === "camera" ? "camera" : "thư viện ảnh"), "error");
        return;
      }

      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.8, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.8, allowsEditing: true });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const ext = asset.uri.split(".").pop() ?? "jpg";
        setPendingImage({ uri: asset.uri, name: `photo.${ext}`, type: asset.mimeType ?? `image/${ext}` });
      }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Hủy", "Chụp ảnh", "Chọn từ thư viện"], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) doLaunch("camera"); else if (idx === 2) doLaunch("library"); },
      );
    } else {
      Alert.alert("Đính kèm ảnh", "Chọn nguồn ảnh", [
        { text: "Hủy", style: "cancel" },
        { text: "Chụp ảnh", onPress: () => doLaunch("camera") },
        { text: "Thư viện", onPress: () => doLaunch("library") },
      ]);
    }
  }, []);

  // ── Image picker (create form) ──────────────────────────────────────────────

  const pickCreateImage = useCallback(() => {
    const doLaunch = async (source: "camera" | "library") => {
      const perm = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        showToast("Cần cấp quyền truy cập " + (source === "camera" ? "camera" : "thư viện ảnh"), "error");
        return;
      }
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.8, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.8, allowsEditing: true });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const ext = asset.uri.split(".").pop() ?? "jpg";
        setCreateImage({ uri: asset.uri, name: `photo.${ext}`, type: asset.mimeType ?? `image/${ext}` });
      }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Hủy", "Chụp ảnh", "Chọn từ thư viện"], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) doLaunch("camera"); else if (idx === 2) doLaunch("library"); },
      );
    } else {
      Alert.alert("Đính kèm ảnh", "Chọn nguồn ảnh", [
        { text: "Hủy", style: "cancel" },
        { text: "Chụp ảnh", onPress: () => doLaunch("camera") },
        { text: "Thư viện", onPress: () => doLaunch("library") },
      ]);
    }
  }, []);

  // ── Create flow ─────────────────────────────────────────────────────────────

  const openCreateFlow = useCallback(async () => {
    setLoadingBookings(true);
    setCreateStep(1);
    try {
      const bookings = await bookingService.getMyBookings();
      setEligibleBookings(
        (bookings as any[]).filter((b) => b.status === "COMPLETED" || b.status === "CHECKED_IN"),
      );
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

  const resetCreateForm = () => {
    setTitle(""); setDescription(""); setPriority("NORMAL");
    setSelectedBookingId(""); setSelectedBookingName("");
    setCreateImage(null);
    setCreateStep(0);
  };

  const handleCreateTicket = useCallback(async () => {
    if (!title.trim() || !description.trim()) {
      showToast("Vui lòng điền đầy đủ tiêu đề và mô tả", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await supportService.createTicket({
        title: title.trim(),
        description: description.trim(),
        priority,
        bookingId: selectedBookingId || undefined,
        imageFile: createImage ?? undefined,
      });
      resetCreateForm();
      showToast("Gửi yêu cầu thành công", "success");
      loadTickets();
    } catch (e: any) {
      showToast(e?.message || "Không thể tạo yêu cầu", "error");
    } finally {
      setSubmitting(false);
    }
  }, [title, description, priority, selectedBookingId, createImage, loadTickets]);

  // ── Detail actions ──────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() && !pendingImage) return;
    if (!selectedDetail) return;
    setSending(true);
    try {
      await supportService.sendMessage(selectedDetail.id, messageText.trim(), pendingImage ?? undefined);
      setMessageText("");
      setPendingImage(null);
      Keyboard.dismiss();
      const updated = await supportService.getTicketDetail(selectedDetail.id);
      if (updated) {
        setSelectedDetail(updated);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e: any) {
      showToast(e?.message || "Không thể gửi tin nhắn", "error");
    } finally {
      setSending(false);
    }
  }, [messageText, pendingImage, selectedDetail]);

  const handleCloseTicket = useCallback(async () => {
    if (!selectedDetail) return;
    setClosing(true);
    try {
      const res = await supportService.closeTicket(selectedDetail.id);
      if (res.success) {
        showToast("Đã đóng yêu cầu", "success");
        const updated = await supportService.getTicketDetail(selectedDetail.id);
        if (updated) setSelectedDetail(updated);
        loadTickets();
      } else {
        showToast(res.message, "error");
      }
    } catch {
      showToast("Không thể đóng yêu cầu", "error");
    } finally {
      setClosing(false);
    }
  }, [selectedDetail, loadTickets]);

  // ── Filtered list ───────────────────────────────────────────────────────────

  const filteredTickets = tickets.filter((t) => {
    const matchStatus = filterStatus === "ALL" || t.status === filterStatus;
    const q = searchText.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.homestayName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ── Ticket Detail View ──────────────────────────────────────────────────────

  if (selectedDetail) {
    const isClosed = selectedDetail.status === "CLOSED" || selectedDetail.status === "RESOLVED";
    const statusCfg = STATUS_CONFIG[selectedDetail.status];
    const currentUserId = ""; // no userId needed — we use senderName to distinguish

    return (
      <SafeAreaView style={s.container} edges={[]}>
        {/* Header */}
        <View style={[s.detailHeader, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => setSelectedDetail(null)}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <View style={s.detailHeaderInfo}>
            <Text style={s.detailTitle} numberOfLines={1}>{selectedDetail.title}</Text>
            <View style={[s.statusPill, { backgroundColor: statusCfg.bg }]}>
              <Text style={[s.statusPillText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
            </View>
          </View>
          {!isClosed && (
            <TouchableOpacity style={s.closeTicketBtn} onPress={handleCloseTicket} disabled={closing}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#059669" />
              <Text style={s.closeTicketText}>{closing ? "..." : "Xong"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status timeline */}
        <View style={s.timelineWrap}>
          <StatusTimeline status={selectedDetail.status} />
        </View>

        {/* Meta info */}
        <View style={s.metaRow}>
          {selectedDetail.homestayName !== "Hỗ trợ chung" && (
            <View style={s.metaChip}>
              <MaterialCommunityIcons name="home-outline" size={13} color="#0369a1" />
              <Text style={s.metaChipText} numberOfLines={1}>{selectedDetail.homestayName}</Text>
            </View>
          )}
          <View style={[s.metaChip, { backgroundColor: `${PRIORITY_CONFIG[selectedDetail.priority].color}15` }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={13} color={PRIORITY_CONFIG[selectedDetail.priority].color} />
            <Text style={[s.metaChipText, { color: PRIORITY_CONFIG[selectedDetail.priority].color }]}>
              {PRIORITY_CONFIG[selectedDetail.priority].label}
            </Text>
          </View>
          {selectedDetail.staffName && (
            <View style={[s.metaChip, { backgroundColor: "#f0fdf4" }]}>
              <MaterialCommunityIcons name="account-check-outline" size={13} color="#059669" />
              <Text style={[s.metaChipText, { color: "#059669" }]} numberOfLines={1}>{selectedDetail.staffName}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {selectedDetail.description ? (
          <View style={s.descriptionBox}>
            <Text style={s.descriptionLabel}>Mô tả vấn đề</Text>
            <Text style={s.descriptionText}>{selectedDetail.description}</Text>
          </View>
        ) : null}

        {/* Messages */}
        {loadingDetail ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <LoadingIndicator />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={s.messagesContainer}
            contentContainerStyle={s.messagesList}
            showsVerticalScrollIndicator={false}
          >
            {selectedDetail.replies.length === 0 && (
              <View style={s.emptyMessages}>
                <MaterialCommunityIcons name="message-outline" size={40} color="#cbd5e1" />
                <Text style={s.emptyMessagesText}>Chưa có phản hồi nào</Text>
                <Text style={s.emptyMessagesSubText}>Nhân viên hỗ trợ sẽ phản hồi sớm nhất có thể.</Text>
              </View>
            )}
            {selectedDetail.replies.map((reply) => {
              // Distinguish customer vs staff by checking if senderName matches customerName
              const isCustomer = reply.senderName === selectedDetail.customerName;
              return (
                <View key={reply.id} style={[s.msgRow, isCustomer && s.msgRowRight]}>
                  {!isCustomer && (
                    <View style={s.avatarCircle}>
                      <MaterialCommunityIcons name="headset" size={16} color="#0891b2" />
                    </View>
                  )}
                  <View style={[s.msgBubble, isCustomer ? s.msgBubbleCustomer : s.msgBubbleStaff]}>
                    {!isCustomer && (
                      <Text style={s.msgSenderName}>{reply.senderName || "Hỗ trợ viên"}</Text>
                    )}
                    {reply.message ? (
                      <Text style={[s.msgText, isCustomer && s.msgTextCustomer]}>{reply.message}</Text>
                    ) : null}
                    {reply.attachmentUrl && (
                      <Image
                        source={{ uri: reply.attachmentUrl }}
                        style={s.msgImage}
                        contentFit="cover"
                        transition={200}
                      />
                    )}
                    <Text style={[s.msgTime, isCustomer && s.msgTimeCustomer]}>
                      {formatDateTime(reply.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[s.inputArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {isClosed ? (
              <View style={s.closedNote}>
                <MaterialCommunityIcons name="lock-outline" size={16} color="#94a3b8" />
                <Text style={s.closedNoteText}>Yêu cầu này đã được đóng.</Text>
              </View>
            ) : (
              <View>
                {/* Pending image preview */}
                {pendingImage && (
                  <View style={s.pendingImageWrap}>
                    <Image source={{ uri: pendingImage.uri }} style={s.pendingImage} contentFit="cover" />
                    <TouchableOpacity style={s.pendingImageRemove} onPress={() => setPendingImage(null)}>
                      <MaterialCommunityIcons name="close-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={s.inputRow}>
                  <TouchableOpacity style={s.attachBtn} onPress={pickImage} disabled={sending}>
                    <MaterialCommunityIcons name="image-plus" size={22} color={sending ? "#cbd5e1" : "#0891b2"} />
                  </TouchableOpacity>
                  <TextInput
                    style={s.msgInput}
                    placeholder="Nhập nội dung phản hồi..."
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    placeholderTextColor="#94a3b8"
                    editable={!sending}
                  />
                  <TouchableOpacity
                    style={[s.sendBtn, ((!messageText.trim() && !pendingImage) || sending) && s.sendBtnDisabled]}
                    onPress={handleSendMessage}
                    disabled={(!messageText.trim() && !pendingImage) || sending}
                  >
                    <MaterialCommunityIcons name={sending ? "dots-horizontal" : "send"} size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Create — Step 1: Select Booking ────────────────────────────────────────

  if (createStep === 1) {
    return (
      <SafeAreaView style={s.container} edges={[]}>
        <View style={[s.detailHeader, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => setCreateStep(0)}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={s.detailTitle}>Chọn lượt lưu trú</Text>
        </View>
        {loadingBookings ? (
          <LoadingIndicator />
        ) : eligibleBookings.length === 0 ? (
          <View style={s.emptyMessages}>
            <View style={s.emptyIconCircle}>
              <MaterialCommunityIcons name="calendar-remove-outline" size={48} color="#94a3b8" />
            </View>
            <Text style={s.emptyMessagesText}>Không có lượt lưu trú phù hợp</Text>
            <Text style={s.emptyMessagesSubText}>Chỉ hỗ trợ cho lượt đang lưu trú hoặc đã hoàn thành.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {eligibleBookings.map((b: any) => (
              <TouchableOpacity
                key={b.id}
                style={s.bookingSelectItem}
                onPress={() => handleSelectBooking(b.id, b.homestayName)}
                activeOpacity={0.7}
              >
                <View style={s.bookingSelectIcon}>
                  <MaterialCommunityIcons name="home-city-outline" size={24} color="#0891b2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.bookingSelectName} numberOfLines={1}>{b.homestayName || "Đặt phòng"}</Text>
                  <Text style={s.bookingSelectDate}>
                    {new Date(b.checkIn).toLocaleDateString("vi-VN")} – {new Date(b.checkOut).toLocaleDateString("vi-VN")}
                  </Text>
                  <View style={[s.statusPill, { backgroundColor: b.status === "CHECKED_IN" ? "#e0f2fe" : "#ecfeff", alignSelf: "flex-start", marginTop: 6 }]}>
                    <Text style={[s.statusPillText, { color: b.status === "CHECKED_IN" ? "#0369a1" : "#0891b2" }]}>
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

  // ── Create — Step 2: Form ───────────────────────────────────────────────────

  if (createStep === 2) {
    return (
      <SafeAreaView style={s.container} edges={[]}>
        <View style={[s.detailHeader, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => setCreateStep(1)}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={s.detailTitle}>Nội dung yêu cầu</Text>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* Selected booking */}
            <View style={s.selectedBookingBox}>
              <MaterialCommunityIcons name="home-outline" size={18} color="#0369a1" />
              <View style={{ flex: 1 }}>
                <Text style={s.selectedBookingLabel}>Yêu cầu cho:</Text>
                <Text style={s.selectedBookingName} numberOfLines={1}>{selectedBookingName}</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateStep(1)} style={s.changeBtn}>
                <Text style={s.changeText}>Thay đổi</Text>
              </TouchableOpacity>
            </View>

            {/* Quick categories */}
            <View>
              <Text style={s.formLabel}>Bạn đang gặp vấn đề gì?</Text>
              <View style={s.categoryGrid}>
                {QUICK_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.label}
                    style={[s.categoryChip, title === cat.label && s.categoryChipActive]}
                    onPress={() => setTitle(cat.label)}
                  >
                    <Text style={s.categoryChipIcon}>{cat.icon}</Text>
                    <Text style={[s.categoryChipText, title === cat.label && s.categoryChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Title */}
            <View>
              <Text style={s.formLabel}>Tiêu đề yêu cầu <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <TextInput
                style={s.textInput}
                placeholder="Ví dụ: Không có nước nóng"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#94a3b8"
                editable={!submitting}
              />
            </View>

            {/* Description */}
            <View>
              <Text style={s.formLabel}>Mô tả chi tiết <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <TextInput
                style={[s.textInput, { height: 110, textAlignVertical: "top", paddingTop: 12 }]}
                placeholder="Mô tả cụ thể vấn đề để chúng tôi hỗ trợ tốt nhất..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                placeholderTextColor="#94a3b8"
                editable={!submitting}
              />
            </View>

            {/* Priority */}
            <View>
              <Text style={s.formLabel}>Mức độ ưu tiên</Text>
              <View style={s.priorityRow}>
                {(["LOW", "NORMAL", "HIGH"] as TicketPriority[]).map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const active = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[s.priorityBtn, active && { borderColor: cfg.color, backgroundColor: `${cfg.color}10` }]}
                      onPress={() => setPriority(p)}
                    >
                      <View style={[s.priorityDot, { backgroundColor: active ? cfg.color : "#e2e8f0" }]} />
                      <Text style={[s.priorityBtnText, active && { color: cfg.color, fontWeight: "800" }]}>
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Attach image */}
            <View>
              <Text style={s.formLabel}>Ảnh đính kèm (tuỳ chọn)</Text>
              {createImage ? (
                <View style={s.createImagePreviewWrap}>
                  <Image source={{ uri: createImage.uri }} style={s.createImagePreview} contentFit="cover" />
                  <TouchableOpacity style={s.createImageRemove} onPress={() => setCreateImage(null)}>
                    <MaterialCommunityIcons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.createImageChange} onPress={pickCreateImage}>
                    <MaterialCommunityIcons name="pencil-circle" size={24} color="#0891b2" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.createImageBtn} onPress={pickCreateImage} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="image-plus" size={28} color="#0891b2" />
                  <Text style={s.createImageBtnText}>Thêm ảnh minh chứng</Text>
                  <Text style={s.createImageBtnSub}>Chụp ảnh hoặc chọn từ thư viện</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[s.submitBtn, (!title.trim() || !description.trim() || submitting) && s.submitBtnDisabled]}
              onPress={handleCreateTicket}
              disabled={!title.trim() || !description.trim() || submitting}
            >
              <MaterialCommunityIcons name="send-outline" size={18} color="#fff" />
              <Text style={s.submitBtnText}>{submitting ? "Đang gửi..." : "Gửi yêu cầu hỗ trợ"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Main List ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={[]}>
        <Header title="Hỗ trợ & Khiếu nại" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={[]}>
      <Header title="Hỗ trợ & Khiếu nại" />

      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const statusCfg = STATUS_CONFIG[item.status];
          const priorityCfg = PRIORITY_CONFIG[item.priority];
          return (
            <TouchableOpacity style={s.ticketCard} onPress={() => openDetail(item)} activeOpacity={0.7}>
              <View style={s.ticketCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.ticketId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={s.ticketTitle} numberOfLines={2}>{item.title}</Text>
                  {item.homestayName !== "Hỗ trợ chung" && (
                    <Text style={s.ticketHomestay} numberOfLines={1}>
                      🏠 {item.homestayName}
                    </Text>
                  )}
                </View>
                <View style={[s.statusPill, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[s.statusPillText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
                </View>
              </View>
              <View style={s.ticketFooter}>
                <View style={s.priorityBadge}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={14} color={priorityCfg.color} />
                  <Text style={[s.priorityText, { color: priorityCfg.color }]}>{priorityCfg.label}</Text>
                </View>
                <Text style={s.ticketTime}>{formatTime(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View>
            {/* Create button */}
            <View style={s.listHeader}>
              <TouchableOpacity style={s.createBtn} onPress={openCreateFlow} activeOpacity={0.8}>
                <MaterialCommunityIcons name="plus-circle" size={20} color="#fff" />
                <Text style={s.createBtnText}>Gửi yêu cầu hỗ trợ mới</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={s.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" style={{ marginLeft: 12 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Tìm theo tiêu đề, homestay..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#94a3b8"
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText("")} style={{ paddingRight: 12 }}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterTabsContent}>
              {FILTER_TABS.map((tab) => {
                const active = filterStatus === tab.key;
                const count = tab.key === "ALL" ? tickets.length : tickets.filter((t) => t.status === tab.key).length;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[s.filterTab, active && s.filterTabActive]}
                    onPress={() => setFilterStatus(tab.key)}
                  >
                    <Text style={[s.filterTabText, active && s.filterTabTextActive]}>{tab.label}</Text>
                    {count > 0 && (
                      <View style={[s.filterTabBadge, active && s.filterTabBadgeActive]}>
                        <Text style={[s.filterTabBadgeText, active && s.filterTabBadgeTextActive]}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="headphones-off"
            title={searchText || filterStatus !== "ALL" ? "Không tìm thấy yêu cầu" : "Chưa có yêu cầu nào"}
            description={
              searchText || filterStatus !== "ALL"
                ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
                : "Mọi yêu cầu hỗ trợ hoặc khiếu nại của bạn sẽ hiển thị tại đây."
            }
          />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0891b2" />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  // List
  listHeader: { padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#0891b2", borderRadius: 16, paddingVertical: 14,
    shadowColor: "#0891b2", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  createBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 },

  // Search
  searchWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14, color: "#1e293b" },

  // Filter tabs
  filterTabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  filterTab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  filterTabActive: { borderColor: "#0891b2", backgroundColor: "#ecfeff" },
  filterTabText: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  filterTabTextActive: { color: "#0891b2", fontWeight: "800" },
  filterTabBadge: { backgroundColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  filterTabBadgeActive: { backgroundColor: "#0891b2" },
  filterTabBadgeText: { fontSize: 11, color: "#64748b", fontWeight: "700" },
  filterTabBadgeTextActive: { color: "#fff" },

  // Ticket card
  ticketCard: {
    backgroundColor: "#fff", marginHorizontal: 0, marginVertical: 6, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: "#f1f5f9",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  ticketCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  ticketId: { fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: "600", letterSpacing: 0.5 },
  ticketTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b", lineHeight: 22 },
  ticketHomestay: { fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: "500" },
  ticketFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f8fafc" },
  priorityBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  priorityText: { fontSize: 12, fontWeight: "600" },
  ticketTime: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: "800" },

  // Detail header
  detailHeader: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", gap: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#f1f5f9" },
  detailHeaderInfo: { flex: 1, gap: 4 },
  detailTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  closeTicketBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#ecfeff", borderWidth: 1, borderColor: "#cffafe" },
  closeTicketText: { fontSize: 12, fontWeight: "700", color: "#0891b2" },

  // Timeline
  timelineWrap: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },

  // Meta chips
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: "#f0f9ff" },
  metaChipText: { fontSize: 12, color: "#0369a1", fontWeight: "600", maxWidth: 120 },

  // Description
  descriptionBox: { backgroundColor: "#f0f9ff", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#e0f2fe" },
  descriptionLabel: { fontSize: 11, fontWeight: "800", color: "#0369a1", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  descriptionText: { fontSize: 14, color: "#0c4a6e", lineHeight: 22 },

  // Messages
  messagesContainer: { flex: 1, backgroundColor: "#f8fafc" },
  messagesList: { padding: 16, gap: 14 },
  emptyMessages: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  emptyMessagesText: { fontSize: 15, fontWeight: "600", color: "#94a3b8" },
  emptyMessagesSubText: { fontSize: 13, color: "#cbd5e1", textAlign: "center", paddingHorizontal: 40, lineHeight: 20 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgRowRight: { flexDirection: "row-reverse" },
  avatarCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#ecfeff", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#cffafe" },
  msgBubble: { maxWidth: "80%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  msgBubbleCustomer: { backgroundColor: "#0891b2", borderBottomRightRadius: 4 },
  msgBubbleStaff: { backgroundColor: "#fff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  msgSenderName: { fontSize: 11, fontWeight: "800", color: "#0891b2", marginBottom: 4 },
  msgText: { fontSize: 15, color: "#1e293b", lineHeight: 22 },
  msgTextCustomer: { color: "#fff", fontWeight: "500" },
  msgAttachment: { fontSize: 12, color: "#64748b", marginTop: 4 },
  msgImage: { width: 200, height: 150, borderRadius: 10, marginTop: 6 },
  msgTime: { fontSize: 10, color: "#94a3b8", marginTop: 6 },
  msgTimeCustomer: { color: "rgba(255,255,255,0.7)", textAlign: "right" },

  // Input area
  inputArea: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingHorizontal: 12, paddingTop: 10 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  attachBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f9ff", borderWidth: 1, borderColor: "#bae6fd" },
  msgInput: { flex: 1, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, color: "#1e293b" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#0891b2", justifyContent: "center", alignItems: "center", shadowColor: "#0891b2", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  sendBtnDisabled: { backgroundColor: "#cbd5e1", shadowOpacity: 0, elevation: 0 },
  closedNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  closedNoteText: { fontSize: 14, color: "#94a3b8", fontWeight: "500" },
  pendingImageWrap: { position: "relative", alignSelf: "flex-start", marginBottom: 8, marginLeft: 48 },
  pendingImage: { width: 120, height: 90, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  pendingImageRemove: { position: "absolute", top: -8, right: -8 },

  // Booking select
  bookingSelectItem: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#f1f5f9", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  bookingSelectIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#ecfeff", justifyContent: "center", alignItems: "center" },
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
  textInput: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: "#1e293b" },
  priorityRow: { flexDirection: "row", gap: 10 },
  priorityBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#f1f5f9", backgroundColor: "#fff" },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  priorityBtnText: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0891b2", borderRadius: 18, paddingVertical: 16, marginTop: 10, shadowColor: "#0891b2", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnDisabled: { backgroundColor: "#cbd5e1", shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  createImageBtn: { flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#f0f9ff", borderRadius: 16, borderWidth: 2, borderColor: "#bae6fd", borderStyle: "dashed", paddingVertical: 24 },
  createImageBtnText: { fontSize: 15, fontWeight: "700", color: "#0891b2" },
  createImageBtnSub: { fontSize: 12, color: "#64748b" },
  createImagePreviewWrap: { position: "relative", borderRadius: 16, overflow: "visible" },
  createImagePreview: { width: "100%", height: 180, borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  createImageRemove: { position: "absolute", top: -10, right: -10 },
  createImageChange: { position: "absolute", top: -10, right: 22 },
});
