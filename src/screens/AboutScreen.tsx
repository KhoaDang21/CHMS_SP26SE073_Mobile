import { colors } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AboutScreen() {
    const navigation = useNavigation<any>();

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                    style={styles.backButton}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Về ứng dụng</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={[styles.heroIcon, { backgroundColor: colors.primary[100] }]}>
                        <MaterialCommunityIcons
                            name="home-heart"
                            size={64}
                            color={colors.primary[500]}
                        />
                    </View>
                    <Text style={styles.heroTitle}>CHMS Mobile</Text>
                    <Text style={styles.heroVersion}>Phiên bản 1.0.0</Text>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Về chúng tôi</Text>
                    <Text style={styles.sectionText}>
                        CHMS (Community Homestay Management System) là nền tảng quản lý homestay all-in-one
                        cho phép chủ nhà và khách hàng kết nối một cách dễ dàng và an toàn.
                    </Text>
                </View>

                {/* Mission Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sứ mệnh của chúng tôi</Text>
                    <Text style={styles.sectionText}>
                        Chúng tôi tin rằng mỗi người đều xứng đáng được trải nghiệm những chỗ ở tuyệt vời.
                        CHMS được xây dựng để giúp bạn tìm thấy ngôi nhà thứ hai hoàn hảo, với niềm tin và
                        an toàn.
                    </Text>
                </View>

                {/* Key Features */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Các tính năng chính</Text>
                    <FeatureItem
                        icon="magnify"
                        title="Tìm kiếm thông minh"
                        description="Tìm homestay dựa trên vị trí, giá, tiện nghi"
                    />
                    <FeatureItem
                        icon="bookmark-multiple"
                        title="Lưu yêu thích"
                        description="Lưu những homestay yêu thích của bạn"
                    />
                    <FeatureItem
                        icon="calendar-check"
                        title="Đặt phòng dễ dàng"
                        description="Quản lý các đặt phòng của bạn từ ứng dụng"
                    />
                    <FeatureItem
                        icon="message-text"
                        title="Liên lạc trực tiếp"
                        description="Gửi tin nhắn cho chủ nhà trước khi đặt"
                    />
                    <FeatureItem
                        icon="star"
                        title="Xếp hạng & Đánh giá"
                        description="Đọc và viết đánh giá từ các khách hàng khác"
                    />
                    <FeatureItem
                        icon="shield-check"
                        title="An toàn được đảm bảo"
                        description="Tất cả homestay được xác minh và kiểm tra"
                    />
                </View>

                {/* Team Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Đội ngũ phát triển</Text>
                    <Text style={styles.sectionText}>
                        CHMS được phát triển bởi một nhóm những người đam mê công nghệ và du lịch. Chúng tôi
                        luôn cố gắng cải thiện trải nghiệm của bạn.
                    </Text>
                </View>

                {/* Contact Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Liên hệ với chúng tôi</Text>
                    <ContactItem
                        icon="email"
                        title="Email"
                        value="support@chms.vn"
                    />
                    <ContactItem
                        icon="phone"
                        title="Điện thoại"
                        value="1-800-CHMS"
                    />
                    <ContactItem
                        icon="map-marker"
                        title="Địa chỉ"
                        value="Hồ Chí Minh, Việt Nam"
                    />
                </View>

                {/* Footer */}
                <View style={styles.footerSection}>
                    <Text style={styles.footerText}>© 2026 CHMS. Giữ bản quyền.</Text>
                    <Text style={styles.footerLink}>Điều khoản dịch vụ • Chính sách bảo mật</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

interface FeatureItemProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => (
    <View style={styles.featureItem}>
        <View style={[styles.featureIcon, { backgroundColor: colors.primary[50] }]}>
            <MaterialCommunityIcons name={icon} size={20} color={colors.primary[500]} />
        </View>
        <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDesc}>{description}</Text>
        </View>
    </View>
);

interface ContactItemProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    value: string;
}

const ContactItem: React.FC<ContactItemProps> = ({ icon, title, value }) => (
    <View style={styles.contactItem}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary[500]} />
        <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>{title}</Text>
            <Text style={styles.contactValue}>{value}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text.primary,
    },

    // Content
    scrollContent: {
        paddingBottom: 30,
    },

    // Hero Section
    heroSection: {
        alignItems: "center",
        paddingVertical: 30,
    },
    heroIcon: {
        width: 100,
        height: 100,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: colors.primary[600],
        marginBottom: 4,
    },
    heroVersion: {
        fontSize: 14,
        color: colors.text.secondary,
    },

    // Sections
    section: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text.primary,
        marginBottom: 12,
    },
    sectionText: {
        fontSize: 14,
        color: colors.text.secondary,
        lineHeight: 20,
    },

    // Feature Items
    featureItem: {
        flexDirection: "row",
        marginBottom: 16,
    },
    featureIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text.primary,
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 12,
        color: colors.text.secondary,
        lineHeight: 16,
    },

    // Contact Items
    contactItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    contactContent: {
        marginLeft: 12,
        flex: 1,
    },
    contactTitle: {
        fontSize: 12,
        color: colors.text.tertiary,
        marginBottom: 2,
    },
    contactValue: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text.primary,
    },

    // Footer
    footerSection: {
        paddingHorizontal: 20,
        paddingTop: 30,
        alignItems: "center",
    },
    footerText: {
        fontSize: 12,
        color: colors.text.tertiary,
        marginBottom: 8,
    },
    footerLink: {
        fontSize: 12,
        color: colors.primary[500],
    },
});
