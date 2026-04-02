import {
    Button,
    Card,
    Divider,
    EmptyState,
    Header,
    Input,
    LoadingIndicator,
    StatusBadge,
} from "@/components";
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

export default function SupportScreen() {
    const [items, setItems] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<"HIGH" | "NORMAL" | "LOW">("NORMAL");
    const [messageText, setMessageText] = useState("");
    const [sending, setSending] = useState(false);

    const loadTickets = useCallback(async () => {
        try {
            const data = await supportService.getTickets();
            setItems(data || []);
        } catch (error) {
            showToast("Không thể tải danh sách ticket", "error");
            logger.error("Failed to load tickets", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadTickets();
    }, [loadTickets]);

    const handleCreateTicket = useCallback(async () => {
        if (!title.trim() || !description.trim()) {
            showToast("Vui lòng điền đầy đủ thông tin", "warning");
            return;
        }

        try {
            setSending(true);
            const newTicket = await supportService.createTicket({
                title,
                description,
                priority,
            });
            setItems((prev) => [newTicket, ...prev]);
            setTitle("");
            setDescription("");
            setPriority("NORMAL");
            setShowCreateDialog(false);
            showToast("Tạo ticket thành công", "success");
        } catch (error: any) {
            showToast(error?.message || "Không thể tạo ticket", "error");
        } finally {
            setSending(false);
        }
    }, [title, description, priority]);

    const handleSendMessage = useCallback(async () => {
        if (!messageText.trim() || !selectedTicket) return;

        try {
            setSending(true);
            await supportService.sendMessage(selectedTicket.id, {
                message: messageText,
            });
            setMessageText("");
            Keyboard.dismiss();
            // Reload ticket to get updated messages
            const updatedTicket = await supportService.getTicketDetail(selectedTicket.id);
            if (updatedTicket) setSelectedTicket(updatedTicket);
            showToast("Gửi tin nhắn thành công", "success");
        } catch {
            showToast("Không thể gửi tin nhắn", "error");
        } finally {
            setSending(false);
        }
    }, [messageText, selectedTicket]);

    const getStatusColor = (status: string) => {
        const colorMap: { [key: string]: string } = {
            OPEN: "#2563eb",
            IN_PROGRESS: "#f59e0b",
            RESOLVED: "#22c55e",
            CLOSED: "#6b7280",
        };
        return colorMap[status] || "#6b7280";
    };

    if (selectedTicket) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.ticketHeader}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setSelectedTicket(null)}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.ticketTitle}>{selectedTicket.title}</Text>
                </View>

                <ScrollView
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesList}
                >
                    {selectedTicket.messages?.map((msg) => (
                        <View
                            key={msg.id}
                            style={[
                                styles.messageBubble,
                                msg.sender === "CUSTOMER" && styles.customerMessage,
                            ]}
                        >
                            <Text style={styles.messageText}>{msg.message}</Text>
                            <Text style={styles.messageTime}>
                                {new Date(msg.createdAt).toLocaleString("vi-VN")}
                            </Text>
                        </View>
                    ))}
                </ScrollView>

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.inputContainer}
                >
                    <View style={styles.messageInputWrapper}>
                        <TextInput
                            style={styles.messageInput}
                            placeholder="Nhập tin nhắn..."
                            value={messageText}
                            onChangeText={setMessageText}
                            multiline
                            editable={!sending}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                            onPress={handleSendMessage}
                            disabled={sending || !messageText.trim()}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons
                                name="send"
                                size={20}
                                color={sending || !messageText.trim() ? "#d1d5db" : "#0891b2"}
                            />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header title="Hỗ Trợ" />
                <LoadingIndicator />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <Header title="Hỗ Trợ" />
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => setShowCreateDialog(true)}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                    <Text style={styles.createButtonText}>Tạo mới</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <Card
                        style={styles.ticketCard}
                        onPress={() => setSelectedTicket(item)}
                    >
                        <View style={styles.ticketCardHeader}>
                            <View style={styles.ticketInfo}>
                                <Text style={styles.ticketId}>#{item.id.slice(0, 8)}</Text>
                                <Text style={styles.ticketTitle} numberOfLines={2}>
                                    {item.title}
                                </Text>
                            </View>
                            <StatusBadge status={item.status} />
                        </View>

                        <Divider style={styles.divider} />

                        <View style={styles.ticketFooter}>
                            <View style={styles.priorityBadge}>
                                <MaterialCommunityIcons name="flag-outline" size={12} color="#666" />
                                <Text style={styles.priorityText}>{item.priority || "NORMAL"}</Text>
                            </View>
                            <Text style={styles.messageCount}>
                                {item.messages?.length || 0} tin nhắn
                            </Text>
                        </View>
                    </Card>
                )}
                ListEmptyComponent={
                    <EmptyState
                        icon="headphones-off"
                        title="Chưa có ticket"
                        description="Tạo ticket để liên hệ với đội hỗ trợ"
                    />
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
            />


            {showCreateDialog && (
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Tạo ticket hỗ trợ</Text>
                            <TouchableOpacity
                                onPress={() => setShowCreateDialog(false)}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="close" size={24} color="#1f2937" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Input
                                label="Tiêu đề"
                                placeholder="Nhập tiêu đề"
                                value={title}
                                onChangeText={setTitle}
                                editable={!sending}
                            />
                            <Input
                                label="Mô tả"
                                placeholder="Mô tả vấn đề"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                editable={!sending}
                            />
                            <Text style={styles.priorityLabel}>Mức độ ưu tiên</Text>
                            <View style={styles.priorityButtons}>
                                {(["HIGH", "NORMAL", "LOW"] as const).map((p) => (
                                    <TouchableOpacity
                                        key={p}
                                        style={[
                                            styles.priorityButton,
                                            priority === p && styles.priorityButtonActive,
                                        ]}
                                        onPress={() => setPriority(p)}
                                    >
                                        <Text
                                            style={[
                                                styles.priorityButtonText,
                                                priority === p && styles.priorityButtonTextActive,
                                            ]}
                                        >
                                            {{
                                                HIGH: "Cao",
                                                NORMAL: "Bình thường",
                                                LOW: "Thấp",
                                            }[p]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Button
                                title="Hủy"
                                onPress={() => setShowCreateDialog(false)}
                                variant="outline"
                                size="large"
                                style={styles.modalButton}
                                disabled={sending}
                            />
                            <Button
                                title={sending ? "Đang tạo..." : "Tạo"}
                                onPress={handleCreateTicket}
                                size="large"
                                style={styles.modalButton}
                                loading={sending}
                            />
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    header: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff" },
    createButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#0891b2",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginHorizontal: 16,
        gap: 6,
        marginTop: 8,
    },
    createButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    ticketCard: { marginHorizontal: 16, marginVertical: 8 },
    ticketCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    ticketInfo: { flex: 1 },
    ticketId: { fontSize: 12, color: "#9ca3af", marginBottom: 4 },
    ticketTitle: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
    divider: { marginVertical: 8 },
    ticketFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    priorityBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
    priorityText: { fontSize: 12, color: "#666", fontWeight: "600" },
    messageCount: { fontSize: 12, color: "#9ca3af" },
    ticketHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
    backButton: { marginRight: 12 },
    messagesContainer: { flex: 1 },
    messagesList: { padding: 16 },
    messageBubble: { marginBottom: 12, maxWidth: "80%", alignSelf: "flex-start" },
    customerMessage: { alignSelf: "flex-end" },
    messageText: { fontSize: 14, color: "#fff", backgroundColor: "#0891b2", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    messageTime: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
    inputContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff" },
    messageInputWrapper: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    messageInput: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
    sendButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center", backgroundColor: "#e0f2fe", borderRadius: 8 },
    sendButtonDisabled: { backgroundColor: "#f3f4f6" },
    priorityLabel: { fontSize: 14, fontWeight: "600", color: "#1f2937", marginVertical: 12 },
    priorityButtons: { flexDirection: "row", gap: 8 },
    priorityButton: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
    priorityButtonActive: { backgroundColor: "#0891b2", borderColor: "#0891b2" },
    priorityButtonText: { fontSize: 13, color: "#666", fontWeight: "600" },
    priorityButtonTextActive: { color: "#fff" },
    emptyContainer: { flexGrow: 1, justifyContent: "center" },
    modalBackdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 12,
        width: "85%",
        maxHeight: "80%",
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    modalTitle: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
    modalBody: { paddingHorizontal: 16, paddingVertical: 12 },
    modalFooter: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
    },
    modalButton: { flex: 1 },
});
