import { Button, Input } from "@/components";
import { authService } from "@/service/auth/authService";
import { colors } from "@/utils/colors";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
    const navigation = useNavigation<any>();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSendOtp = useCallback(async () => {
        if (!email.trim()) {
            showToast("Vui lòng nhập email", "warning");
            return;
        }

        try {
            setLoading(true);
            await authService.forgotPassword(email.trim());
            showToast("Đã gửi mã OTP đến email của bạn", "success");
            // Navigate to reset password screen
            navigation.navigate("ResetPassword", { email: email.trim() });
        } catch (e: any) {

            showToast(e?.message || "Không thể gửi OTP", "error");
        } finally {
            setLoading(false);
        }
    }, [email, navigation]);

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <LinearGradient
                            colors={["#2563eb", "#0891b2"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconContainer}
                        >
                            <MaterialCommunityIcons name="lock-reset" size={36} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.title}>Quên Mật Khẩu</Text>
                        <Text style={styles.subtitle}>Nhập email để nhận mã đặt lại mật khẩu</Text>
                    </View>

                    <View style={styles.formCard}>
                        <Input
                            label="Email"
                            placeholder="Nhập email của bạn"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            icon="email-outline"
                            editable={!loading}
                        />

                        <View style={styles.infoBox}>
                            <MaterialCommunityIcons name="information-outline" size={16} color="#0891b2" />
                            <Text style={styles.infoText}>
                                Chúng tôi sẽ gửi mã xác minh đến email của bạn
                            </Text>
                        </View>

                        <Button
                            title={loading ? "Đang gửi..." : "Gửi Mã OTP"}
                            onPress={handleSendOtp}
                            loading={loading}
                            disabled={loading || !email.trim()}
                            size="large"
                            style={styles.button}
                        />
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Còn nhớ mật khẩu?{" "}
                            <Text
                                style={styles.footerLink}
                                onPress={() => navigation.goBack()}
                            >
                                Đăng nhập
                            </Text>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: "#f0f7ff" },
    scrollContent: { flexGrow: 1, paddingHorizontal: 0, paddingVertical: 0 },
    backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start", marginBottom: 8 },
    header: { alignItems: "center", marginBottom: 28 },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    title: { fontSize: 26, fontWeight: "800", color: colors.text.primary, marginBottom: 6 },
    subtitle: { fontSize: 14, color: colors.text.secondary },
    formCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 24 },
    infoBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#e0f2fe",
        borderRadius: 10,
        padding: 12,
        marginVertical: 16,
    },
    infoText: { fontSize: 12, color: "#0891b2", flex: 1, fontWeight: "500" },
    button: { marginTop: 8 },
    footer: { alignItems: "center", marginTop: 20 },
    footerText: { fontSize: 14, color: colors.text.secondary },
    footerLink: { color: colors.primary[500], fontWeight: "600" },
});
