import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ViewStyle,
    Image,
    TouchableOpacity,
    FlatList,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
    onPress: () => void;
    onWishlistPress: () => void;
    isFavorite?: boolean;
}

export const HomestayCard: React.FC<HomestayCardProps> = ({
    id,
    name,
    image,
    price,
    rating,
    reviewCount,
    onPress,
    onWishlistPress,
    isFavorite = false,
}) => {
    return (
        <Card style={styles.homestayCard} onPress={onPress}>
            <View style={styles.imageContainer}>
                <Image
                    source={{
                        uri: image || "https://via.placeholder.com/300x200?text=Homestay",
                    }}
                    style={styles.image}
                />
                <TouchableOpacity
                    style={styles.wishlistButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        onWishlistPress();
                    }}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={22}
                        color={isFavorite ? "#ef4444" : "#fff"}
                    />
                </TouchableOpacity>
                {rating !== undefined && (
                    <View style={styles.ratingBadge}>
                        <MaterialCommunityIcons name="star" size={14} color="#fbbf24" />
                        <Text style={styles.ratingText}>
                            {rating.toFixed(1)} ({reviewCount || 0})
                        </Text>
                    </View>
                )}
            </View>
            <View style={styles.content}>
                <Text style={styles.name} numberOfLines={2}>
                    {name}
                </Text>
                <View style={styles.footer}>
                    <Text style={styles.price}>₫{price.toLocaleString()}</Text>
                    <Text style={styles.currency}>/đêm</Text>
                </View>
            </View>
        </Card>
    );
};

export const LoadingSkeletonCard: React.FC = () => {
    return (
        <View style={styles.homestayCard}>
            <View style={[styles.image, styles.skeleton, styles.skeletonImage]} />
            <View style={styles.content}>
                <View style={[styles.skeleton, styles.skeletonText, { width: "80%" }]} />
                <View
                    style={[styles.skeleton, styles.skeletonText, { width: "60%", marginTop: 8 }]}
                />
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
        marginBottom: 16,
    },
    imageContainer: {
        position: "relative",
        width: "100%",
        height: 200,
        backgroundColor: "#f1f5f9",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    wishlistButton: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    ratingBadge: {
        position: "absolute",
        bottom: 12,
        left: 12,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    ratingText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    content: {
        padding: 12,
    },
    name: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: 8,
    },
    footer: {
        flexDirection: "row",
        alignItems: "baseline",
    },
    price: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0891b2",
    },
    currency: {
        fontSize: 12,
        color: "#64748b",
        marginLeft: 4,
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
