import { useCallback } from "react";
import { SafeAreaView, StyleSheet, View, ScrollView, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authService } from "@/service/auth/authService";
import {
  Button,
  Input,
  LoadingIndicator,
} from "@/components";
import { LoginSchema, LoginFormData } from "@/utils/validators";
import { showToast } from "@/utils/toast";
import { logger } from "@/utils/logger";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onLogin = useCallback(
    async (data: LoginFormData) => {
      try {
        const user = await authService.login(data.email.trim(), data.password);
        if (user.role !== "customer") {
          await authService.logout();
          showToast("Mobile chỉ hỗ trợ role Customer", "warning");
          return;
        }
        showToast("Đăng nhập thành công", "success");
        navigation.replace("MainTabs");
      } catch (e: any) {
        logger.error("Login failed", e);
        showToast(e?.message || "Đăng nhập thất bại", "error");
      }
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="waves"
              size={48}
              color="#0891b2"
            />
          </View>
          <Text style={styles.title}>CHMS Mobile</Text>
          <Text style={styles.subtitle}>
            Khám phá những căn nhà tuyệt vời
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChangeText } }) => (
              <Input
                label="Email"
                placeholder="Nhập email của bạn"
                value={value}
                onChangeText={onChangeText}
                error={errors.email?.message}
                keyboardType="email-address"
                icon="email-outline"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChangeText } }) => (
              <Input
                label="Mật khẩu"
                placeholder="Nhập mật khẩu"
                value={value}
                onChangeText={onChangeText}
                error={errors.password?.message}
                secureTextEntry
                icon="lock-outline"
              />
            )}
          />

          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="information"
              size={16}
              color="#1e40af"
            />
            <Text style={styles.infoText}>
              Phiên bản di động hỗ trợ tài khoản khách hàng
            </Text>
          </View>

          <Button
            title={isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            onPress={handleSubmit(onLogin)}
            loading={isSubmitting}
            disabled={isSubmitting}
            size="large"
            style={styles.loginButton}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 CHMS. Tất cả quyền được bảo vệ.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  formContainer: {
    marginBottom: 32,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#dbeafe",
    borderLeftWidth: 4,
    borderLeftColor: "#0284c7",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#1e40af",
    fontWeight: "500",
  },
  loginButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  footerText: {
    fontSize: 12,
    color: "#94a3b8",
  },
});
