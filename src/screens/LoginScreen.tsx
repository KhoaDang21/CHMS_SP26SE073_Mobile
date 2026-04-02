import { Button, Input } from "@/components";
import { authService } from "@/service/auth/authService";
import { colors } from "@/utils/colors";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { LoginFormData, LoginSchema } from "@/utils/validators";
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

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess?: () => void }) {
  const navigation = useNavigation<any>();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onLogin = useCallback(
    async (data: LoginFormData) => {
      try {
        const user = await authService.login(data.email.trim(), data.password);
        if (user.role !== "customer") {
          await authService.logout();
          showToast("Mobile chi ho tro tai khoan Khach hang", "warning");
          return;
        }
        showToast("Dang nhap thanh cong!", "success");
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } catch (e: any) {
        logger.error("Login failed", e);
        showToast(e?.message || "Email hoac mat khau khong dung", "error");
      }
    },
    [onLoginSuccess]
  );

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
              <MaterialCommunityIcons name="waves" size={36} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Dang nhap</Text>
            <Text style={styles.subtitle}>Chao mung ban tro lai CHMS</Text>
          </View>

          <View style={styles.formCard}>
            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Email"
                  placeholder="Nhap email cua ban"
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  icon="email-outline"
                />
              )}
            />

            <View style={styles.passwordWrapper}>
              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Mat khau"
                    placeholder="Nhap mat khau"
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

            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information-outline" size={16} color="#0891b2" />
              <Text style={styles.infoText}>Ung dung danh cho tai khoan Khach hang</Text>
            </View>

            <Button
              title={isSubmitting ? "Dang dang nhap..." : "Dang nhap"}
              onPress={handleSubmit(onLogin)}
              loading={isSubmitting}
              disabled={isSubmitting}
              size="large"
              style={styles.loginButton}
            />

            {/* Social Login Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoac</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => {
                showToast("Google Login se duoc active sau", "info");
                // Implement Google login with expo-auth-session
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="google" size={20} color="#db4437" />
              <Text style={styles.googleButtonText}>Dang nhap voi Google</Text>
            </TouchableOpacity>

            {/* Footer Links */}
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => navigation.navigate("Register")} activeOpacity={0.7}>
                <Text style={styles.footerLink}>Tao tai khoan</Text>
              </TouchableOpacity>
              <Text style={styles.footerDivider}>•</Text>
              <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} activeOpacity={0.7}>
                <Text style={styles.footerLink}>Quen mat khau?</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>2026 CHMS SP26SE073</Text>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
    marginBottom: 8,
  },
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
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 24,
  },
  passwordWrapper: { position: "relative" },
  eyeButton: { position: "absolute", right: 12, top: 38, padding: 4 },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e0f2fe",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#0891b2",
  },
  infoText: { flex: 1, fontSize: 12, color: "#0e7490", fontWeight: "500" },
  loginButton: { marginTop: 4 },
  dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: colors.text.secondary, fontWeight: "500" },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  googleButtonText: { fontSize: 14, fontWeight: "600", color: colors.text.primary },
  footerLinks: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 },
  footerLink: { fontSize: 12, color: colors.primary[500], fontWeight: "600" },
  footerDivider: { fontSize: 12, color: colors.text.secondary },
  footer: { alignItems: "center", paddingTop: 8 },
  footerText: { fontSize: 12, color: colors.text.tertiary },
});
