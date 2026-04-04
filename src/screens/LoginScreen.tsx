import { Button, Input } from "@/components";
import { authService } from "@/service/auth/authService";
import { colors } from "@/utils/colors";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { LoginFormData, LoginSchema } from "@/utils/validators";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation } from "@react-navigation/native";
import { useAuthRequest } from "expo-auth-session";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess?: () => void }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [_request, response, promptAsync] = useAuthRequest(
    {
      clientId: "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com",
      scopes: ["profile", "email"],
      redirectUri: "exp://localhost",
    },
    {
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      revocationEndpoint: "https://oauth2.googleapis.com/revoke",
    }
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type === "success") {
        try {
          setGoogleLoading(true);
          const idToken = response.params?.id_token;
          const user = await authService.googleLogin(idToken);
          if (user.role !== "customer") {
            await authService.logout();
            showToast("Mobile chỉ hỗ trợ tài khoản Khách hàng", "warning");
            return;
          }
          showToast(`Chào mừng ${user.name || "bạn"}!`, "success");
          if (onLoginSuccess) onLoginSuccess();
        } catch (error: any) {

          showToast(error?.message || "Đăng nhập Google thất bại. Vui lòng thử lại.", "error");
        } finally {
          setGoogleLoading(false);
        }
      } else if (response?.type === "error") {
        showToast("Đăng nhập Google bị hủy hoặc lỗi xảy ra", "error");
        setGoogleLoading(false);
      }
    };
    if (response) handleGoogleResponse();
  }, [response, onLoginSuccess]);

  const onLogin = useCallback(
    async (data: LoginFormData) => {
      try {
        const user = await authService.login(data.email.trim(), data.password);
        if (user.role !== "customer") {
          await authService.logout();
          showToast("Mobile chỉ hỗ trợ tài khoản Khách hàng", "warning");
          return;
        }
        showToast("Đăng nhập thành công!", "success");
        if (onLoginSuccess) onLoginSuccess();
      } catch (e: any) {

        showToast(e?.message || "Email hoặc mật khẩu không đúng", "error");
      }
    },
    [onLoginSuccess]
  );

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await promptAsync();
    } catch (error) {

      showToast("Đăng nhập Google không khả dụng. Vui lòng thử lại sau.", "error");
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Gradient Header — extends behind status bar */}
          <LinearGradient
            colors={["#0369a1", "#06b6d4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroGradient, { paddingTop: insets.top + 12 }]}
          >
            {/* Back button inside gradient */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <View style={styles.backButtonInner}>
                <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={styles.heroContent}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="waves" size={36} color="#fff" />
              </View>
              <Text style={styles.title}>Đăng Nhập</Text>
              <Text style={styles.subtitle}>Chào mừng bạn trở lại CHMS</Text>
            </View>
          </LinearGradient>

          {/* Form Card — overlaps gradient slightly */}
          <View style={styles.formCard}>
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

            <View style={styles.passwordWrapper}>
              <View style={styles.fieldGroup}>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { value, onChange } }) => (
                    <Input
                      label="Mật Khẩu"
                      placeholder="••••••••"
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

            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information-outline" size={16} color="#0369a1" />
              <Text style={styles.infoText}>Ứng dụng dành cho tài khoản Khách hàng</Text>
            </View>

            <Button
              title={isSubmitting ? "Đang đăng nhập..." : "Đăng Nhập"}
              onPress={handleSubmit(onLogin)}
              loading={isSubmitting}
              disabled={isSubmitting || googleLoading}
              size="large"
              style={styles.loginButton}
              gradient
            />

            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => navigation.navigate("ForgotPassword")}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color="#db4437" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="google" size={20} color="#db4437" />
                  <Text style={styles.googleButtonText}>Đăng nhập với Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.bottomText}>
            <Text style={styles.bottomTextSmall}>Bằng việc đăng nhập, bạn đồng ý với</Text>
            <View style={styles.policyLinks}>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.policyLink}>Điều khoản dịch vụ</Text>
              </TouchableOpacity>
              <Text style={styles.policySeparator}>·</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.policyLink}>Chính sách riêng tư</Text>
              </TouchableOpacity>
            </View>
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
  fieldGroup: { marginBottom: 12 },
  passwordWrapper: { position: "relative", marginBottom: 10 },
  eyeButton: { position: "absolute", right: 12, top: 36, padding: 4 },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#cffafe",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#0369a1",
  },
  infoText: { flex: 1, fontSize: 12, color: "#0c4a6e", fontWeight: "500" },

  loginButton: { marginBottom: 10 },

  forgotPasswordContainer: { alignItems: "center", paddingVertical: 6, marginBottom: 12 },
  forgotPasswordText: { fontSize: 12, fontWeight: "600", color: "#0369a1" },

  dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dividerText: { marginHorizontal: 10, fontSize: 11, color: "#94a3b8", fontWeight: "600" },

  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fee2e2",
    borderRadius: 12,
    paddingVertical: 11,
    gap: 8,
    backgroundColor: "#fff",
  },
  googleButtonDisabled: { opacity: 0.6 },
  googleButtonText: { fontSize: 13, fontWeight: "600", color: colors.text.primary },

  footerContainer: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 16,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  footerButtonTextPrimary: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0891b2",
  },
  footerButtonTextSecondary: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },

  bottomText: { paddingHorizontal: 16, paddingBottom: 16, alignItems: "center" },
  bottomTextSmall: { fontSize: 10, color: "#94a3b8", marginBottom: 4 },
  policyLinks: { flexDirection: "row", alignItems: "center", gap: 5 },
  policyLink: { fontSize: 10, color: "#0369a1", fontWeight: "600" },
  policySeparator: { fontSize: 10, color: "#cbd5e1" },
});
