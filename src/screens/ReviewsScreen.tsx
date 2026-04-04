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
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReviewsScreen() {
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

    const StarRating = ({ rating }: { rating: number }) => (
        <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
                <MaterialCommunityIcons
                    key={star}
                    name={star <= rating ? "star" : "star-outline"}
                    size={14}
                    color="#fbbf24"
                    style={styles.star}
                />
            ))}
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header title="Các Review Của Tôi" />
                <LoadingIndicator />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header title="Các Review Của Tôi" />

            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <Card style={styles.reviewCard}>
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
                                                name="check-circle"
                                                size={12}
                                                color="#22c55e"
                                            />
                                            <Text style={styles.verifiedText}>Đã xác minh</Text>
                                        </View>
                                    )}
                                    <Text style={styles.createdAt}>
                                        {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.menuButton}
                                onPress={() => setEditingId(editingId === item.id ? null : item.id)}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="dots-vertical" size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <Divider style={styles.divider} />

                        {/* Ratings */}
                        <View style={styles.ratingGrid}>
                            <RatingItem label="Tổng thể" rating={item.overallRating} />
                            <RatingItem label="Sạch sẽ" rating={item.cleanlinessRating} />
                            <RatingItem label="Vị trí" rating={item.locationRating} />
                            <RatingItem label="Giá trị" rating={item.valueRating} />
                        </View>

                        {/* Comment */}
                        {editingId === item.id ? (
                            <View>
                                <Input
                                    label="Chỉnh sửa bình luận"
                                    placeholder="Nhập bình luận"
                                    value={editComment}
                                    onChangeText={setEditComment}
                                    multiline
                                    numberOfLines={3}
                                />
                                <View style={styles.actionButtons}>
                                    <Button
                                        title="Lưu"
                                        onPress={() => handleEditSave(item)}
                                        size="small"
                                        style={styles.actionButton}
                                    />
                                    <Button
                                        title="Hủy"
                                        onPress={() => {
                                            setEditingId(null);
                                            setEditComment("");
                                        }}
                                        variant="outline"
                                        size="small"
                                        style={styles.actionButton}
                                    />
                                </View>
                            </View>
                        ) : (
                            <>
                                {item.comment && (
                                    <View>
                                        <Text style={styles.comment}>{item.comment}</Text>
                                    </View>
                                )}
                                {item.ownerReply && (
                                    <View style={styles.replySection}>
                                        <View style={styles.replyHeader}>
                                            <MaterialCommunityIcons name="reply" size={16} color="#0891b2" />
                                            <Text style={styles.replyLabel}>Trả lời từ chủ nhà</Text>
                                        </View>
                                        <Text style={styles.replyText}>{item.ownerReply}</Text>
                                    </View>
                                )}
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={styles.actionLink}
                                        onPress={() => {
                                            setEditingId(item.id);
                                            setEditComment(item.comment);
                                        }}
                                    >
                                        <MaterialCommunityIcons name="pencil" size={16} color="#0891b2" />
                                        <Text style={styles.actionLinkText}>Chỉnh sửa</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionLink}
                                        onPress={() => handleDelete(item.id)}
                                    >
                                        <MaterialCommunityIcons name="delete" size={16} color="#ef4444" />
                                        <Text style={[styles.actionLinkText, { color: "#ef4444" }]}>Xóa</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </Card>
                )}
                ListEmptyComponent={
                    <EmptyState
                        icon="message-off-outline"
                        title="Chưa có review"
                        description="Hãy ở lại và đánh giá sự trải nghiệm của bạn"
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

function RatingItem({ label, rating }: { label: string; rating: number }) {
    return (
        <View style={styles.ratingItem}>
            <Text style={styles.ratingLabel}>{label}</Text>
            <View style={styles.starContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialCommunityIcons
                        key={star}
                        name={star <= rating ? "star" : "star-outline"}
                        size={12}
                        color="#fbbf24"
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    reviewCard: { marginHorizontal: 16, marginVertical: 8 },
    reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    homestayInfo: { flex: 1 },
    homestayName: { fontSize: 16, fontWeight: "700", color: "#1f2937", marginBottom: 4 },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
    verifiedText: { fontSize: 12, color: "#22c55e", fontWeight: "600" },
    createdAt: { fontSize: 12, color: "#9ca3af" },
    menuButton: { padding: 4 },
    divider: { marginVertical: 12 },
    ratingGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 12,
    },
    ratingItem: { flex: 1, minWidth: "45%" },
    ratingLabel: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
    starContainer: { flexDirection: "row", gap: 2 },
    star: { marginRight: 1 },
    comment: { fontSize: 14, color: "#4b5563", lineHeight: 20, marginBottom: 12 },
    replySection: { backgroundColor: "#f3f4f6", borderRadius: 8, padding: 12, marginTop: 12, marginBottom: 12 },
    replyHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    replyLabel: { fontSize: 12, fontWeight: "600", color: "#0891b2" },
    replyText: { fontSize: 13, color: "#4b5563", lineHeight: 18 },
    actionButtons: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
    actionButton: { flex: 1 },
    actionLink: { flexDirection: "row", alignItems: "center", gap: 4 },
    actionLinkText: { fontSize: 13, color: "#0891b2", fontWeight: "600" },
    emptyContainer: { flexGrow: 1, justifyContent: "center" },
});
