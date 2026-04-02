import { Button, Input } from "@/components";
import { authService } from "@/service/auth/authService";
import { colors } from "@/utils/colors";
import { logger } from "@/utils/logger";
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
import { SafeAreaView } from "react-native-safe-area-context";

export default function RegisterScreen() {
    const navigation = useNavigation<any>();
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState<"form" | "otp">("form");
    const [email, setEmail] = useState("");

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

    const onRegister = useCallback(
        async (data: RegisterFormData) => {
            try {
                await authService.register({
                    fullName: data.fullName.trim(),
                    email: data.email.trim(),
                    phone: data.phone.trim(),
                    password: data.password,
                });
                setEmail(data.email.trim());
                setStep("otp");
                showToast("Đã đăng ký — kiểm tra email để lấy mã OTP", "success");
            } catch (e: any) {
                logger.error("Register failed", e);
                showToast(e?.message || "Không thể đăng ký", "error");
            }
        },
        []
    );

    const onVerifyOtp = useCallback(
        async (data: { otp: string }) => {
            try {
                await authService.verifyOtp(email, data.otp);
                // Sau khi verify OTP thành công, tự động đăng nhập
                // note: Cần implement đầy đủ flow này với email/password
                showToast("Xác minh email thành công!", "success");
                // Navigate to Login
                navigation.goBack();
            } catch (e: any) {
                logger.error("OTP verification failed", e);
                showToast(e?.message || "Mã OTP không đúng", "error");
            }
        },
        [email, navigation]
    );

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

    if (step === "otp") {
        return (
            <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => setStep("form")}
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
                                <MaterialCommunityIcons name="email-check-outline" size={36} color="#fff" />
                            </LinearGradient>
                            <Text style={styles.title}>Xác minh Email</Text>
                            <Text style={styles.subtitle}>Nhập mã OTP được gửi đến {email}</Text>
                        </View>

                        <View style={styles.formCard}>
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

                            <Button
                                title={otpSubmitting ? "Xác minh..." : "Xác minh OTP"}
                                onPress={handleOtpSubmit(onVerifyOtp)}
                                loading={otpSubmitting}
                                disabled={otpSubmitting}
                                size="large"
                                style={styles.button}
                            />

                            <View style={styles.resendContainer}>
                                <Text style={styles.resendText}>Không nhận được mã?</Text>
                                <TouchableOpacity onPress={() => setStep("form")}>
                                    <Text style={styles.resendLink}>Gửi lại</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

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
                            <MaterialCommunityIcons name="account-plus" size={36} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.title}>Đăng ký</Text>
                        <Text style={styles.subtitle}>Tạo tài khoản mới để bắt đầu</Text>
                    </View>

                    <View style={styles.formCard}>
                        <Controller
                            control={control}
                            name="fullName"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    label="Họ tên"
                                    placeholder="Nhập họ tên"
                                    value={value}
                                    onChangeText={onChange}
                                    error={errors.fullName?.message}
                                    icon="account-outline"
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    label="Email"
                                    placeholder="Nhập email"
                                    value={value}
                                    onChangeText={onChange}
                                    error={errors.email?.message}
                                    keyboardType="email-address"
                                    icon="email-outline"
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="phone"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    label="Số điện thoại"
                                    placeholder="Nhập số điện thoại"
                                    value={value}
                                    onChangeText={onChange}
                                    error={errors.phone?.message}
                                    keyboardType="numeric"
                                    icon="phone-outline"
                                />
                            )}
                        />

                        <View style={styles.passwordWrapper}>
                            <Controller
                                control={control}
                                name="password"
                                render={({ field: { value, onChange } }) => (
                                    <Input
                                        label="Mật khẩu"
                                        placeholder="Tối thiểu 8 ký tự"
                                        value={value}
                                        onChangeText={onChange}
                                        error={errors.password?.message}
                                        secureTextEntry={!showPassword}
                                        icon="lock-outline"
                                    />
                                )}
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

                        <Button
                            title={isSubmitting ? "Đang đăng ký..." : "Tiếp tục"}
                            onPress={handleSubmit(onRegister)}
                            loading={isSubmitting}
                            disabled={isSubmitting}
                            size="large"
                            style={styles.button}
                        />
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Đã có tài khoản?{" "}
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
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 16 },
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
    resendContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, marginTop: 16 },
    resendText: { fontSize: 14, color: colors.text.secondary },
    resendLink: { fontSize: 14, color: colors.primary[500], fontWeight: "600" },
    footer: { alignItems: "center", marginTop: 20, marginBottom: 20 },
    footerText: { fontSize: 14, color: colors.text.secondary },
    footerLink: { color: colors.primary[500], fontWeight: "600" },
});
