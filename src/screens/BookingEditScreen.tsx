import {
    Button,
    DatePickerModal,
    Divider,
    Header,
    LoadingIndicator,
} from "@/components";
import { bookingService } from "@/service/booking/bookingService";
import type { Booking } from "@/types";
import { showToast } from "@/utils/toast";
import { formatLocalDate } from "@/utils";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const fmt = (n: number) =>
    n.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export default function BookingEditScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const bookingId = route.params?.bookingId as string;

    const [booking, setBooking] = useState<Booking | null>(route.params?.booking ?? null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activePicker, setActivePicker] = useState<"checkIn" | "checkOut" | null>(null);

    const [checkInDate, setCheckInDate] = useState(new Date());
    const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86400000));
    const [guestCount, setGuestCount] = useState(1);
    const [phone, setPhone] = useState("");
    const [specialRequests, setSpecialRequests] = useState("");
    const [policy, setPolicy] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await bookingService.getBookingDetail(bookingId);
                const resolved = data ?? booking; // fallback về params nếu API fail
                if (resolved) {
                    setBooking(resolved);
                    setCheckInDate(new Date(resolved.checkIn));
                    setCheckOutDate(new Date(resolved.checkOut));
                    setGuestCount(resolved.guestsCount);
                    setPhone(resolved.contactPhone || "");
                    setSpecialRequests(resolved.specialRequests || "");
                }
                const policyData = await bookingService.getCancellationPolicy(bookingId);
                if (policyData) setPolicy(policyData);
            } catch {
                // nếu API fail nhưng có booking từ params thì vẫn dùng được
                if (booking) {
                    setCheckInDate(new Date(booking.checkIn));
                    setCheckOutDate(new Date(booking.checkOut));
                    setGuestCount(booking.guestsCount);
                    setPhone(booking.contactPhone || "");
                    setSpecialRequests(booking.specialRequests || "");
                } else {
                    showToast("Không thể tải chi tiết đặt phòng", "error");
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [bookingId]);

    const handleConfirmDate = (date: Date) => {
        if (activePicker === "checkIn") {
            if (date < new Date()) {
                showToast("Ngày nhận phòng không được là quá khứ", "warning");
                return;
            }
            setCheckInDate(date);
            if (checkOutDate <= date) {
                setCheckOutDate(new Date(date.getTime() + 86400000));
            }
        } else if (activePicker === "checkOut") {
            if (date <= checkInDate) {
                showToast("Ngày trả phòng phải sau ngày nhận phòng", "warning");
                return;
            }
            setCheckOutDate(date);
        }
        setActivePicker(null);
    };

    const handleSave = useCallback(async () => {
        if (!booking || !phone.trim()) {
            showToast("Vui lòng điền số điện thoại", "warning");
            return;
        }
        try {
            setSaving(true);
            const res = await bookingService.modifyBooking(bookingId, {
                homestayId: booking.homestayId,
                checkIn: formatLocalDate(checkInDate),
                checkOut: formatLocalDate(checkOutDate),
                guestsCount: guestCount,
                contactPhone: phone,
                specialRequests: specialRequests || undefined,
            });
            if (res.success) {
                showToast("Cập nhật đặt phòng thành công", "success");
                navigation.goBack();
            } else {
                showToast(res.message || "Không thể cập nhật", "error");
            }
        } catch (e: any) {
            showToast(e?.message || "Cập nhật thất bại", "error");
        } finally {
            setSaving(false);
        }
    }, [booking, bookingId, checkInDate, checkOutDate, guestCount, phone, specialRequests, navigation]);

    const formatDate = (date: Date) =>
        date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

    const totalNights = Math.max(1, Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / 86400000
    ));

    const depositPct = (booking as any)?.depositPercentage ?? 20;
    const depositAmount = booking?.depositAmount ?? 0;
    const remainingAmount = booking?.remainingAmount ?? 0;
    const totalPrice = booking?.totalPrice ?? 0;

    const getPolicyText = () => {
        if (!policy) return null;
        if (typeof policy === "string") return policy;
        if (policy.policy) return policy.policy;
        if (policy.description) return policy.description;
        if (policy.message) return policy.message;
        return null;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={["bottom"]}>
                <Header showBack title="Chỉnh Sửa Đặt Phòng" />
                <LoadingIndicator />
            </SafeAreaView>
        );
    }

    if (!booking || booking.status !== "PENDING") {
        return (
            <SafeAreaView style={styles.container} edges={["bottom"]}>
                <Header showBack title="Chỉnh Sửa Đặt Phòng" />
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={56} color="#ef4444" />
                    <Text style={styles.errorTitle}>Không thể chỉnh sửa</Text>
                    <Text style={styles.errorText}>
                        Chỉ có thể chỉnh sửa đặt phòng đang ở trạng thái chờ thanh toán cọc
                    </Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.backBtnText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <Header showBack title="Chỉnh Sửa Đặt Phòng" />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Homestay summary card */}
                    <LinearGradient colors={["#0891b2", "#0e7490"]} style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <MaterialCommunityIcons name="home-outline" size={20} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.summaryName} numberOfLines={2}>{booking.homestayName || "Căn nhà"}</Text>
                        </View>
                        <Text style={styles.summaryId}>#{booking.id.slice(0, 8).toUpperCase()}</Text>
                        <Divider style={{ backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 12 }} />
                        <View style={styles.summaryStats}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Tổng tiền</Text>
                                <Text style={styles.statValue}>{fmt(totalPrice)}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Cọc ({depositPct}%)</Text>
                                <Text style={[styles.statValue, { color: "#fde68a" }]}>{fmt(depositAmount)}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Còn lại</Text>
                                <Text style={styles.statValue}>{fmt(remainingAmount)}</Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Date section */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="calendar-range" size={18} color="#0891b2" />
                            <Text style={styles.cardTitle}>Ngày lưu trú</Text>
                        </View>
                        <View style={styles.dateRow}>
                            <TouchableOpacity
                                style={styles.dateBtn}
                                onPress={() => setActivePicker("checkIn")}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.dateBtnLabel}>Nhận phòng</Text>
                                <View style={styles.dateBtnValue}>
                                    <MaterialCommunityIcons name="calendar-arrow-right" size={16} color="#0891b2" />
                                    <Text style={styles.dateBtnText}>{formatDate(checkInDate)}</Text>
                                </View>
                            </TouchableOpacity>

                            <MaterialCommunityIcons name="arrow-right" size={18} color="#cbd5e1" style={{ marginTop: 18 }} />

                            <TouchableOpacity
                                style={styles.dateBtn}
                                onPress={() => setActivePicker("checkOut")}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.dateBtnLabel}>Trả phòng</Text>
                                <View style={styles.dateBtnValue}>
                                    <MaterialCommunityIcons name="calendar-arrow-left" size={16} color="#0891b2" />
                                    <Text style={styles.dateBtnText}>{formatDate(checkOutDate)}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.nightsBadge}>
                            <MaterialCommunityIcons name="moon-waning-crescent" size={14} color="#0891b2" />
                            <Text style={styles.nightsText}>{totalNights} đêm</Text>
                            {totalPrice > 0 && (
                                <Text style={styles.nightsPrice}>
                                    · {fmt(Math.round(totalPrice / totalNights))}/đêm
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Phone Input - moved to top */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="phone-outline" size={18} color="#0891b2" />
                            <Text style={styles.cardTitle}>Số điện thoại liên hệ</Text>
                        </View>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="phone-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="0123 456 789"
                                placeholderTextColor="#cbd5e1"
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* Guests */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="account-group-outline" size={18} color="#0891b2" />
                            <Text style={styles.cardTitle}>Số khách</Text>
                        </View>

                        {/* Guest counter */}
                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Số khách</Text>
                            <View style={styles.counter}>
                                <TouchableOpacity
                                    style={[styles.counterBtn, guestCount <= 1 && styles.counterBtnDisabled]}
                                    onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
                                    disabled={guestCount <= 1}
                                >
                                    <MaterialCommunityIcons name="minus" size={16} color={guestCount <= 1 ? "#cbd5e1" : "#0891b2"} />
                                </TouchableOpacity>
                                <Text style={styles.counterValue}>{guestCount}</Text>
                                <TouchableOpacity
                                    style={[styles.counterBtn, guestCount >= (booking.guestsCount || 10) && styles.counterBtnDisabled]}
                                    onPress={() => setGuestCount(Math.min(booking.guestsCount || 10, guestCount + 1))}
                                    disabled={guestCount >= (booking.guestsCount || 10)}
                                >
                                    <MaterialCommunityIcons name="plus" size={16} color={guestCount >= (booking.guestsCount || 10) ? "#cbd5e1" : "#0891b2"} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* End of guest counter */}
                    </View>

                    {/* Special requests */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="message-text-outline" size={18} color="#0891b2" />
                            <Text style={styles.cardTitle}>Yêu cầu đặc biệt</Text>
                            <Text style={styles.optionalTag}>Tùy chọn</Text>
                        </View>
                        <TextInput
                            style={styles.textArea}
                            value={specialRequests}
                            onChangeText={setSpecialRequests}
                            placeholder="Ví dụ: phòng tầng cao, giường đôi, đến muộn..."
                            placeholderTextColor="#cbd5e1"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Cancellation policy */}
                    {getPolicyText() && (
                        <View style={styles.policyCard}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="shield-alert-outline" size={18} color="#d97706" />
                                <Text style={[styles.cardTitle, { color: "#92400e" }]}>Chính sách hủy</Text>
                            </View>
                            <Text style={styles.policyText}>{getPolicyText()}</Text>
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={["#0891b2", "#0e7490"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.saveBtnGradient}
                            >
                                <MaterialCommunityIcons
                                    name={saving ? "loading" : "content-save-outline"}
                                    size={18}
                                    color="#fff"
                                />
                                <Text style={styles.saveBtnText}>
                                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                            <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 24 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            <DatePickerModal
                visible={activePicker !== null}
                value={activePicker === "checkOut" ? checkOutDate : checkInDate}
                minimumDate={activePicker === "checkOut" ? new Date(checkInDate.getTime() + 86400000) : new Date()}
                title={activePicker === "checkIn" ? "Chọn ngày nhận phòng" : "Chọn ngày trả phòng"}
                onConfirm={handleConfirmDate}
                onCancel={() => setActivePicker(null)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f0f9ff" },
    scroll: { padding: 16 },

    // Error state
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 12 },
    errorTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
    errorText: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 },
    backBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: "#0891b2", borderRadius: 10 },
    backBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

    // Summary card
    summaryCard: { borderRadius: 16, padding: 18, marginBottom: 16 },
    summaryRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 4 },
    summaryName: { flex: 1, fontSize: 16, fontWeight: "700", color: "#fff" },
    summaryId: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 },
    summaryStats: { flexDirection: "row", alignItems: "center" },
    statItem: { flex: 1, alignItems: "center" },
    statLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 4 },
    statValue: { fontSize: 13, fontWeight: "700", color: "#fff" },
    statDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },

    // Cards
    card: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
    cardTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b", flex: 1 },
    optionalTag: {
        fontSize: 11, color: "#94a3b8", backgroundColor: "#f1f5f9",
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    },

    // Date picker
    dateRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    dateBtn: {
        flex: 1, backgroundColor: "#f8fafc", borderRadius: 10,
        borderWidth: 1, borderColor: "#e2e8f0", padding: 12,
    },
    dateBtnLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 6, fontWeight: "500" },
    dateBtnValue: { flexDirection: "row", alignItems: "center", gap: 6 },
    dateBtnText: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
    nightsBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        marginTop: 12, backgroundColor: "#e0f2fe",
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: "flex-start",
    },
    nightsText: { fontSize: 13, fontWeight: "700", color: "#0891b2" },
    nightsPrice: { fontSize: 12, color: "#0891b2" },

    // Guest counter
    fieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 8 },
    counter: { flexDirection: "row", alignItems: "center", gap: 0 },
    counterBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: "#e0f2fe", justifyContent: "center", alignItems: "center",
    },
    counterBtnDisabled: { backgroundColor: "#f1f5f9" },
    counterValue: { width: 40, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#0f172a" },

    // Inputs
    inputWrapper: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#f8fafc", borderRadius: 10,
        borderWidth: 1, borderColor: "#e2e8f0",
        paddingHorizontal: 12, height: 48,
    },
    inputIcon: { marginRight: 8 },
    textInput: { flex: 1, fontSize: 14, color: "#0f172a" },
    textArea: {
        backgroundColor: "#f8fafc", borderRadius: 10,
        borderWidth: 1, borderColor: "#e2e8f0",
        padding: 12, fontSize: 14, color: "#0f172a",
        minHeight: 96, lineHeight: 20,
    },

    // Policy
    policyCard: {
        backgroundColor: "#fffbeb", borderRadius: 14, padding: 16,
        marginBottom: 14, borderWidth: 1, borderColor: "#fde68a",
    },
    policyText: { fontSize: 13, color: "#92400e", lineHeight: 20 },

    // Actions
    actions: { gap: 10, marginTop: 4 },
    saveBtn: { borderRadius: 14, overflow: "hidden" },
    saveBtnGradient: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, paddingVertical: 16,
    },
    saveBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
    cancelBtn: { alignItems: "center", paddingVertical: 14 },
    cancelBtnText: { fontSize: 14, color: "#64748b", fontWeight: "600" },
});
