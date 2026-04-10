import {
    Header,
    Input,
    LoadingIndicator
} from "@/components";
import { aiService } from "@/service/ai/aiService";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface Message {
    id: string;
    text: string;
    sender: "user" | "ai";
    timestamp: Date;
}

export default function ChatScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [inputText, setInputText] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        const loadChatHistory = async () => {
            try {
                const history = await aiService.getChatHistory();
                if (history && Array.isArray(history)) {
                    const formattedMessages = history.map((msg: any, idx: number) => {
                        const raw = String(msg.sender ?? msg.role ?? "").toLowerCase();
                        const sender: "user" | "ai" = raw.includes("user") ? "user" : "ai";
                        return {
                            id: `history-${msg.id ?? idx}`,
                            text: msg.message || msg.text || String(msg),
                            sender,
                            timestamp: new Date(msg.timestamp || msg.createdAt || Date.now()),
                        };
                    });
                    setMessages(formattedMessages);
                }
            } catch (error) {

            } finally {
                setLoading(false);
            }
        };

        loadChatHistory();
    }, []);

    useEffect(() => {
        // Scroll to bottom when messages change
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const handleSendMessage = useCallback(async () => {
        if (!inputText.trim()) return;

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            text: inputText,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText("");
        setSending(true);
        setAiLoading(true);

        try {
            const aiText = await aiService.sendMessage(inputText.trim());
            const aiMessage: Message = {
                id: `msg-${Date.now()}-ai`,
                text: aiText?.trim() || "Xin lỗi, tôi không thể trả lời câu hỏi này.",
                sender: "ai",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error: any) {
            showToast("Lỗi khi gửi tin nhắn", "error");

        } finally {
            setSending(false);
            setAiLoading(false);
        }
    }, [inputText]);

    const handleClearHistory = useCallback(async () => {
        try {
            await aiService.clearChatHistory();
            setMessages([]);
            showToast("Đã xóa lịch chat", "success");
        } catch {
            showToast("Không thể xóa lịch chat", "error");
        }
    }, []);

    const handleGetRecommendations = useCallback(async () => {
        setSending(true);
        try {
            const recommendations = await aiService.getRecommendations();
            const recText =
                recommendations?.length > 0
                    ? recommendations
                        .map(
                            (r) =>
                                `• ${r.homestayName} — ₫${r.price.toLocaleString("vi-VN")}/đêm (★${r.rating})\n  ${r.reason}`,
                        )
                        .join("\n\n")
                    : "Hiện chưa có gợi ý phù hợp. Hãy thử mô tả sở thích của bạn trong ô chat.";
            const aiMessage: Message = {
                id: `msg-${Date.now()}-rec`,
                text: `Gợi ý cho bạn:\n\n${recText}`,
                sender: "ai",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            showToast("Không thể lấy gợi ý", "error");
        } finally {
            setSending(false);
        }
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={[]}>
                <Header title="AI Chat" showBack={false} />
                <LoadingIndicator />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={[]}>
            <Header
                title="AI Chat"
                showBack={false}
                rightAction={{
                    icon: "trash-can-outline",
                    onPress: handleClearHistory,
                }}
            />

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View
                        style={[
                            styles.messageBubble,
                            item.sender === "user" ? styles.userBubble : styles.aiBubble,
                        ]}
                    >
                        <View style={styles.bubbleWrapper}>
                            {item.sender === "ai" && (
                                <View style={styles.aiAvatar}>
                                    <MaterialCommunityIcons name="robot" size={16} color="#fff" />
                                </View>
                            )}
                            <View
                                style={[
                                    styles.bubble,
                                    item.sender === "user" ? styles.userMessage : styles.aiMessage,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.messageText,
                                        item.sender === "user"
                                            ? styles.userMessageText
                                            : styles.aiMessageText,
                                    ]}
                                >
                                    {item.text}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.timestamp, item.sender === "user" && { textAlign: "right" }]}>
                            {item.timestamp.toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </Text>
                    </View>
                )}
                ListHeaderComponent={
                    messages.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <MaterialCommunityIcons
                                    name="robot-happy-outline"
                                    size={48}
                                    color="#0891b2"
                                />
                            </View>
                            <Text style={styles.emptyTitle}>Xin chào! Tôi có thể giúp gì?</Text>
                            <Text style={styles.emptyDesc}>
                                Tôi là trợ lý AI thông minh của CHMS. Hãy hỏi tôi bất cứ điều gì về:
                            </Text>
                            <View style={styles.featureGrid}>
                                {[
                                    { icon: "home-search", label: "Tìm homestay" },
                                    { icon: "calendar-check", label: "Đặt phòng" },
                                    { icon: "tag-outline", label: "Giá ưu đãi" },
                                    { icon: "map-marker-radius", label: "Gợi ý địa điểm" },
                                ].map((feat, i) => (
                                    <View key={i} style={styles.featureChip}>
                                        <MaterialCommunityIcons name={feat.icon as any} size={16} color="#0891b2" />
                                        <Text style={styles.featureChipText}>{feat.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : null
                }
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
            />

            {/* Quick Actions */}
            {messages.length === 0 && (
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={handleGetRecommendations}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="creation"
                            size={18}
                            color="#fff"
                        />
                        <Text style={styles.quickActionText}>Nhận Gợi Ý Homestay Ngay</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.msgInput}
                            placeholder="Hỏi AI bất cứ điều gì..."
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            placeholderTextColor="#94a3b8"
                            editable={!sending}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, (sending || !inputText.trim()) && styles.sendButtonDisabled]}
                            onPress={handleSendMessage}
                            disabled={sending || !inputText.trim()}
                            activeOpacity={0.8}
                        >
                            {sending ? (
                                <MaterialCommunityIcons name="loading" size={20} color="#fff" />
                            ) : (
                                <MaterialCommunityIcons name="send" size={20} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    messagesList: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        flexGrow: 1,
    },
    emptyState: {
        alignItems: "center",
        marginTop: 40,
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#e0f2fe",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#0f172a",
        textAlign: "center",
        marginBottom: 10,
    },
    emptyDesc: {
        fontSize: 15,
        color: "#64748b",
        marginBottom: 24,
        textAlign: "center",
        lineHeight: 22,
    },
    featureGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        justifyContent: "center",
    },
    featureChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    featureChipText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#334155",
    },
    messageBubble: {
        marginBottom: 16,
        maxWidth: "85%",
    },
    userBubble: {
        alignSelf: "flex-end",
    },
    aiBubble: {
        alignSelf: "flex-start",
    },
    bubbleWrapper: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
    },
    aiAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#0891b2",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 4,
    },
    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    userMessage: {
        backgroundColor: "#0891b2",
        borderBottomRightRadius: 4,
    },
    aiMessage: {
        backgroundColor: "#fff",
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    userMessageText: {
        color: "#fff",
        fontWeight: "500",
    },
    aiMessageText: {
        color: "#1e293b",
    },
    timestamp: {
        fontSize: 11,
        color: "#94a3b8",
        marginTop: 6,
        marginHorizontal: 4,
    },
    quickActions: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    quickActionButton: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: "#0891b2",
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#0891b2",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    quickActionText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#fff",
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
    },
    inputWrapper: {
        flexDirection: "row",
        gap: 10,
        alignItems: "flex-end",
    },
    msgInput: {
        flex: 1,
        backgroundColor: "#f8fafc",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingTop: 10,
        fontSize: 15,
        color: "#1e293b",
        maxHeight: 120,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#0891b2",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#0891b2",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    sendButtonDisabled: {
        backgroundColor: "#cbd5e1",
        shadowOpacity: 0,
        elevation: 0,
    },
});
