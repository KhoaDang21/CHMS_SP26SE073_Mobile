import { Button, Input } from "@/components";
import { authService } from "@/service/auth/authService";
import { colors } from "@/utils/colors";
import { showToast } from "@/utils/toast";
import { RegisterFormData, RegisterSchema } from "@/utils/validators";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function RegisterScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState<"form" | "otp">("form");
    const [email, setEmail] = useState("");
    const [resending, setResending] = useState(false);
    const [registeredData, setRegisteredData] = useState<RegisterFormData | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        watch,
    } = useForm<RegisterFormData>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: { fullName: "", email: "", phone: "", password: "" },
    });

    const password = watch("password");

    const {
        control: otpControl,
        handleSubmit: handleOtpSubmit,
        formState: { isSubmitting: otpSubmitting },
    } = useForm<{ otp: string }>({
        defaultValues: { otp: "" },
    });

    const onRegister = useCallback(async (data: RegisterFormData) => {
        try {
            const response = await authService.register({
                fullName: data.fullName.trim(),
                email: data.email.trim(),
                phone: data.phone.trim(),
                password: data.password,
            });

            setEmail(data.email.trim());
            setRegisteredData(data);
            setStep("otp");
            showToast("Đã đăng ký — kiểm tra email để lấy mã OTP", "success");
        } catch (e: any) {
            const msg = e?.message || "";
            if (msg.includes("Email đã tồn tại") || msg.toLowerCase().includes("email")) {
                showToast("Email này đã được đăng ký. Vui lòng dùng email khác.", "error");
            } else if (msg.includes("Số điện thoại") || msg.toLowerCase().includes("phone")) {
                showToast(msg || "Số điện thoại không hợp lệ.", "error");
            } else if (msg.includes("HTTP 500") || !msg) {
                showToast("Đăng ký thất bại. Email hoặc số điện thoại có thể đã tồn tại.", "error");
            } else {
                showToast(msg, "error");
            }
        }
    }, []);

    const handleResendOtp = useCallback(async () => {
        if (!registeredData || resending) return;
        try {
            setResending(true);
            await authService.register({
                fullName: registeredData.fullName.trim(),
                email: registeredData.email.trim(),
                phone: registeredData.phone.trim(),
                password: registeredData.password,
            });
            showToast("Đã gửi lại mã OTP — kiểm tra hộp thư (kể cả Spam)", "success");
        } catch (e: any) {
            // Email đã tồn tại trong cache nghĩa là OTP cũ vẫn còn hiệu lực
            // hoặc đã hết hạn — thông báo user thử lại sau
            const msg = e?.message || "";
            if (msg.includes("đã tồn tại") || msg.includes("HTTP 500")) {
                showToast("Không thể gửi lại. Vui lòng đợi 5 phút rồi thử lại từ đầu.", "warning");
            } else {
                showToast(msg || "Không thể gửi lại OTP", "error");
            }
        } finally {
            setResending(false);
        }
    }, [registeredData, resending]);

    const onVerifyOtp = useCallback(async (data: { otp: string }) => {
        try {
            await authService.verifyOtp(email, data.otp);
            showToast("Xác minh email thành công! Vui lòng đăng nhập", "success");
            navigation.navigate("Login");
        } catch (e: any) {
            showToast(e?.message || "Mã OTP không đúng", "error");
        }
    }, [email, navigation]);

    const getPasswordStrength = (pass: string) => {
        if (!pass) return 0;
        let strength = 0;
        if (pass.length >= 6) strength += 1;
        if (pass.length >= 10) strength += 1;
        if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength += 1;
        if (/\d/.test(pass)) strength += 1;
        return strength;
    };

    const strength = getPasswordStrength(password);
    const strengthColor =
        strength <= 1 ? "#ef4444" : strength <= 2 ? "#f97316" : strength <= 3 ? "#eab308" : "#22c55e";

    // OTP Step
    if (step === "otp") {
        return (
            <SafeAreaView style={styles.container} edges={["bottom"]}>
                <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <LinearGradient
                            colors={["#0369a1", "#06b6d4"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.heroGradient, { paddingTop: insets.top + 12 }]}
                        >
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep("form")} activeOpacity={0.7}>
                                <View style={styles.backButtonInner}>
                                    <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            <View style={styles.heroContent}>
                                <View style={styles.iconContainer}>
                                    <MaterialCommunityIcons name="email-check-outline" size={36} color="#fff" />
                                </View>
                                <Text style={styles.title}>Xác Minh Email</Text>
                                <Text style={styles.subtitle}>Mã OTP đã gửi đến {email}</Text>
                            </View>
                        </LinearGradient>

                        <View style={styles.formCard}>
                            {/* Email target */}
                            <View style={styles.emailTarget}>
                                <MaterialCommunityIcons name="email-fast-outline" size={20} color="#0369a1" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.emailTargetLabel}>Mã đã gửi đến</Text>
                                    <Text style={styles.emailTargetValue} numberOfLines={1}>{email}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setStep("form")} activeOpacity={0.7}>
                                    <Text style={styles.changeEmailText}>Đổi</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.fieldGroup}>
                                <Controller
                                    control={otpControl}
                                    name="otp"
                                    render={({ field: { value, onChange } }) => (
                                        <Input
                                            label="Mã OTP (6 chữ số)"
                                            placeholder="000000"
                                            value={value}
                                            onChangeText={(text) => onChange(text.replace(/[^0-9]/g, "").slice(0, 6))}
                                            keyboardType="numeric"
                                            icon="numeric"
                                        />
                                    )}
                                />
                            </View>

                            <Button
                                title={otpSubmitting ? "Đang xác minh..." : "Xác Minh OTP"}
                                onPress={handleOtpSubmit(onVerifyOtp)}
                                loading={otpSubmitting}
                                disabled={otpSubmitting}
                                size="large"
                                style={styles.button}
                                gradient
                            />

                            <View style={styles.resendContainer}>
                                <Text style={styles.resendText}>Không nhận được mã? </Text>
                                <TouchableOpacity
                                    onPress={handleResendOtp}
                                    disabled={resending}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.resendLink, resending && { opacity: 0.5 }]}>
                                        {resending ? "Đang gửi..." : "Gửi lại"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // Register Form Step
    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <LinearGradient
                        colors={["#0369a1", "#06b6d4"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.heroGradient, { paddingTop: insets.top + 12 }]}
                    >
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                            <View style={styles.backButtonInner}>
                                <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <View style={styles.heroContent}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="account-plus" size={36} color="#fff" />
                            </View>
                            <Text style={styles.title}>Đăng Ký</Text>
                            <Text style={styles.subtitle}>Tạo tài khoản mới để bắt đầu</Text>
                        </View>
                    </LinearGradient>

                    <View style={styles.formCard}>
                        <View style={styles.fieldGroup}>
                            <Controller
                                control={control}
                                name="fullName"
                                render={({ field: { value, onChange } }) => (
                                    <Input
                                        label="Họ & Tên"
                                        placeholder="Nhập họ và tên"
                                        value={value}
                                        onChangeText={onChange}
                                        error={errors.fullName?.message}
                                        icon="account-outline"
                                    />
                                )}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { value, onChange } }) => (
                                    <Input
                                        label="Email"
                                        placeholder="your@email.com"
                                        value={value}
                                        onChangeText={onChange}
                                        error={errors.email?.message}
                                        keyboardType="email-address"
                                        icon="email-outline"
                                    />
                                )}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Controller
                                control={control}
                                name="phone"
                                render={({ field: { value, onChange } }) => (
                                    <Input
                                        label="Số Điện Thoại"
                                        placeholder="0123456789"
                                        value={value}
                                        onChangeText={onChange}
                                        error={errors.phone?.message}
                                        keyboardType="numeric"
                                        icon="phone-outline"
                                    />
                                )}
                            />
                        </View>

                        <View style={styles.passwordWrapper}>
                            <View style={styles.fieldGroup}>
                                <Controller
                                    control={control}
                                    name="password"
                                    render={({ field: { value, onChange } }) => (
                                        <Input
                                            label="Mật Khẩu"
                                            placeholder="Tối thiểu 6 ký tự"
                                            value={value}
                                            onChangeText={onChange}
                                            error={errors.password?.message}
                                            secureTextEntry={!showPassword}
                                            icon="lock-outline"
                                        />
                                    )}
                                />
                            </View>
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

                        {password ? (
                            <View style={styles.strengthContainer}>
                                <View style={styles.strengthBar}>
                                    <View style={[styles.strengthFill, { width: `${(strength / 4) * 100}%`, backgroundColor: strengthColor }]} />
                                </View>
                                <Text style={[styles.strengthText, { color: strengthColor }]}>
                                    {{ 0: "Rất yếu", 1: "Yếu", 2: "Trung bình", 3: "Mạnh", 4: "Rất mạnh" }[strength] || "Rất yếu"}
                                </Text>
                            </View>
                        ) : null}

                        <Button
                            title={isSubmitting ? "Đang đăng ký..." : "Tiếp Tục"}
                            onPress={handleSubmit(onRegister)}
                            loading={isSubmitting}
                            disabled={isSubmitting}
                            size="large"
                            style={styles.button}
                            gradient
                        />
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Đã có tài khoản? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Login")} activeOpacity={0.7}>
                            <Text style={styles.footerLink}>Đăng nhập ngay</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.termsContainer}>
                        <Text style={styles.termsText}>
                            Bằng việc đăng ký, bạn đồng ý với Điều khoản dịch vụ và Chính sách riêng tư
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: "#f8fafc" },
    scrollContent: { flexGrow: 1 },

    // Hero Gradient
    heroGradient: {
        paddingHorizontal: 20,
        paddingBottom: 28,
    },
    backButton: {
        marginBottom: 16,
        alignSelf: "flex-start",
    },
    backButtonInner: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    heroContent: {
        alignItems: "center",
        paddingBottom: 4,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.25)",
    },
    title: {
        fontSize: 26,
        fontWeight: "800",
        color: "#fff",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: "rgba(255,255,255,0.85)",
        fontWeight: "500",
    },

    // Form Card
    formCard: {
        backgroundColor: "#fff",
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 20,
        marginTop: -20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    fieldGroup: { marginBottom: 11 },
    passwordWrapper: { position: "relative", marginBottom: 8 },
    eyeButton: { position: "absolute", right: 12, top: 36, padding: 4 },

    // OTP Info
    otpInfo: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: "#cffafe",
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderLeftWidth: 3,
        borderLeftColor: "#0369a1",
    },
    otpInfoText: {
        flex: 1,
        fontSize: 12,
        color: "#0c4a6e",
        fontWeight: "500",
        lineHeight: 18,
    },

    // Password Strength
    strengthContainer: { marginTop: 4, marginBottom: 12 },
    strengthBar: { height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, marginBottom: 5, overflow: "hidden" },
    strengthFill: { height: "100%" as any, borderRadius: 2 },
    strengthText: { fontSize: 11, fontWeight: "600" },

    button: { marginTop: 6 },

    resendContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 14 },
    resendText: { fontSize: 12, color: "#64748b" },
    resendLink: { fontSize: 12, color: "#0369a1", fontWeight: "600" },

    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
    },
    footerText: { fontSize: 12, color: "#64748b" },
    footerLink: { fontSize: 12, color: "#0369a1", fontWeight: "600" },

    termsContainer: { paddingHorizontal: 16, paddingBottom: 20, alignItems: "center" },
    termsText: { fontSize: 10, color: "#94a3b8", lineHeight: 14, textAlign: "center" },

    // OTP email target
    emailTarget: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#e0f2fe",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#bae6fd",
    },
    emailTargetLabel: { fontSize: 11, color: "#0369a1", fontWeight: "600", marginBottom: 2 },
    emailTargetValue: { fontSize: 13, color: "#0c4a6e", fontWeight: "700" },
    changeEmailText: { fontSize: 12, color: "#0369a1", fontWeight: "700" },

    // Spam hint
    spamHint: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: "#fffbeb",
        borderRadius: 10,
        padding: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#fde68a",
    },
    spamHintText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 18 },
});
