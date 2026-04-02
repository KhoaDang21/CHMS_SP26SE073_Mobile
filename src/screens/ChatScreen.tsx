import {
    Header,
    Input,
    LoadingIndicator
} from "@/components";
import { aiService } from "@/service/ai/aiService";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Message {
    id: string;
    text: string;
    sender: "user" | "ai";
    timestamp: Date;
}

export default function ChatScreen() {
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
                    const formattedMessages = history.map((msg: any, idx: number) => ({
                        id: `history-${idx}`,
                        text: msg.message || msg.text || String(msg),
                        sender: (msg.sender === "user" ? "user" : "ai") as "user" | "ai",
                        timestamp: new Date(msg.timestamp || Date.now()),
                    }));
                    setMessages(formattedMessages);
                }
            } catch (error) {
                logger.error("Failed to load chat history", error);
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
            const aiResponse = await aiService.sendMessage(inputText.trim());
            const aiMessage: Message = {
                id: `msg-${Date.now()}-ai`,
                text: typeof aiResponse === "string" ? aiResponse : "Xin lỗi, tôi không thể trả lời câu hỏi này.",
                sender: "ai",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error: any) {
            showToast("Lỗi khi gửi tin nhắn", "error");
            logger.error("Failed to send message", error);
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
            if (recommendations) {
                const recText = Array.isArray(recommendations)
                    ? recommendations.join("\n")
                    : String(recommendations);
                const aiMessage: Message = {
                    id: `msg-${Date.now()}-rec`,
                    text: `Gợi ý cho bạn:\n\n${recText}`,
                    sender: "ai",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, aiMessage]);
            }
        } catch (error) {
            showToast("Không thể lấy gợi ý", "error");
        } finally {
            setSending(false);
        }
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header title="AI Chat" showBack={false} />
                <LoadingIndicator />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["right", "left", "bottom"]}>
            <Header title="AI Chat - Trợ Lý Booking" showBack={false} />

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
                        <Text style={styles.timestamp}>
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
                            <MaterialCommunityIcons
                                name="robot-happy-outline"
                                size={64}
                                color="#cbd5e1"
                            />
                            <Text style={styles.emptyTitle}>Chào mừng bạn!</Text>
                            <Text style={styles.emptyDesc}>
                                Tôi là AI tư vấn của CHMS. Hỏi tôi bất cứ điều gì về:
                            </Text>
                            <View style={styles.featureList}>
                                <Text style={styles.featureItem}>✓ Tìm kiếm homestay</Text>
                                <Text style={styles.featureItem}>✓ Hỗ trợ đặt phòng</Text>
                                <Text style={styles.featureItem}>✓ Tư vấn giá cả</Text>
                                <Text style={styles.featureItem}>✓ Gợi ý địa điểm</Text>
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
                            name="lightbulb-outline"
                            size={18}
                            color="#0891b2"
                        />
                        <Text style={styles.quickActionText}>Nhận Gợi Ý</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Input Area */}
            <KeyboardAvoidingView
                style={styles.inputContainer}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <View style={styles.inputWrapper}>
                    <Input
                        placeholder="Nhập tin nhắn..."
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        numberOfLines={1}
                        editable={!sending}
                        style={styles.input}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (sending || !inputText.trim()) && styles.sendButtonDisabled]}
                        onPress={handleSendMessage}
                        disabled={sending || !inputText.trim()}
                        activeOpacity={0.7}
                    >
                        {sending ? (
                            <MaterialCommunityIcons
                                name="loading"
                                size={20}
                                color="#fff"
                            />
                        ) : (
                            <MaterialCommunityIcons name="send" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Bottom Actions */}
                <View style={styles.bottomActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleClearHistory}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={16}
                            color="#ef4444"
                        />
                        <Text style={styles.actionButtonText}>Xóa Chat</Text>
                    </TouchableOpacity>
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
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexGrow: 1,
        justifyContent: "flex-start",
    },
    emptyState: {
        alignItems: "center",
        marginTop: 60,
        marginBottom: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1e293b",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 14,
        color: "#64748b",
        marginBottom: 16,
        textAlign: "center",
    },
    featureList: {
        gap: 6,
    },
    featureItem: {
        fontSize: 13,
        color: "#64748b",
    },
    messageBubble: {
        marginBottom: 12,
        alignItems: "flex-start",
    },
    userBubble: {
        alignItems: "flex-end",
    },
    aiBubble: {
        alignItems: "flex-start",
    },
    bubble: {
        maxWidth: "80%",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    userMessage: {
        backgroundColor: "#0891b2",
        borderBottomRightRadius: 0,
    },
    aiMessage: {
        backgroundColor: "#e2e8f0",
        borderBottomLeftRadius: 0,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    userMessageText: {
        color: "#fff",
    },
    aiMessageText: {
        color: "#1e293b",
    },
    timestamp: {
        fontSize: 11,
        color: "#94a3b8",
        marginTop: 4,
        marginHorizontal: 12,
    },
    quickActions: {
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    quickActionButton: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#f0f9ff",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#bfdbfe",
        alignItems: "center",
    },
    quickActionText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#0891b2",
    },
    inputContainer: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
    },
    inputWrapper: {
        flexDirection: "row",
        gap: 8,
        alignItems: "flex-end",
    },
    input: {
        flex: 1,
        maxHeight: 100,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#0891b2",
        justifyContent: "center",
        alignItems: "center",
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    bottomActions: {
        flexDirection: "row",
        justifyContent: "center",
        paddingTop: 8,
    },
    actionButton: {
        flexDirection: "row",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: "center",
    },
    actionButtonText: {
        fontSize: 12,
        color: "#ef4444",
        fontWeight: "500",
    },
});
