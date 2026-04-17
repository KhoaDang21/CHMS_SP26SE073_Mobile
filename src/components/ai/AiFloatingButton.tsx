import { useRef, useEffect, useState, useCallback } from "react";
import {
    Animated,
    Easing,
    StyleSheet,
    TouchableOpacity,
    View,
    PanResponder,
    Dimensions,
    Modal,
    KeyboardAvoidingView,
    Platform,
    FlatList,
    TextInput,
    Text,
    TouchableWithoutFeedback,
    StatusBar,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChat } from "@/hooks/useChat";
import { AiBubbleContent } from "./AiBubbleContent";
import { showToast } from "@/utils/toast";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const BTN_SIZE = 56;
const DOCK_RIGHT = SCREEN_W - BTN_SIZE - 20;

function TypingDots() {
    const dots = [
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
    ];
    useEffect(() => {
        const anims = dots.map((dot, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 150),
                    Animated.timing(dot, { toValue: -6, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.delay(300),
                ])
            )
        );
        Animated.parallel(anims).start();
        return () => anims.forEach(a => a.stop());
    }, []);
    return (
        <View style={s.dotsRow}>
            {dots.map((dot, i) => (
                <Animated.View key={i} style={[s.dot, { transform: [{ translateY: dot }] }]} />
            ))}
        </View>
    );
}

