import { Button, Input } from "@/components";
import { authService } from "@/service/auth/authService";
import { colors } from "@/utils/colors";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPasswordScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const email = route.params?.email as string;

    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const getPasswordStrength = (pass: string) => {
        if (!pass) return 0;
        let strength = 0;
        if (pass.length >= 8) strength += 1;
        if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength += 1;
        if (/\d/.test(pass)) strength += 1;
        if (/[!@#$%^&*]/.test(pass)) strength += 1;
        return strength;
    };

    const strength = getPasswordStrength(password);
    const strengthColor =
        strength <= 1 ? "#ef4444" : strength <= 2 ? "#f97316" : strength <= 3 ? "#eab308" : "#22c55e";

    const handleResetPassword = useCallback(async () => {
        if (!otp.trim()) {
            showToast("Vui lòng nhập mã OTP", "warning");
            return;
        }
        if (!password) {
            showToast("Vui lòng nhập mật khẩu mới", "warning");
            return;
        }
        if (password !== confirmPassword) {
            showToast("Mật khẩu xác nhận không khớp", "warning");
            return;
        }

        try {
            setLoading(true);
            await authService.resetPassword({
                email,
                otpCode: otp.trim(),
                newPassword: password,
            });
            showToast("Đặt lại mật khẩu thành công", "success");
            navigation.navigate("Login");
        } catch (e: any) {
            logger.error("Reset password failed", e);
            showToast(e?.message || "Không thể đặt lại mật khẩu", "error");
        } finally {
            setLoading(false);
        }
    }, [email, otp, password, confirmPassword, navigation]);

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
                            <MaterialCommunityIcons name="lock-check" size={36} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.title}>Đặt Lại Mật Khẩu</Text>
                        <Text style={styles.subtitle}>Nhập mã OTP và mật khẩu mới</Text>
                    </View>

                    <View style={styles.formCard}>
                        <Input
                            label="Mã OTP (6 chữ số)"
                            placeholder="000000"
                            value={otp}
                            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, "").slice(0, 6))}
                            keyboardType="numeric"
                            icon="numeric"
                            editable={!loading}
                        />

                        <View style={styles.passwordWrapper}>
                            <Input
                                label="Mật Khẩu Mới"
                                placeholder="Tối thiểu 8 ký tự"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                icon="lock-outline"
                                editable={!loading}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword((v) => !v)}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons
                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color={colors.text.secondary}
                                />
                            </TouchableOpacity>
                        </View>

                        {password && (
                            <View style={styles.strengthContainer}>
                                <View style={styles.strengthBar}>
                                    <View
                                        style={[
                                            styles.strengthFill,
                                            {
                                                width: `${(strength / 4) * 100}%`,
                                                backgroundColor: strengthColor,
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.strengthText, { color: strengthColor }]}>
                                    {{
                                        0: "Rất yếu",
                                        1: "Yếu",
                                        2: "Trung bình",
                                        3: "Mạnh",
                                        4: "Rất mạnh",
                                    }[strength] || "Rất yếu"}
                                </Text>
                            </View>
                        )}

                        <View style={styles.passwordWrapper}>
                            <Input
                                label="Xác Nhận Mật Khẩu"
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                                icon="lock-check-outline"
                                editable={!loading}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowConfirmPassword((v) => !v)}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons
                                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color={colors.text.secondary}
                                />
                            </TouchableOpacity>
                        </View>

                        <Button
                            title={loading ? "Đang đặt lại..." : "Đặt Lại Mật Khẩu"}
                            onPress={handleResetPassword}
                            loading={loading}
                            disabled={loading || !otp || !password || !confirmPassword}
                            size="large"
                            style={styles.button}
                        />
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
    passwordWrapper: { position: "relative" },
    eyeButton: { position: "absolute", right: 12, top: 38, padding: 4 },
    strengthContainer: { marginTop: 12, marginBottom: 16 },
    strengthBar: { height: 4, backgroundColor: "#e5e7eb", borderRadius: 2, marginBottom: 6, overflow: "hidden" },
    strengthFill: { height: "100%", borderRadius: 2 },
    strengthText: { fontSize: 12, fontWeight: "600" },
    button: { marginTop: 8 },
});
