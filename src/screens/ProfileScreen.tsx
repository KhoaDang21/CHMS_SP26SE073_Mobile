import { AlertDialog, Button, Divider, Header, Input, LoadingIndicator } from "@/components";
import { authService } from "@/service/auth/authService";
import { profileService, type UserProfile } from "@/service/profile/profileService";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { ProfileFormData, ProfileSchema } from "@/utils/validators";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
      .regex(/[a-z]/, "Phải có ít nhất 1 chữ thường")
      .regex(/[A-Z]/, "Phải có ít nhất 1 chữ hoa")
      .regex(/\d/, "Phải có ít nhất 1 số"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type ChangePasswordFormData = z.infer<typeof ChangePasswordSchema>;

const QUICK_ACTIONS = [
  { icon: "bell-outline" as const, label: "Thông báo", screen: "Notifications", color: "#f59e0b" },
  { icon: "star-outline" as const, label: "Đánh giá của tôi", screen: "Reviews", color: "#8b5cf6" },
  { icon: "headset" as const, label: "Hỗ trợ", screen: "Support", color: "#10b981" },
  { icon: "tune" as const, label: "Cài đặt thông báo", screen: "NotificationPreferences", color: "#0891b2" },
];

export default function ProfileScreen({ onLogout }: { onLogout?: () => void }) {
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { name: "", phone: "" },
  });

  const { control: pwControl, handleSubmit: pwHandleSubmit, formState: { errors: pwErrors, isSubmitting: pwSubmitting }, reset: pwReset } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profileService.getProfile();
        if (data) {
          setProfile(data);
          reset({ name: data.fullName, phone: data.phone });
        }
      } catch (error) {
        showToast("Không thể tải hồ sơ", "error");

      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [reset]);

  const onSaveProfile = useCallback(async (data: ProfileFormData) => {
    try {
      await profileService.updateProfile({ fullName: data.name, phoneNumber: data.phone });
      showToast("Cập nhật hồ sơ thành công", "success");
    } catch {
      showToast("Không thể cập nhật hồ sơ", "error");
    }
  }, []);

  const onChangePassword = useCallback(async (data: ChangePasswordFormData) => {
    try {
      await profileService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      showToast("Đổi mật khẩu thành công", "success");
      pwReset();
      setShowChangePassword(false);
    } catch {
      showToast("Không thể đổi mật khẩu. Kiểm tra lại mật khẩu hiện tại.", "error");
    }
  }, [pwReset]);

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
      showToast("Đã đăng xuất", "success");
      setLogoutDialogVisible(false);
      if (onLogout) onLogout();
      else navigation.replace("AuthStack");
    } catch {
      showToast("Không thể đăng xuất", "error");
    }
  }, [navigation, onLogout]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Header title="Hồ Sơ" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Header title="Cài đặt" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Avatar with gradient */}
        <LinearGradient colors={["#1d4ed8", "#0891b2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={44} color="#1d4ed8" />
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.fullName || "Người dùng"}</Text>
            <Text style={styles.userEmail}>{profile?.email}</Text>
            <View style={styles.roleTag}>
              <MaterialCommunityIcons name="shield-check-outline" size={12} color="#fff" />
              <Text style={styles.roleText}>Khách hàng</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tiện ích</Text>
          {QUICK_ACTIONS.map((item, idx) => (
            <View key={item.screen}>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.7}>
                <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}18` }]}>
                  <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
              {idx < QUICK_ACTIONS.length - 1 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </View>

        {/* Profile form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông Tin Cá Nhân</Text>
          <Controller control={control} name="name" render={({ field: { value, onChange } }) => (
            <Input label="Họ Tên" placeholder="Nhập họ tên" value={value} onChangeText={onChange} error={errors.name?.message} icon="account-outline" />
          )} />
          <View style={styles.emailField}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.emailInput}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#64748b" />
              <Text style={styles.emailText}>{profile?.email}</Text>
            </View>
            <Text style={styles.emailHint}>Email không thể thay đổi</Text>
          </View>
          <Controller control={control} name="phone" render={({ field: { value, onChange } }) => (
            <Input label="Số Điện Thoại" placeholder="Nhập số điện thoại" value={value} onChangeText={onChange} error={errors.phone?.message} keyboardType="phone-pad" icon="phone-outline" />
          )} />
          <Button title={isSubmitting ? "Đang cập nhật..." : "Lưu Thay Đổi"} onPress={handleSubmit(onSaveProfile)} loading={isSubmitting} disabled={isSubmitting} size="large" style={styles.saveButton} />
        </View>

        {/* Change password */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowChangePassword((v) => !v)} activeOpacity={0.7}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#0891b2" />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Đổi mật khẩu</Text>
            </View>
            <MaterialCommunityIcons name={showChangePassword ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
          </TouchableOpacity>
          {showChangePassword && (
            <View style={styles.passwordForm}>
              <Controller control={pwControl} name="currentPassword" render={({ field: { value, onChange } }) => (
                <Input label="Mật khẩu hiện tại" placeholder="Nhập mật khẩu hiện tại" value={value} onChangeText={onChange} error={pwErrors.currentPassword?.message} secureTextEntry icon="lock-outline" />
              )} />
              <Controller control={pwControl} name="newPassword" render={({ field: { value, onChange } }) => (
                <Input label="Mật khẩu mới" placeholder="Nhập mật khẩu mới" value={value} onChangeText={onChange} error={pwErrors.newPassword?.message} secureTextEntry icon="lock-reset" />
              )} />
              <Controller control={pwControl} name="confirmPassword" render={({ field: { value, onChange } }) => (
                <Input label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu mới" value={value} onChangeText={onChange} error={pwErrors.confirmPassword?.message} secureTextEntry icon="lock-check-outline" />
              )} />
              <Button title={pwSubmitting ? "Đang đổi..." : "Xác nhận đổi mật khẩu"} onPress={pwHandleSubmit(onChangePassword)} loading={pwSubmitting} disabled={pwSubmitting} size="large" style={styles.saveButton} />
            </View>
          )}
        </View>

        {/* Logout */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.dangerTitle}>Tài khoản</Text>
          <Button title="Đăng Xuất" onPress={() => setLogoutDialogVisible(true)} variant="danger" size="large" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 CHMS. Phiên bản 1.0.0</Text>
        </View>
      </ScrollView>

      <AlertDialog
        visible={logoutDialogVisible}
        title="Xác Nhận Đăng Xuất"
        message="Bạn chắc chắn muốn đăng xuất khỏi ứng dụng không?"
        confirmText="Đăng Xuất"
        cancelText="Hủy"
        confirmButtonColor="danger"
        onConfirm={handleLogout}
        onCancel={() => setLogoutDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
  avatarSection: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20, paddingVertical: 24, borderRadius: 16 },
  avatarWrapper: { padding: 3, borderRadius: 44, backgroundColor: "rgba(255,255,255,0.3)" },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 4 },
  userEmail: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 8 },
  roleTag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
  roleText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  card: { backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 },
  dangerCard: { borderWidth: 1, borderColor: "#fee2e2" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  menuIconWrap: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuLabel: { flex: 1, fontSize: 15, color: "#1e293b", fontWeight: "500" },
  menuDivider: { height: 1, backgroundColor: "#f1f5f9", marginLeft: 50 },
  label: { fontSize: 14, fontWeight: "600", color: "#1e293b", marginBottom: 8 },
  emailField: { marginBottom: 12 },
  emailInput: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  emailText: { fontSize: 15, color: "#64748b", flex: 1 },
  emailHint: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  saveButton: { marginTop: 8 },
  passwordForm: { marginTop: 14 },
  dangerTitle: { fontSize: 14, fontWeight: "700", color: "#7f1d1d", marginBottom: 12 },
  footer: { alignItems: "center", paddingVertical: 12 },
  footerText: { fontSize: 12, color: "#94a3b8" },
});
