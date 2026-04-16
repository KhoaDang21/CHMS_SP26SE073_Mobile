import {
    Button,
    Card,
    Divider,
    EmptyState,
    Header,
    Input,
    LoadingIndicator,
} from "@/components";
import { reviewService, type Review } from "@/service/review/reviewService";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function ReviewsScreen() {
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editComment, setEditComment] = useState("");

    const loadReviews = useCallback(async () => {
        try {
            const data = await reviewService.getMyReviews();
            setItems(data || []);
        } catch (error) {
            showToast("Không thể tải danh sách review", "error");

        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadReviews();
    }, [loadReviews]);

    const handleDelete = useCallback(async (id: string) => {
        try {
            await reviewService.deleteReview(id);
            setItems((prev) => prev.filter((item) => item.id !== id));
            showToast("Xóa review thành công", "success");
        } catch {
            showToast("Không thể xóa review", "error");
        }
    }, []);

    const handleEditSave = useCallback(
        async (review: Review) => {
            try {
                await reviewService.updateReview(review.id, {
                    comment: editComment,
                });
                setItems((prev) =>
                    prev.map((item) =>
                        item.id === review.id ? { ...item, comment: editComment } : item
                    )
                );
                setEditingId(null);
                setEditComment("");
                showToast("Cập nhật review thành công", "success");
            } catch {
                showToast("Không thể cập nhật review", "error");
            }
        },
        [editComment]
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={[]}>
                <Header title="Đánh giá của tôi" />
                <LoadingIndicator />
            </SafeAreaView>
        );
    }

    return (<SafeAreaView style={styles.container} edges={[]}>
        <Header title="Đánh giá của tôi" />

        <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <View style={styles.reviewCard}>
                    {/* Header */}
                    <View style={styles.reviewHeader}>
                        <View style={styles.homestayInfo}>
                            <Text style={styles.homestayName} numberOfLines={2}>
                                {item.homestayName}
                            </Text>
                            <View style={styles.badgeRow}>
                                {item.isVerified && (
                                    <View style={styles.verifiedBadge}>
                                        <MaterialCommunityIcons
                                            name="check-decagram"
                                            size={14}
                                            color="#059669"
                                        />
                                        <Text style={styles.verifiedText}>Đã ở</Text>
                                    </View>
                                )}
                                <Text style={styles.createdAt}>
                                    {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.ratingBadge}>
                            <MaterialCommunityIcons name="star" size={14} color="#fff" />
                            <Text style={styles.ratingBadgeText}>{item.overallRating.toFixed(1)}</Text>
                        </View>
                    </View>

                    <Divider style={styles.divider} />

                    {/* Ratings Grid */}
                    <View style={styles.ratingGrid}>
                        <RatingItem label="Sạch sẽ" rating={item.cleanlinessRating} />
                        <RatingItem label="Vị trí" rating={item.locationRating} />
                        <RatingItem label="Giá trị" rating={item.valueRating} />
                        <RatingItem label="Giao tiếp" rating={item.communicationRating} />
                    </View>

                    {/* Comment Section */}
                    {editingId === item.id ? (
                        <View style={styles.editSection}>
                            <Input
                                placeholder="Chia sẻ trải nghiệm của bạn..."
                                value={editComment}
                                onChangeText={setEditComment}
                                multiline
                                numberOfLines={4}
                                style={styles.editInput}
                            />
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.btn, styles.btnOutline]}
                                    onPress={() => {
                                        setEditingId(null);
                                        setEditComment("");
                                    }}
                                >
                                    <Text style={styles.btnTextOutline}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btn, styles.btnPrimary]}
                                    onPress={() => handleEditSave(item)}
                                >
                                    <Text style={styles.btnTextPrimary}>Lưu thay đổi</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.contentSection}>
                            {item.comment ? (
                                <Text style={styles.comment}>{item.comment}</Text>
                            ) : (
                                <Text style={styles.noComment}>Không có nội dung bình luận</Text>
                            )}

                            {item.ownerReply && (
                                <View style={styles.replySection}>
                                    <View style={styles.replyHeader}>
                                        <View style={styles.replyLine} />
                                        <Text style={styles.replyLabel}>Phản hồi từ chủ nhà</Text>
                                    </View>
                                    <Text style={styles.replyText}>{item.ownerReply}</Text>
                                </View>
                            )}

                            <View style={styles.footerActions}>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => {
                                        setEditingId(item.id);
                                        setEditComment(item.comment);
                                    }}
                                >
                                    <MaterialCommunityIcons name="pencil-outline" size={16} color="#64748b" />
                                    <Text style={styles.actionBtnText}>Sửa</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => handleDelete(item.id)}
                                >
                                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ef4444" />
                                    <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>Xóa</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            )}
            ListEmptyComponent={
                <EmptyState
                    icon="star-outline"
                    title="Chưa có đánh giá nào"
                    description="Những đánh giá của bạn sẽ giúp ích cho cộng đồng du lịch."
                />
            }
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0891b2" />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
        />
    </SafeAreaView>
    );
}

function RatingItem({ label, rating }: { label: string; rating: number }) {
    return (
        <View style={styles.ratingItem}>
            <Text style={styles.ratingLabel}>{label}</Text>
            <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialCommunityIcons
                        key={star}
                        name={star <= rating ? "star" : "star-outline"}
                        size={10}
                        color={star <= rating ? "#fbbf24" : "#e2e8f0"}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    listContent: { padding: 16, paddingBottom: 40, flexGrow: 1 },
    reviewCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    reviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    homestayInfo: { flex: 1, paddingRight: 10 },
    homestayName: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    verifiedBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#ecfeff",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    verifiedText: { fontSize: 11, color: "#0891b2", fontWeight: "700" },
    createdAt: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#0891b2",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    ratingBadgeText: { fontSize: 13, fontWeight: "800", color: "#fff" },
    divider: { marginVertical: 14, backgroundColor: "#f1f5f9" },
    ratingGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        rowGap: 12,
        marginBottom: 16,
    },
    ratingItem: { width: "50%" },
    ratingLabel: { fontSize: 11, color: "#64748b", fontWeight: "600", marginBottom: 4, textTransform: "uppercase" },
    starRow: { flexDirection: "row", gap: 2 },

    contentSection: { marginTop: 4 },
    comment: { fontSize: 14, color: "#334155", lineHeight: 22, fontWeight: "400" },
    noComment: { fontSize: 14, color: "#94a3b8", fontStyle: "italic" },

    replySection: {
        backgroundColor: "#f8fafc",
        borderRadius: 14,
        padding: 12,
        marginTop: 16,
        borderLeftWidth: 3,
        borderLeftColor: "#0891b2",
    },
    replyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    replyLine: { width: 4, height: 16, borderRadius: 2, backgroundColor: "#0891b2" },
    replyLabel: { fontSize: 12, fontWeight: "700", color: "#0891b2" },
    replyText: { fontSize: 13, color: "#475569", lineHeight: 20 },

    footerActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 20,
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
    },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    actionBtnText: { fontSize: 13, color: "#64748b", fontWeight: "600" },

    editSection: { marginTop: 10 },
    editInput: { backgroundColor: "#f8fafc", borderRadius: 12 },
    actionButtons: { flexDirection: "row", gap: 10, marginTop: 12 },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
    btnPrimary: { backgroundColor: "#0891b2" },
    btnOutline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
    btnTextPrimary: { color: "#fff", fontWeight: "700", fontSize: 14 },
    btnTextOutline: { color: "#64748b", fontWeight: "600", fontSize: 14 },

    emptyContainer: { flexGrow: 1, justifyContent: "center", paddingBottom: 100 },
});