export default function AiFloatingButton() {
    const insets = useSafeAreaInsets();
    const { messages, sending, historyLoading, sendMessage, clearHistory } = useChat();
    const [modalVisible, setModalVisible] = useState(false);
    const [inputText, setInputText] = useState("");
    const flatListRef = useRef<FlatList>(null);

    // Dock Y position (bottom right)
    const dockY = SCREEN_H - BTN_SIZE - insets.bottom - 72;

    // Current free position (used while dragging)
    const posRef = useRef({ x: DOCK_RIGHT, y: dockY });
    const pan = useRef(new Animated.ValueXY({ x: DOCK_RIGHT, y: dockY })).current;
    const isDragging = useRef(false);
    const modalVisibleRef = useRef(false);

    // Ping animation
    const ping = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(ping, { toValue: 1.6, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(ping, { toValue: 1, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
                Animated.delay(1500),
            ])
        ).start();
    }, []);

    // Modal expand animation
    const expandAnim = useRef(new Animated.Value(0)).current;

    const openModal = useCallback(() => {
        // Snap button back to dock position
        posRef.current = { x: DOCK_RIGHT, y: dockY };
        Animated.spring(pan, {
            toValue: { x: DOCK_RIGHT, y: dockY },
            useNativeDriver: false,
            tension: 80,
            friction: 10,
        }).start();

        modalVisibleRef.current = true;
        setModalVisible(true);
        expandAnim.setValue(0);
        Animated.spring(expandAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 55,
            friction: 8,
        }).start();
    }, [pan, expandAnim, dockY]);

    const closeModal = useCallback(() => {
        Animated.timing(expandAnim, {
            toValue: 0,
            duration: 180,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            modalVisibleRef.current = false;
            setModalVisible(false);
        });
    }, [expandAnim]);

    // PanResponder — disabled while modal is open
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !modalVisibleRef.current,
            onMoveShouldSetPanResponder: (_, g) =>
                !modalVisibleRef.current && (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5),
            onPanResponderGrant: () => {
                isDragging.current = false;
                pan.setOffset({ x: posRef.current.x, y: posRef.current.y });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: (_, g) => {
                if (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5) isDragging.current = true;
                pan.setValue({ x: g.dx, y: g.dy });
            },
            onPanResponderRelease: (_, g) => {
                pan.flattenOffset();
                const newX = Math.max(0, Math.min(SCREEN_W - BTN_SIZE, posRef.current.x + g.dx));
                const newY = Math.max(insets.top + 10, Math.min(SCREEN_H - BTN_SIZE - insets.bottom - 10, posRef.current.y + g.dy));
                posRef.current = { x: newX, y: newY };
                Animated.spring(pan, {
                    toValue: { x: newX, y: newY },
                    useNativeDriver: false,
                    tension: 80,
                    friction: 10,
                }).start();
                // Reset drag flag after a tick so tap handler doesn't fire
                setTimeout(() => { isDragging.current = false; }, 50);
            },
        })
    ).current;

    useEffect(() => {
        if (messages.length > 0 && modalVisible) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages, modalVisible]);

    const handleSend = useCallback(async () => {
        if (!inputText.trim() || sending) return;
        const msg = inputText.trim();
        setInputText("");
        try { await sendMessage(msg); } catch { showToast("Lỗi khi gửi tin nhắn", "error"); }
    }, [inputText, sending, sendMessage]);

    const handleClear = useCallback(async () => {
        try { await clearHistory(); showToast("Đã xóa lịch chat", "success"); } catch { showToast("Không thể xóa", "error"); }
    }, [clearHistory]);

    return (
        <>
            {/* Floating draggable button */}
            <Animated.View
                style={[s.wrapper, { left: pan.x, top: pan.y }]}
                {...panResponder.panHandlers}
            >
                {!modalVisible && (
                    <Animated.View
                        style={[
                            s.ping,
                            {
                                transform: [{ scale: ping }],
                                opacity: ping.interpolate({ inputRange: [1, 1.6], outputRange: [0.35, 0] }),
                            },
                        ]}
                    />
                )}
                <TouchableOpacity
                    style={s.btn}
                    onPress={() => {
                        if (!isDragging.current) {
                            modalVisible ? closeModal() : openModal();
                        }
                    }}
                    activeOpacity={0.85}
                >
                    <MaterialCommunityIcons
                        name={modalVisible ? "close" : "robot-outline"}
                        size={26}
                        color="#fff"
                    />
                </TouchableOpacity>
            </Animated.View>

            {/* Full-screen chat modal — expands from bottom-right icon */}
            <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal} statusBarTranslucent>
                <TouchableWithoutFeedback onPress={closeModal}>
                    <Animated.View style={[s.backdrop, { opacity: expandAnim }]} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        s.chatPanel,
                        {
                            bottom: insets.bottom + BTN_SIZE + 16,
                            transform: [
                                {
                                    scale: expandAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.3, 1],
                                    }),
                                },
                                {
                                    translateX: expandAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [SCREEN_W * 0.35, 0],
                                    }),
                                },
                                {
                                    translateY: expandAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [SCREEN_H * 0.3, 0],
                                    }),
                                },
                            ],
                            opacity: expandAnim.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [0, 0.8, 1],
                            }),
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={s.header}>
                        <View style={s.headerLeft}>
                            <View style={s.headerAvatar}>
                                <MaterialCommunityIcons name="robot" size={18} color="#fff" />
                            </View>
                            <View>
                                <Text style={s.headerTitle}>Trợ lý CHMS</Text>
                                <View style={s.headerOnline}>
                                    <View style={s.onlineDot} />
                                    <Text style={s.headerSubtitle}>Luôn sẵn sàng hỗ trợ</Text>
                                </View>
                            </View>
                        </View>
                        <View style={s.headerRight}>
                            <TouchableOpacity style={s.headerBtn} onPress={handleClear}>
                                <MaterialCommunityIcons name="trash-can-outline" size={18} color="rgba(255,255,255,0.8)" />
                            </TouchableOpacity>
                            <TouchableOpacity style={s.headerBtn} onPress={closeModal}>
                                <MaterialCommunityIcons name="close" size={20} color="rgba(255,255,255,0.8)" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Messages */}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item, idx) => item.timestamp + idx}
                        style={s.messageList}
                        contentContainerStyle={s.messageContent}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View style={[s.msgRow, item.sender === "User" ? s.userRow : s.aiRow]}>
                                {item.sender === "AI" && (
                                    <View style={s.aiAvatar}>
                                        <MaterialCommunityIcons name="robot" size={13} color="#fff" />
                                    </View>
                                )}
                                <View style={[s.bubble, item.sender === "User" ? s.userBubble : s.aiBubble]}>
                                    {item.sender === "AI" ? (
                                        <AiBubbleContent
                                            message={item.message}
                                            recommendedHomestays={item.recommendedHomestays}
                                            isRecommendation={item.isRecommendation}
                                        />
                                    ) : (
                                        <Text style={s.userText}>{item.message}</Text>
                                    )}
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={
                            !historyLoading ? (
                                <View style={s.emptyState}>
                                    <MaterialCommunityIcons name="robot-happy-outline" size={40} color="#0891b2" />
                                    <Text style={s.emptyTitle}>Xin chào! Tôi có thể giúp gì?</Text>
                                    <Text style={s.emptyText}>Hỏi tôi về homestay, đặt phòng, giá cả...</Text>
                                </View>
                            ) : null
                        }
                        ListFooterComponent={
                            sending ? (
                                <View style={s.typingRow}>
                                    <View style={s.aiAvatar}>
                                        <MaterialCommunityIcons name="robot" size={13} color="#fff" />
                                    </View>
                                    <View style={s.typingBubble}><TypingDots /></View>
                                </View>
                            ) : null
                        }
                    />

                    {/* Input */}
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                        <View style={s.inputRow}>
                            <TextInput
                                style={s.input}
                                placeholder="Hỏi AI bất cứ điều gì..."
                                placeholderTextColor="#94a3b8"
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                editable={!sending}
                                onSubmitEditing={handleSend}
                                blurOnSubmit={false}
                            />
                            <TouchableOpacity
                                style={[s.sendBtn, (!inputText.trim() || sending) && s.sendBtnDisabled]}
                                onPress={handleSend}
                                disabled={!inputText.trim() || sending}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons name="send" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </Animated.View>
            </Modal>
        </>
    );
}

