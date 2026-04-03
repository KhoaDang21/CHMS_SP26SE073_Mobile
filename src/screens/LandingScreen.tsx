import { colors } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback } from "react";
import {
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function LandingScreen() {
  const navigation = useNavigation<any>();

  const handleLoginPress = useCallback(() => {
    navigation.navigate("Login");
  }, [navigation]);

  const handleExplorePress = useCallback(() => {
    navigation.navigate("Explore");
  }, [navigation]);

  const handleRegisterPress = useCallback(() => {
    navigation.navigate("Register");
  }, [navigation]);

  const handleAboutPress = useCallback(() => {
    navigation.navigate("About");
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Gradient */}
        <LinearGradient
          colors={["#1d4ed8", "#0891b2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <MaterialCommunityIcons name="waves" size={28} color="#fff" />
            </View>
            <Text style={styles.logoText}>CHMS</Text>
          </View>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Khám Phá Homestay</Text>
            <Text style={styles.heroTitleAccent}>Ven Biển Tuyệt Đẹp</Text>
            <Text style={styles.heroSubtitle}>
              Tìm kiếm và đặt những homestay ven biển tuyệt vời nhất Việt Nam
            </Text>
          </View>

          {/* Hero Image Placeholder */}
          <View style={styles.heroImageContainer}>
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800" }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroImageOverlay} />
            {/* Floating Card */}
            <View style={styles.floatingCard}>
              <MaterialCommunityIcons name="star" size={16} color="#fbbf24" />
              <Text style={styles.floatingCardText}>4.8 · 50K+ khách hàng</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatItem icon="home-city" value="10K+" label="Homestay" />
          <View style={styles.statDivider} />
          <StatItem icon="account-group" value="50K+" label="Khách hàng" />
          <View style={styles.statDivider} />
          <StatItem icon="star" value="4.8★" label="Đánh giá" />
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Tại sao chọn CHMS?</Text>
          <View style={styles.featureGrid}>
            <FeatureCard icon="magnify" title="Tìm kiếm dễ dàng" description="Lọc theo vị trí, giá, tiện nghi" />
            <FeatureCard icon="shield-check" title="An toàn & Tin cậy" description="Homestay được xác minh kỹ lưỡng" />
            <FeatureCard icon="credit-card-outline" title="Thanh toán linh hoạt" description="Nhiều phương thức thanh toán" />
            <FeatureCard icon="headset" title="Hỗ trợ 24/7" description="Đội ngũ hỗ trợ luôn sẵn sàng" />
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Bắt đầu hành trình của bạn</Text>
          <Text style={styles.ctaDescription}>
            Xem danh sách homestay ngay — đăng nhập khi bạn muốn đặt phòng hoặc lưu yêu thích
          </Text>

          <TouchableOpacity style={styles.loginButton} activeOpacity={0.85} onPress={handleExplorePress}>
            <LinearGradient
              colors={["#2563eb", "#0891b2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              <MaterialCommunityIcons name="home-search" size={20} color="#fff" />
              <Text style={styles.loginButtonText}>Khám phá homestay</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={handleLoginPress}>
            <Text style={styles.secondaryButtonText}>Đăng nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.registerRow} activeOpacity={0.7} onPress={handleRegisterPress}>
            <Text style={styles.registerText}>Chưa có tài khoản? </Text>
            <Text style={styles.registerLink}>Đăng ký</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutButton} activeOpacity={0.7} onPress={handleAboutPress}>
            <Text style={styles.aboutButtonText}>Tìm hiểu thêm về CHMS</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 CHMS · SP26SE073</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface FeatureCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
  <View style={styles.featureCard}>
    <View style={styles.featureIconWrap}>
      <MaterialCommunityIcons name={icon} size={28} color={colors.primary[500]} />
    </View>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureDesc}>{description}</Text>
  </View>
);

interface StatItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string;
  label: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, value, label }) => (
  <View style={styles.statItem}>
    <MaterialCommunityIcons name={icon} size={20} color={colors.cyan[500]} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 32 },

  // Hero
  heroSection: { paddingTop: 20, paddingBottom: 0, paddingHorizontal: 20 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28 },
  logoIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  logoText: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  heroContent: { marginBottom: 24 },
  heroTitle: { fontSize: 32, fontWeight: "800", color: "#fff", lineHeight: 38 },
  heroTitleAccent: { fontSize: 32, fontWeight: "800", color: "#bfdbfe", lineHeight: 38, marginBottom: 12 },
  heroSubtitle: { fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 22 },
  heroImageContainer: {
    width: "100%", height: 200, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    overflow: "hidden", position: "relative",
  },
  heroImage: { width: "100%", height: "100%" },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  floatingCard: {
    position: "absolute", bottom: 12, left: 12,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  floatingCardText: { fontSize: 13, fontWeight: "600", color: "#1e293b" },

  // Stats
  statsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: -1,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    paddingVertical: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: colors.border },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.text.primary },
  statLabel: { fontSize: 11, color: colors.text.secondary },

  // Features
  featuresSection: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text.primary, marginBottom: 16 },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  featureCard: {
    width: (width - 44) / 2,
    backgroundColor: colors.surface,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  featureIconWrap: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: "center", alignItems: "center", marginBottom: 10,
  },
  featureTitle: { fontSize: 13, fontWeight: "700", color: colors.text.primary, marginBottom: 4 },
  featureDesc: { fontSize: 11, color: colors.text.secondary, lineHeight: 16 },

  // CTA
  ctaSection: { paddingHorizontal: 16, paddingTop: 28 },
  ctaTitle: { fontSize: 22, fontWeight: "700", color: colors.text.primary, marginBottom: 8 },
  ctaDescription: { fontSize: 14, color: colors.text.secondary, lineHeight: 20, marginBottom: 20 },
  loginButton: { borderRadius: 14, overflow: "hidden", marginBottom: 12 },
  loginButtonGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16,
  },
  loginButtonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  secondaryButton: {
    paddingVertical: 14, borderRadius: 14, alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.primary[300],
    marginBottom: 8,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: "700", color: colors.primary[600] },
  registerRow: { flexDirection: "row", justifyContent: "center", marginBottom: 12 },
  registerText: { fontSize: 14, color: colors.text.secondary },
  registerLink: { fontSize: 14, fontWeight: "700", color: colors.cyan[600] },
  aboutButton: {
    paddingVertical: 14, borderRadius: 14, alignItems: "center",
    borderWidth: 1.5, borderColor: colors.primary[300],
  },
  aboutButtonText: { fontSize: 15, fontWeight: "600", color: colors.primary[600] },

  // Footer
  footer: { alignItems: "center", paddingTop: 24 },
  footerText: { fontSize: 12, color: colors.text.tertiary },
});
