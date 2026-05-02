import { AlertDialog, Button, EmptyState, Header, Input, LoadingIndicator } from "@/components";
import { authService } from "@/service/auth/authService";
import { notificationService, type Notification, type NotificationPreferences } from "@/service/notification/notificationService";
import { profileService, type UserProfile } from "@/service/profile/profileService";
import { showToast } from "@/utils/toast";
import { ProfileFormData, ProfileSchema } from "@/utils/validators";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "notifications" | "notif-prefs" | "support" | "reviews" | null;

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
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

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={sh.row}>
      <TouchableOpacity style={sh.backBtn} onPress={onBack} activeOpacity={0.7}>
        <MaterialCommunityIcons name="arrow-left" size={20} color="#1e293b" />
      </TouchableOpacity>
      <Text style={sh.title}>{title}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#f1f5f9" },
  title: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
});

// ─── Notifications Section ────────────────────────────────────────────────────

function NotificationsSection({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const [notifs, count] = await Promise.all([
        notificationService.getNotifications(50, 0),
        notificationService.getUnreadCount(),
      ]);
      setItems(notifs);
      setUnreadCount(count);
    } catch {
      showToast("Không thể tải thông báo", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = useCallback(async (id: string) => {
    await notificationService.markAsRead(id);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllAsRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    showToast("Đã đánh dấu tất cả đã đọc", "success");
  }, []);

  const deleteNotif = useCallback(async (id: string) => {
    await notificationService.deleteNotification(id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const typeIcon: Record<string, string> = { BOOKING: "calendar-outline", PAYMENT: "credit-card-outline", REVIEW: "star-outline", HOMESTAY: "home-outline", SUPPORT: "headset", SYSTEM: "bell-outline" };
  const typeColor: Record<string, string> = { BOOKING: "#2563eb", PAYMENT: "#16a34a", REVIEW: "#dc2626", HOMESTAY: "#0891b2", SUPPORT: "#f59e0b", SYSTEM: "#6b7280" };

  return (
    <View style={{ flex: 1 }}>
      <SectionHeader title="Thông báo" onBack={onBack} />
      {loading ? <LoadingIndicator /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0891b2" />}
          ListHeaderComponent={unreadCount > 0 ? (
            <TouchableOpacity style={ns.markAllBtn} onPress={markAllRead}>
              <MaterialCommunityIcons name="check-all" size={16} color="#0891b2" />
              <Text style={ns.markAllText}>Đánh dấu tất cả đã đọc ({unreadCount})</Text>
            </TouchableOpacity>
          ) : <View style={{ height: 4 }} />}
          ListEmptyComponent={
            <EmptyState icon="bell-off-outline" title="Không có thông báo" description="Bạn sẽ nhận thông báo khi có hoạt động mới" />
          }
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 32, flexGrow: 1 }}
          renderItem={({ item }) => {
            const color = typeColor[item.type] ?? "#6b7280";
            const icon = typeIcon[item.type] ?? "bell-outline";
            return (
              <View style={[ns.card, !item.isRead && ns.cardUnread]}>
                <View style={[ns.iconWrap, { backgroundColor: `${color}18` }]}>
                  <MaterialCommunityIcons name={icon as any} size={22} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ns.notifTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={ns.notifMsg} numberOfLines={2}>{item.message}</Text>
                  <View style={ns.notifFooter}>
                    <Text style={ns.notifTime}>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</Text>
                    {!item.isRead && (
                      <TouchableOpacity onPress={() => markRead(item.id)}>
                        <Text style={ns.readBtn}>Đánh dấu đã đọc</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => deleteNotif(item.id)} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name="close" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const ns = StyleSheet.create({
  markAllBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#ecfeff", borderRadius: 12, borderWidth: 1, borderColor: "#cffafe" },
  markAllText: { fontSize: 13, color: "#0891b2", fontWeight: "700" },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 8, marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#f1f5f9" },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: "#0891b2", backgroundColor: "#f0f9ff" },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  notifTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 3 },
  notifMsg: { fontSize: 13, color: "#64748b", lineHeight: 18, marginBottom: 6 },
  notifFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  notifTime: { fontSize: 11, color: "#94a3b8" },
  readBtn: { fontSize: 12, color: "#0891b2", fontWeight: "700" },
});

// ─── Notification Preferences Section ────────────────────────────────────────

function NotifPrefsSection({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>({ emailNotif: true, pushNotif: true, smsNotif: false });

  useEffect(() => {
    notificationService.getPreferences()
      .then(setPrefs)
      .catch(() => showToast("Không thể tải cài đặt", "error"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key: keyof NotificationPreferences) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const save = async () => {
    setSaving(true);
    try {
      await notificationService.updatePreferences(prefs);
      showToast("Đã lưu cài đặt thông báo", "success");
    } catch {
      showToast("Không thể lưu cài đặt", "error");
    } finally {
      setSaving(false);
    }
  };

  const rows: { key: keyof NotificationPreferences; icon: string; color: string; label: string; desc: string }[] = [
    { key: "pushNotif",  icon: "bell-outline",         color: "#0891b2", label: "Thông báo đẩy",  desc: "Nhận thông báo trực tiếp trên điện thoại" },
    { key: "emailNotif", icon: "email-outline",         color: "#2563eb", label: "Thông báo email", desc: "Nhận email về đặt phòng và thanh toán" },
    { key: "smsNotif",   icon: "message-text-outline",  color: "#f59e0b", label: "Thông báo SMS",   desc: "Nhận tin nhắn về lịch đặt phòng" },
  ];

  return (
    <View style={{ flex: 1 }}>
      <SectionHeader title="Cài đặt thông báo" onBack={onBack} />
      {loading ? <LoadingIndicator /> : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
          {rows.map((row) => (
            <View key={row.key} style={np.card}>
              <View style={[np.iconWrap, { backgroundColor: `${row.color}15` }]}>
                <MaterialCommunityIcons name={row.icon as any} size={22} color={row.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={np.label}>{row.label}</Text>
                <Text style={np.desc}>{row.desc}</Text>
              </View>
              <Switch
                value={prefs[row.key]}
                onValueChange={() => toggle(row.key)}
                trackColor={{ false: "#e2e8f0", true: "#86efac" }}
                thumbColor={prefs[row.key] ? "#22c55e" : "#f1f5f9"}
              />
            </View>
          ))}

          <View style={np.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#0369a1" />
            <Text style={np.infoText}>Thay đổi sẽ đồng bộ với tài khoản trên web.</Text>
          </View>

          <TouchableOpacity style={[np.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} activeOpacity={0.8}>
            <MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" />
            <Text style={np.saveBtnText}>{saving ? "Đang lưu..." : "Lưu cài đặt"}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const np = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#f1f5f9" },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  label: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginBottom: 2 },
  desc: { fontSize: 13, color: "#64748b" },
  infoBox: { flexDirection: "row", gap: 10, padding: 14, backgroundColor: "#dbeafe", borderRadius: 12, borderLeftWidth: 3, borderLeftColor: "#2563eb" },
  infoText: { flex: 1, fontSize: 13, color: "#1e40af", lineHeight: 18 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0891b2", borderRadius: 16, paddingVertical: 14, shadowColor: "#0891b2", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});



// ─── Main ProfileScreen ───────────────────────────────────────────────────────

export default function ProfileScreen({ onLogout }: { onLogout?: () => void }) {
  const navigation = useNavigation<any>();
  const [section, setSection] = useState<Section>(null);
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
    profileService.getProfile()
      .then((data) => { if (data) { setProfile(data); reset({ name: data.fullName, phone: data.phone }); } })
      .catch(() => showToast("Không thể tải hồ sơ", "error"))
      .finally(() => setLoading(false));
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
      await profileService.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword, confirmPassword: data.confirmPassword });
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

  // ── Inline sections ─────────────────────────────────────────────────────────

  if (section === "notifications") return (
    <SafeAreaView style={s.container} edges={["bottom"]}>
      <NotificationsSection onBack={() => setSection(null)} />
    </SafeAreaView>
  );

  if (section === "notif-prefs") return (
    <SafeAreaView style={s.container} edges={["bottom"]}>
      <NotifPrefsSection onBack={() => setSection(null)} />
    </SafeAreaView>
  );

  // ── Main settings page ──────────────────────────────────────────────────────

  if (loading) return (
    <SafeAreaView style={s.container} edges={["bottom"]}>
      <Header title="Cài đặt" />
      <LoadingIndicator />
    </SafeAreaView>
  );

  const MENU_SECTIONS = [
    {
      title: "Hoạt động",
      items: [
        { icon: "bell-outline" as const,    label: "Thông báo",          desc: "Xem tất cả thông báo",              color: "#f59e0b", onPress: () => setSection("notifications") },
        { icon: "star-outline" as const,    label: "Đánh giá của tôi",   desc: "Quản lý các đánh giá đã gửi",       color: "#8b5cf6", onPress: () => navigation.navigate("Reviews") },
        { icon: "headset" as const,         label: "Hỗ trợ & Khiếu nại", desc: "Gửi và theo dõi yêu cầu hỗ trợ",   color: "#10b981", onPress: () => navigation.navigate("Support") },
      ],
    },
    {
      title: "Cài đặt",
      items: [
        { icon: "tune" as const, label: "Cài đặt thông báo", desc: "Tuỳ chỉnh kênh nhận thông báo", color: "#0891b2", onPress: () => setSection("notif-prefs") },
      ],
    },
  ];

  return (
    <SafeAreaView style={s.container} edges={["bottom"]}>
      <Header title="Cài đặt" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <LinearGradient colors={["#1d4ed8", "#0891b2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.profileCard}>
          <View style={s.avatarRing}>
            <View style={s.avatar}>
              <MaterialCommunityIcons name="account" size={40} color="#1d4ed8" />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{profile?.fullName || "Người dùng"}</Text>
            <Text style={s.profileEmail}>{profile?.email}</Text>
            <View style={s.roleTag}>
              <MaterialCommunityIcons name="shield-check-outline" size={11} color="#fff" />
              <Text style={s.roleText}>Khách hàng</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Menu sections */}
        {MENU_SECTIONS.map((sec) => (
          <View key={sec.title}>
            <Text style={s.groupLabel}>{sec.title}</Text>
            <View style={s.menuCard}>
              {sec.items.map((item, idx) => (
                <View key={item.label}>
                  <TouchableOpacity style={s.menuRow} onPress={item.onPress} activeOpacity={0.7}>
                    <View style={[s.menuIcon, { backgroundColor: `${item.color}15` }]}>
                      <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.menuLabel}>{item.label}</Text>
                      <Text style={s.menuDesc}>{item.desc}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#cbd5e1" />
                  </TouchableOpacity>
                  {idx < sec.items.length - 1 && <View style={s.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Profile form */}
        <Text style={s.groupLabel}>Thông tin cá nhân</Text>
        <View style={s.menuCard}>
          <Controller control={control} name="name" render={({ field: { value, onChange } }) => (
            <Input label="Họ tên" placeholder="Nhập họ tên" value={value} onChangeText={onChange} error={errors.name?.message} icon="account-outline" />
          )} />
          <View style={s.emailField}>
            <Text style={s.fieldLabel}>Email</Text>
            <View style={s.emailRow}>
              <MaterialCommunityIcons name="email-outline" size={18} color="#64748b" />
              <Text style={s.emailText}>{profile?.email}</Text>
              <View style={s.lockedBadge}>
                <MaterialCommunityIcons name="lock-outline" size={12} color="#94a3b8" />
                <Text style={s.lockedText}>Không thể đổi</Text>
              </View>
            </View>
          </View>
          <Controller control={control} name="phone" render={({ field: { value, onChange } }) => (
            <Input label="Số điện thoại" placeholder="Nhập số điện thoại" value={value} onChangeText={onChange} error={errors.phone?.message} keyboardType="phone-pad" icon="phone-outline" />
          )} />
          <TouchableOpacity
            style={[s.saveBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSubmit(onSaveProfile)}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" />
            <Text style={s.saveBtnText}>{isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}</Text>
          </TouchableOpacity>
        </View>

        {/* Change password */}
        <Text style={s.groupLabel}>Bảo mật</Text>
        <View style={s.menuCard}>
          <TouchableOpacity style={s.menuRow} onPress={() => setShowChangePassword((v) => !v)} activeOpacity={0.7}>
            <View style={[s.menuIcon, { backgroundColor: "#f0fdf4" }]}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>Đổi mật khẩu</Text>
              <Text style={s.menuDesc}>Cập nhật mật khẩu đăng nhập</Text>
            </View>
            <MaterialCommunityIcons name={showChangePassword ? "chevron-up" : "chevron-down"} size={20} color="#cbd5e1" />
          </TouchableOpacity>
          {showChangePassword && (
            <View style={s.pwForm}>
              <View style={s.divider} />
              <Controller control={pwControl} name="currentPassword" render={({ field: { value, onChange } }) => (
                <Input label="Mật khẩu hiện tại" placeholder="Nhập mật khẩu hiện tại" value={value} onChangeText={onChange} error={pwErrors.currentPassword?.message} secureTextEntry icon="lock-outline" />
              )} />
              <Controller control={pwControl} name="newPassword" render={({ field: { value, onChange } }) => (
                <Input label="Mật khẩu mới" placeholder="Nhập mật khẩu mới" value={value} onChangeText={onChange} error={pwErrors.newPassword?.message} secureTextEntry icon="lock-reset" />
              )} />
              <Controller control={pwControl} name="confirmPassword" render={({ field: { value, onChange } }) => (
                <Input label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu mới" value={value} onChangeText={onChange} error={pwErrors.confirmPassword?.message} secureTextEntry icon="lock-check-outline" />
              )} />
              <TouchableOpacity
                style={[s.saveBtn, pwSubmitting && { opacity: 0.6 }]}
                onPress={pwHandleSubmit(onChangePassword)}
                disabled={pwSubmitting}
                activeOpacity={0.8}
              >
                <Text style={s.saveBtnText}>{pwSubmitting ? "Đang đổi..." : "Xác nhận đổi mật khẩu"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Logout */}
        <Text style={s.groupLabel}>Tài khoản</Text>
        <View style={[s.menuCard, s.dangerCard]}>
          <TouchableOpacity style={s.logoutBtn} onPress={() => setLogoutDialogVisible(true)} activeOpacity={0.8}>
            <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
            <Text style={s.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>© 2026 CHMS · Phiên bản 1.0.0</Text>
      </ScrollView>

      <AlertDialog
        visible={logoutDialogVisible}
        title="Xác nhận đăng xuất"
        message="Bạn chắc chắn muốn đăng xuất khỏi ứng dụng không?"
        confirmText="Đăng xuất"
        cancelText="Hủy"
        confirmButtonColor="danger"
        onConfirm={handleLogout}
        onCancel={() => setLogoutDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  scroll: { padding: 16, gap: 0, paddingBottom: 40 },

  // Profile card
  profileCard: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20, paddingVertical: 22, borderRadius: 20, marginBottom: 20 },
  avatarRing: { padding: 3, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.3)" },
  avatar: { width: 66, height: 66, borderRadius: 33, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  profileName: { fontSize: 17, fontWeight: "800", color: "#fff", marginBottom: 3 },
  profileEmail: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 8 },
  roleTag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
  roleText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  // Group
  groupLabel: { fontSize: 12, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 16, paddingHorizontal: 4 },
  menuCard: { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#f1f5f9" },

  // Menu row
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  menuLabel: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginBottom: 1 },
  menuDesc: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#f8fafc", marginLeft: 70 },

  // Form
  emailField: { paddingHorizontal: 4, marginBottom: 4 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#1e293b", marginBottom: 8 },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 14, paddingVertical: 12 },
  emailText: { flex: 1, fontSize: 15, color: "#64748b" },
  lockedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f1f5f9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  lockedText: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0891b2", borderRadius: 14, paddingVertical: 13, marginTop: 8, shadowColor: "#0891b2", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  pwForm: { paddingTop: 4 },

  // Logout
  dangerCard: { borderColor: "#fee2e2" },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },

  footer: { textAlign: "center", fontSize: 12, color: "#cbd5e1", marginTop: 24 },
});
