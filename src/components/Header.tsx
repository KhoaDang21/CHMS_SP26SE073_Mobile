import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ViewStyle,
} from "react-native";
import {
    MaterialCommunityIcons,
    Feather,
} from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface HeaderProps {
    title?: string;
    showBack?: boolean;
    rightAction?: {
        icon: keyof typeof MaterialCommunityIcons.glyphMap;
        onPress: () => void;
    };
    style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
    title,
    showBack = false,
    rightAction,
    style,
}) => {
    const navigation = useNavigation();

    return (
        <View style={[styles.header, style]}>
            <View style={styles.leftSection}>
                {showBack && (
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                        style={styles.backButton}
                    >
                        <Feather name="chevron-left" size={24} color="#0891b2" />
                    </TouchableOpacity>
                )}
                {title && <Text style={styles.title}>{title}</Text>}
            </View>
            {rightAction && (
                <TouchableOpacity
                    onPress={rightAction.onPress}
                    activeOpacity={0.7}
                    style={styles.rightButton}
                >
                    <MaterialCommunityIcons
                        name={rightAction.icon}
                        size={24}
                        color="#0891b2"
                    />
                </TouchableOpacity>
            )}
        </View>
    );
};

interface StatusBadgeProps {
    status: string;
    style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
    const getStatusColor = (status: string) => {
        const statusMap: { [key: string]: { bg: string; text: string } } = {
            PENDING: { bg: "#fef3c7", text: "#92400e" },
            CONFIRMED: { bg: "#dbeafe", text: "#1e40af" },
            COMPLETED: { bg: "#dcfce7", text: "#15803d" },
            CANCELLED: { bg: "#fee2e2", text: "#991b1b" },
            CHECKED_IN: { bg: "#e0e7ff", text: "#312e81" },
            REJECTED: { bg: "#fee2e2", text: "#991b1b" },
        };
        return statusMap[status] || { bg: "#f1f5f9", text: "#64748b" };
    };

    const getStatusLabel = (status: string) => {
        const labelMap: { [key: string]: string } = {
            PENDING: "Chờ thanh toán cọc",
            CONFIRMED: "Đã xác nhận",
            COMPLETED: "Hoàn thành",
            CANCELLED: "Đã hủy",
            CHECKED_IN: "Đang lưu trú",
            REJECTED: "Bị từ chối",
            // payment statuses
            UNPAID: "Chưa thanh toán",
            DEPOSIT_PAID: "Đã đặt cọc",
            FULLY_PAID: "Đã thanh toán đủ",
            PARTIALLY_PAID: "Thanh toán một phần",
        };
        return labelMap[status] ?? status;
    };

    const colors = getStatusColor(status);

    return (
        <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>
                {getStatusLabel(status)}
            </Text>
        </View>
    );
};

interface SectionTitleProps {
    title: string;
    subtitle?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
    title,
    subtitle,
}) => {
    return (
        <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
    );
};

interface DividerProps {
    style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({ style }) => {
    return <View style={[styles.divider, style]} />;
};

interface BadgeProps {
    value: string | number;
    style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ value, style }) => {
    return (
        <View style={[styles.notificationBadge, style]}>
            <Text style={styles.badgeValue}>{value}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    leftSection: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    backButton: {
        marginRight: 8,
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1e293b",
    },
    rightButton: {
        padding: 4,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: "flex-start",
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600",
    },
    sectionTitleContainer: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1e293b",
    },
    sectionSubtitle: {
        fontSize: 12,
        color: "#64748b",
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: "#e2e8f0",
        marginVertical: 16,
    },
    notificationBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#ef4444",
        justifyContent: "center",
        alignItems: "center",
    },
    badgeValue: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },
});
