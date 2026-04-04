import {
    Card,
    Divider,
    EmptyState,
    Header,
    LoadingIndicator
} from "@/components";
import type { Notification } from "@/service/notification/notificationService";
import { notificationService } from "@/service/notification/notificationService";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationsScreen() {
    const [items, setItems] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = useCallback(async () => {
        try {
            const [notifications, count] = await Promise.all([
                notificationService.getNotifications(50, 0),
                notificationService.getUnreadCount(),
            ]);
            setItems(notifications);
            setUnreadCount(count);
        } catch (error) {
            showToast("Không thể tải thông báo", "error");

        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadNotifications();
    }, [loadNotifications]);

    const handleMarkAsRead = useCallback(
        async (id: string) => {
            try {
                await notificationService.markAsRead(id);
                setItems((prev) =>
                    prev.map((item) =>
                        item.id === id ? { ...item, isRead: true } : item
                    )
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            } catch {
                showToast("Không thể đánh dấu đã đọc", "error");
            }
        },
        []
    );

    const handleMarkAllAsRead = useCallback(async () => {
        try {
            await notificationService.markAllAsRead();
            setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
            setUnreadCount(0);
            showToast("Đã đánh dấu tất cả đã đọc", "success");
        } catch {
            showToast("Không thể đánh dấu tất cả đã đọc", "error");
        }
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        try {
            await notificationService.deleteNotification(id);
            setItems((prev) => prev.filter((item) => item.id !== id));
            showToast("Đã xóa thông báo", "info");
        } catch {
            showToast("Không thể xóa thông báo", "error");
        }
    }, []);

    const getTypeIcon = (type: string) => {
        const iconMap: { [key: string]: string } = {
            BOOKING: "calendar-outline",
            PAYMENT: "credit-card-outline",
            REVIEW: "star-outline",
            HOMESTAY: "home-outline",
            SUPPORT: "headphones",
            SYSTEM: "bell-outline",
        };
        return iconMap[type] || "bell-outline";
    };

    const getTypeColor = (type: string) => {
        const colorMap: { [key: string]: string } = {
            BOOKING: "#2563eb",
            PAYMENT: "#16a34a",
            REVIEW: "#dc2626",
            HOMESTAY: "#0891b2",
            SUPPORT: "#f59e0b",
            SYSTEM: "#6b7280",
        };
        return colorMap[type] || "#6b7280";
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header title="Thông Báo" />
                <LoadingIndicator />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerSection}>
                <Header title="Thông Báo" />
                {unreadCount > 0 && (
                    <TouchableOpacity
                        style={styles.markAllButton}
                        onPress={handleMarkAllAsRead}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.markAllText}>Đánh dấu tất cả đã đọc</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const cardStyle = item.isRead ? undefined : styles.unreadCard;
                    return (
                        <Card style={[styles.notificationCard, cardStyle] as any}>
                            <View style={styles.notificationContent}>
                                <View
                                    style={[
                                        styles.iconContainer,
                                        { backgroundColor: getTypeColor(item.type) + "20" },
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name={getTypeIcon(item.type) as any}
                                        size={24}
                                        color={getTypeColor(item.type)}
                                    />
                                </View>
                                <View style={styles.details}>
                                    <Text style={styles.title} numberOfLines={2}>
                                        {item.title}
                                    </Text>
                                    <Text style={styles.message} numberOfLines={2}>
                                        {item.message}
                                    </Text>
                                    <Text style={styles.time}>
                                        {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDelete(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons
                                        name="close-circle-outline"
                                        size={20}
                                        color="#9ca3af"
                                    />
                                </TouchableOpacity>
                            </View>

                            {!item.isRead && (
                                <>
                                    <Divider style={styles.divider} />
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => handleMarkAsRead(item.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.actionText}>Đánh dấu đã đọc</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </Card>
                    );
                }}
                ListEmptyComponent={
                    <EmptyState
                        icon="bell-off-outline"
                        title="Không có thông báo"
                        description="Bạn sẽ nhận thông báo khi có hoạt động mới"
                    />
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    headerSection: { paddingHorizontal: 16, paddingVertical: 8 },
    markAllButton: { paddingHorizontal: 16, paddingVertical: 8 },
    markAllText: { fontSize: 14, color: "#0891b2", fontWeight: "600" },
    notificationCard: { marginHorizontal: 16, marginVertical: 8, padding: 0, overflow: "hidden" },
    unreadCard: { backgroundColor: "#e0f2fe20" },
    notificationContent: { flexDirection: "row", alignItems: "flex-start", padding: 12, gap: 12 },
    iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    details: { flex: 1 },
    title: { fontSize: 14, fontWeight: "600", color: "#1f2937", marginBottom: 4 },
    message: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
    time: { fontSize: 12, color: "#9ca3af" },
    deleteButton: { padding: 4 },
    divider: { marginHorizontal: 0 },
    actionButton: { paddingHorizontal: 12, paddingVertical: 10 },
    actionText: { fontSize: 13, color: "#0891b2", fontWeight: "600" },
    emptyContainer: { flexGrow: 1, justifyContent: "center" },
});