const s = StyleSheet.create({
    wrapper: {
        position: "absolute",
        zIndex: 9999,
        width: BTN_SIZE,
        height: BTN_SIZE,
        alignItems: "center",
        justifyContent: "center",
    },
    ping: {
        position: "absolute",
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: BTN_SIZE / 2,
        backgroundColor: "#0891b2",
    },
    btn: {
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: BTN_SIZE / 2,
        backgroundColor: "#0891b2",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#0891b2",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    chatPanel: {
        position: "absolute",
        left: 12,
        right: 12,
        top: (StatusBar.currentHeight ?? 44) + 8,
        backgroundColor: "#f8fafc",
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "#0891b2",
    },
    headerLeft: { flexDirection: "row", alignItems: "center" },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    headerTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
    headerOnline: { flexDirection: "row", alignItems: "center", marginTop: 2 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#86efac", marginRight: 5 },
    headerSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.8)" },
    headerRight: { flexDirection: "row", alignItems: "center" },
    headerBtn: { padding: 7, borderRadius: 8, marginLeft: 4 },
    messageList: { flex: 1 },
    messageContent: { padding: 14, flexGrow: 1 },
    msgRow: { marginBottom: 14, maxWidth: "85%" },
    userRow: { alignSelf: "flex-end" },
    aiRow: { alignSelf: "flex-start", flexDirection: "row", alignItems: "flex-end" },
    aiAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#0891b2",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 7,
        marginBottom: 2,
    },
    bubble: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18 },
    userBubble: { backgroundColor: "#0891b2", borderBottomRightRadius: 4 },
    aiBubble: { backgroundColor: "#fff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e2e8f0" },
    userText: { fontSize: 14, color: "#fff", lineHeight: 21 },
    emptyState: { alignItems: "center", paddingVertical: 40 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginTop: 14 },
    emptyText: { fontSize: 13, color: "#64748b", marginTop: 6, textAlign: "center" },
    typingRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12 },
    typingBubble: {
        backgroundColor: "#fff",
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    dotsRow: { flexDirection: "row", alignItems: "center" },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#0891b2", marginHorizontal: 3 },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        padding: 12,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
    },
    input: {
        flex: 1,
        backgroundColor: "#f8fafc",
        borderRadius: 18,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 14,
        color: "#1e293b",
        maxHeight: 100,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        marginRight: 10,
    },
    sendBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#0891b2",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#0891b2",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    sendBtnDisabled: { backgroundColor: "#cbd5e1", shadowOpacity: 0, elevation: 0 },
});
