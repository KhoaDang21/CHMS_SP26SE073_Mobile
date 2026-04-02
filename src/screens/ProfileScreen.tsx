import {
  AlertDialog,
  Button,
  Divider,
  Header,
  Input,
  LoadingIndicator,
} from "@/components";
import { authService } from "@/service/auth/authService";
import {
  profileService,
  type UserProfile,
} from "@/service/profile/profileService";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { ProfileFormData, ProfileSchema } from "@/utils/validators";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen({ onLogout }: { onLogout?: () => void }) {
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profileService.getProfile();
        if (data) {
          setProfile(data);
          reset({
            name: data.fullName,
            phone: data.phone,
          });
        }
      } catch (error) {
        showToast("Không thể tải hồ sơ", "error");
        logger.error("Failed to load profile", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [reset]);

  const onSaveProfile = useCallback(
    async (data: ProfileFormData) => {
      try {
        await profileService.updateProfile({
          fullName: data.name,
          phoneNumber: data.phone,
        });
        showToast("Cập nhật hồ sơ thành công", "success");
      } catch {
        showToast(
          "Không thể cập nhật hồ sơ",
          "error"
        );
      }
    },
    []
  );

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
      showToast("Đã đăng xuất", "success");
      setLogoutDialogVisible(false);
      if (onLogout) {
        onLogout();
      } else {
        navigation.replace("AuthStack");
      }
    } catch {
      showToast("Không thể đăng xuất", "error");
    }
  }, [navigation, onLogout]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Hồ Sơ" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Hồ Sơ" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons
              name="account-circle"
              size={64}
              color="#0891b2"
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.fullName || "Người dùng"}</Text>
            <Text style={styles.userEmail}>{profile?.email}</Text>
            <View style={styles.roleTag}>
              <MaterialCommunityIcons name="account" size={12} color="#0891b2" />
              <Text style={styles.roleText}>Khách hàng</Text>
            </View>
          </View>
        </View>

        <Divider />

        {/* Profile Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Thông Tin Cá Nhân</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Họ Tên"
                placeholder="Nhập họ tên"
                value={value}
                onChangeText={onChange}
                error={errors.name?.message}
                icon="account-outline"
              />
            )}
          />

          <View style={styles.emailField}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.emailInput}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color="#64748b"
              />
              <Text style={styles.emailText}>{profile?.email}</Text>
            </View>
            <Text style={styles.emailHint}>Email không thể thay đổi</Text>
          </View>

          <Controller
            control={control}
            name="phone"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Số Điện Thoại"
                placeholder="Nhập số điện thoại"
                value={value}
                onChangeText={onChange}
                error={errors.phone?.message}
                keyboardType="phone-pad"
                icon="phone-outline"
              />
            )}
          />

          <Button
            title={isSubmitting ? "Đang cập nhật..." : "Lưu Thay Đổi"}
            onPress={handleSubmit(onSaveProfile)}
            loading={isSubmitting}
            disabled={isSubmitting}
            size="large"
            style={styles.saveButton}
          />
        </View>

        <Divider />

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Button
            title="Đăng Xuất"
            onPress={() => setLogoutDialogVisible(true)}
            variant="danger"
            size="large"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 CHMS. Phiên bản 1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation Dialog */}
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
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 8,
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0891b2",
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  emailField: {
    marginBottom: 12,
  },
  emailInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  emailText: {
    fontSize: 16,
    color: "#1e293b",
    flex: 1,
  },
  emailHint: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  saveButton: {
    marginTop: 8,
  },
  dangerSection: {
    marginBottom: 20,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7f1d1d",
    marginBottom: 12,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  footerText: {
    fontSize: 12,
    color: "#94a3b8",
  },
});
