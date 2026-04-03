import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
    return (
        <TouchableOpacity
            style={[styles.card, style]}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={onPress ? 0.8 : 1}
        >
            {children}
        </TouchableOpacity>
    );
};

interface HomestayCardProps {
    id: string;
    name: string;
    image?: string;
    price: number;
    rating?: number;
    reviewCount?: number;
    location?: string;
    onPress: () => void;
    onWishlistPress: () => void;
    isFavorite?: boolean;
    compact?: boolean; // 2-column grid mode
}

export const HomestayCard: React.FC<HomestayCardProps> = ({
    id,
    name,
    image,
    price,
    rating,
    reviewCount,
    location,
    onPress,
    onWishlistPress,
    isFavorite = false,
    compact = false,
}) => {
    const hasRating = rating !== undefined && rating > 0;
    const starCount = hasRating ? Math.round(rating!) : 0;
    return (
        <Card style={[styles.homestayCard, compact && styles.homestayCardCompact]} onPress={onPress}>
            <View style={[styles.imageContainer, compact && styles.imageContainerCompact]}>
                <Image
                    source={{ uri: image || "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600" }}
                    style={styles.image}
                />
                <TouchableOpacity
                    style={[styles.wishlistButton, compact && styles.wishlistButtonCompact]}
                    onPress={(e) => {
                        e.stopPropagation();
                        onWishlistPress();
                    }}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={compact ? 16 : 22}
                        color={isFavorite ? "#ef4444" : "#fff"}
                    />
                </TouchableOpacity>
                {location ? (
                    <View style={[styles.locationBadge, compact && styles.locationBadgeCompact]}>
                        <MaterialCommunityIcons name="map-marker" size={10} color="#fff" />
                        <Text style={[styles.locationBadgeText, compact && styles.locationBadgeTextCompact]} numberOfLines={1}>
                            {location.split(",")[0].trim()}
                        </Text>
                    </View>
                ) : null}
            </View>
            <View style={[styles.content, compact && styles.contentCompact]}>
                <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={2}>{name}</Text>
                {hasRating ? (
                    <View style={styles.ratingRow}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <MaterialCommunityIcons
                                key={i}
                                name={i < starCount ? "star" : "star-outline"}
                                size={compact ? 11 : 14}
                                color={i < starCount ? "#f59e0b" : "#d1d5db"}
                            />
                        ))}
                        <Text style={[styles.ratingScore, compact && styles.ratingScoreCompact]}>{rating!.toFixed(1)}</Text>
                        {!compact && reviewCount != null && reviewCount > 0 && (
                            <Text style={styles.reviewCount}>· {reviewCount} đánh giá</Text>
                        )}
                    </View>
                ) : (
                    <Text style={[styles.noRating, compact && styles.noRatingCompact]}>Chưa có đánh giá</Text>
                )}
                {compact && reviewCount != null && reviewCount > 0 && (
                    <Text style={styles.reviewCountCompact}>{reviewCount} đánh giá</Text>
                )}
                <View style={styles.footer}>
                    <View style={styles.priceRow}>
                        <Text style={[styles.price, compact && styles.priceCompact]}>
                            ₫{price.toLocaleString("vi-VN")}
                        </Text>
                        <Text style={[styles.currency, compact && styles.currencyCompact]}>/đêm</Text>
                    </View>
                </View>
            </View>
        </Card>
    );
};

export const LoadingSkeletonCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    return (
        <View style={[styles.card, compact && styles.homestayCardCompact]}>
            <View style={[compact ? styles.imageContainerCompact : styles.imageContainer, styles.skeleton]} />
            <View style={[styles.content, compact && styles.contentCompact]}>
                <View style={[styles.skeleton, styles.skeletonText, { width: "80%" }]} />
                <View style={[styles.skeleton, styles.skeletonText, { width: "60%", marginTop: 6 }]} />
                <View style={[styles.skeleton, styles.skeletonText, { width: "40%", marginTop: 6 }]} />
            </View>
        </View>
    );
};

interface EmptyStateProps {
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    description?: string;
    action?: {
        label: string;
        onPress: () => void;
    };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = "inbox-outline",
    title,
    description,
    action,
}) => {
    return (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name={icon} size={56} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>{title}</Text>
            {description && <Text style={styles.emptyDescription}>{description}</Text>}
            {action && (
                <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={action.onPress}
                    activeOpacity={0.7}
                >
                    <Text style={styles.emptyButtonText}>{action.label}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    homestayCard: {
        marginBottom: 0,
    },
    homestayCardCompact: {
        flex: 1,
    },
    imageContainer: {
        position: "relative",
        width: "100%",
        height: 160,
        backgroundColor: "#f1f5f9",
    },
    imageContainerCompact: {
        height: 120,
    },
    image: {
        width: "100%",
        height: "100%",
    },
    wishlistButton: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    wishlistButtonCompact: {
        width: 28,
        height: 28,
        borderRadius: 14,
        top: 6,
        right: 6,
    },
    content: {
        padding: 12,
    },
    contentCompact: {
        padding: 8,
        minHeight: 90,
        justifyContent: "space-between",
    },
    name: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 4,
        lineHeight: 19,
    },
    nameCompact: {
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 3,
    },
    currency: {
        fontSize: 11,
        color: "#64748b",
        marginLeft: 2,
    },
    currencyCompact: {
        fontSize: 10,
    },
    // Location badge on image
    locationBadge: {
        position: "absolute",
        top: 8,
        left: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "rgba(0,0,0,0.55)",
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        maxWidth: "70%",
    },
    locationBadgeCompact: {
        paddingHorizontal: 5,
        paddingVertical: 2,
        maxWidth: "80%",
    },
    locationBadgeText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "600",
    },
    locationBadgeTextCompact: {
        fontSize: 9,
    },
    // Rating row below name
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        marginBottom: 6,
        flexWrap: "wrap",
    },
    ratingScore: {
        fontSize: 12,
        fontWeight: "700",
        color: "#0891b2",
        marginLeft: 2,
    },
    ratingScoreCompact: {
        fontSize: 11,
    },
    reviewCount: {
        fontSize: 11,
        color: "#64748b",
    },
    reviewCountCompact: {
        fontSize: 10,
        color: "#94a3b8",
        marginBottom: 4,
    },
    noRating: {
        fontSize: 11,
        color: "#94a3b8",
        marginBottom: 6,
    },
    noRatingCompact: {
        fontSize: 10,
        marginBottom: 4,
    },
    footer: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginTop: 2,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "baseline",
    },
    price: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0891b2",
    },
    priceCompact: {
        fontSize: 12,
    },
    skeleton: {
        backgroundColor: "#e2e8f0",
    },
    skeletonImage: {
        width: "100%",
        height: "100%",
    },
    skeletonText: {
        height: 12,
        borderRadius: 6,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1e293b",
        marginTop: 12,
        marginBottom: 4,
        textAlign: "center",
    },
    emptyDescription: {
        fontSize: 14,
        color: "#64748b",
        textAlign: "center",
        marginBottom: 16,
    },
    emptyButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: "#0891b2",
    },
    emptyButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
    },
});
