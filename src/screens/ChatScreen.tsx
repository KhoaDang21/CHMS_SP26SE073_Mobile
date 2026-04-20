import { LoadingIndicator } from "@/components";
import { useChat } from "@/hooks/useChat";
import { AiBubbleContent } from "@/components/ai/AiBubbleContent";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
    Animated,
    Easing,
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

/** Animated 3-dot typing indicator */
function TypingDots() {
    const dots = [
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
    ];

    useEffect(() => {
        const animations = dots.map((dot, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 150),
                    Animated.timing(dot, {
                        toValue: -6,
                        duration: 300,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 300,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.delay(300),
                ])
            )
        );
        Animated.parallel(animations).start();
        return () => animations.forEach(a => a.stop());
    }, []);

    return (
        <View style={styles.dotsRow}>
            {dots.map((dot, i) => (
                <Animated.View
                    key={i}
                    style={[styles.dot, { transform: [{ translateY: dot }] }]}
                />
            ))}
        </View>
    );
}

export default function ChatScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { messages, sending, historyLoading, sendMessage, clearHistory } = useChat();
    const [inputText, setInputText] = useState("");
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const handleInputFocus = useCallback(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);
    }, []);

    const handleSendMessage = useCallback(async () => {
        if (!inputText.trim() || sending) return;
        const msgToSend = inputText.trim();
        setInputText("");
        try {
            await sendMessage(msgToSend);
        } catch {
            showToast("Lỗi khi gửi tin nhắn", "error");
        }
    }, [inputText, sendMessage, sending]);

    const handleClearHistory = useCallback(async () => {
        try {
            await clearHistory();
            showToast("Đã xóa lịch chat", "success");
        } catch {
            showToast("Không thể xóa lịch chat", "error");
        }
    }, [clearHistory]);

    const handleGetRecommendations = useCallback(async () => {
        try {
            await sendMessage("Tôi muốn nhận gợi ý về homestay");
        } catch {
            showToast("Không thể gửi yêu cầu", "error");
        }
    }, [sendMessage]);

    const handleNavigateToHomestay = useCallback((homestayId: string) => {
        // Navigate to HomestayDetail FIRST (push behind Chat modal)
        // Then close Chat modal
        // Both actions queue synchronously, ensuring proper order
        navigation.navigate('HomestayDetail', { id: homestayId });
        navigation.goBack();
    }, [navigation]);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header với nút đóng */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerAvatar}>
                        <MaterialCommunityIcons name="robot" size={20} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Trợ lý CHMS</Text>
                        <View style={styles.headerOnline}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.headerSubtitle}>Luôn sẵn sàng hỗ trợ</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleClearHistory}>
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                        <MaterialCommunityIcons name="close" size={22} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>
            </View>

            {historyLoading ? (
                <LoadingIndicator />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, idx) => item.timestamp + idx}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                        <View
                            style={[
                                styles.messageBubble,
                                item.sender === "User" ? styles.userBubble : styles.aiBubble,
                            ]}
                        >
                            <View style={styles.bubbleWrapper}>
                                {item.sender === "AI" && (
                                    <View style={styles.aiAvatar}>
                                        <MaterialCommunityIcons name="robot" size={16} color="#fff" />
                                    </View>
                                )}
                                <View
                                    style={[
                                        styles.bubble,
                                        item.sender === "User" ? styles.userMessage : styles.aiMessage,
                                    ]}
                                >
                                    {item.sender === "AI" ? (
                                        <AiBubbleContent
                                            message={item.message}
                                            recommendedHomestays={item.recommendedHomestays}
                                            isRecommendation={item.isRecommendation}
                                            onNavigateToHomestay={handleNavigateToHomestay}
                                        />
                                    ) : (
                                        <Text style={[styles.messageText, styles.userMessageText]}>
                                            {item.message}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <Text style={[styles.timestamp, item.sender === "User" && styles.timestampRight]}>
                                {new Date(item.timestamp).toLocaleTimeString("vi-VN", {
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
                    ListFooterComponent={
                        sending ? (
                            <View style={styles.typingContainer}>
                                <View style={styles.aiAvatar}>
                                    <MaterialCommunityIcons name="robot" size={16} color="#fff" />
                                </View>
                                <View style={styles.typingBubble}>
                                    <TypingDots />
                                </View>
                            </View>
                        ) : null
                    }
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Quick Action — chỉ hiện khi chưa có tin nhắn */}
            {messages.length === 0 && !historyLoading && (
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={handleGetRecommendations}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="creation" size={18} color="#fff" />
                        <Text style={styles.quickActionText}>Nhận Gợi Ý Homestay Ngay</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
                enabled
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
                            onSubmitEditing={handleSendMessage}
                            blurOnSubmit={false}
                            onFocus={handleInputFocus}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                (sending || !inputText.trim()) && styles.sendButtonDisabled,
                            ]}
                            onPress={handleSendMessage}
                            disabled={sending || !inputText.trim()}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="send" size={20} color="#fff" />
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
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#0891b2",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#fff",
    },
    headerOnline: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#86efac",
        marginRight: 5,
    },
    headerSubtitle: {
        fontSize: 11,
        color: "rgba(255,255,255,0.8)",
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerBtn: {
        padding: 8,
        borderRadius: 8,
        marginLeft: 4,
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
        justifyContent: "center",
        marginHorizontal: -5,
    },
    featureChip: {
        flexDirection: "row",
        alignItems: "center",
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
        margin: 5,
    },
    featureChipText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#334155",
        marginLeft: 6,
    },
    messageBubble: {
        marginBottom: 16,
        maxWidth: "85%",
        maxHeight: "80%",
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
    },
    aiAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#0891b2",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 4,
        marginRight: 8,
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
    timestamp: {
        fontSize: 11,
        color: "#94a3b8",
        marginTop: 6,
        marginHorizontal: 4,
    },
    timestampRight: {
        textAlign: "right",
    },
    typingContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginBottom: 16,
        alignSelf: "flex-start",
    },
    typingBubble: {
        backgroundColor: "#fff",
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        paddingHorizontal: 16,
        paddingVertical: 14,
        elevation: 1,
    },
    dotsRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#0891b2",
        marginHorizontal: 3,
    },
    quickActions: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    quickActionButton: {
        flexDirection: "row",
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
        marginLeft: 10,
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        zIndex: 10,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "flex-end",
    },
    msgInput: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: "#1e293b",
        maxHeight: 120,
        borderWidth: 1.5,
        borderColor: "#cbd5e1",
        marginRight: 10,
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
