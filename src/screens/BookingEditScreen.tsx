import {
    Button,
    DatePickerModal,
    Divider,
    Header,
    Input,
    LoadingIndicator,
} from "@/components";
import { bookingService } from "@/service/booking/bookingService";
import type { Booking } from "@/types";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
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

export default function BookingEditScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const bookingId = route.params?.bookingId as string;

    const [booking, setBooking] = useState<Booking | null>(null);
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
        const loadBooking = async () => {
            try {
                const data = await bookingService.getBookingDetail(bookingId);
                if (data) {
                    setBooking(data);
                    setCheckInDate(new Date(data.checkIn));
                    setCheckOutDate(new Date(data.checkOut));
                    setGuestCount(data.guestsCount);
                    setPhone(data.contactPhone || "");
                    setSpecialRequests(data.specialRequests || "");
                }

                // Load cancellation policy
                const policyData = await bookingService.getCancellationPolicy(bookingId);
                if (policyData) setPolicy(policyData);
            } catch (error) {
                showToast("Không thể tải chi tiết đặt phòng", "error");
            } finally {
                setLoading(false);
            }
        };

        loadBooking();
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

    const handleSaveChanges = useCallback(async () => {
        if (!booking || !phone) {
            showToast("Vui lòng điền đầy đủ thông tin", "warning");
            return;
        }

        if (guestCount > (booking?.guestsCount || 1)) {
            showToast(
                `Số khách không thể vượt quá ${booking?.guestsCount}`,
                "warning"
            );
            return;
        }

        try {
            setSaving(true);
            const res = await bookingService.modifyBooking(bookingId, {
                checkIn: checkInDate.toISOString().split("T")[0],
                checkOut: checkOutDate.toISOString().split("T")[0],
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
        } catch (error: any) {
            showToast(error?.message || "Cập nhật thất bại", "error");
        } finally {
            setSaving(false);
        }
    }, [booking, bookingId, checkInDate, checkOutDate, guestCount, phone, specialRequests, navigation]);

    const formatDate = (date: Date) =>
        date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });

    const totalNights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / 86400000
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header showBack title="Chỉnh Sửa Đặt Phòng" />
                <LoadingIndicator />
            </SafeAreaView>
        );
    }

    if (!booking || booking.status !== "PENDING") {
        return (
            <SafeAreaView style={styles.container}>
                <Header showBack title="Chỉnh Sửa Đặt Phòng" />
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={48}
                        color="#ef4444"
                    />
                    <Text style={styles.errorText}>
                        Chỉ có thể chỉnh sửa đặt phòng có trạng thái "Chờ xử lý"
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header showBack title="Chỉnh Sửa Đặt Phòng" />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Booking Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thông Tin Đặt Phòng</Text>
                        <View style={styles.infoBox}>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Căn nhà:</Text>
                                <Text style={styles.value}>{booking.homestayName}</Text>
                            </View>
                            <Divider />
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>ID:</Text>
                                <Text style={styles.value}>#{booking.id.slice(0, 8)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Date Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ngày Ở</Text>

                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setActivePicker("checkIn")}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons
                                name="calendar-outline"
                                size={20}
                                color="#0891b2"
                            />
                            <View style={styles.dateButtonContent}>
                                <Text style={styles.dateLabel}>Nhận phòng</Text>
                                <Text style={styles.dateValue}>{formatDate(checkInDate)}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setActivePicker("checkOut")}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons
                                name="calendar-outline"
                                size={20}
                                color="#0891b2"
                            />
                            <View style={styles.dateButtonContent}>
                                <Text style={styles.dateLabel}>Trả phòng</Text>
                                <Text style={styles.dateValue}>
                                    {formatDate(checkOutDate)}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {showCheckInPicker && (
                            <DateTimePicker
                                value={checkInDate}
                                mode="date"
                                display="spinner"
                                onChange={handleCheckInDate}
                            />
                        )}

                        {showCheckOutPicker && (
                            <DateTimePicker
                                value={checkOutDate}
                                mode="date"
                                display="spinner"
                                onChange={handleCheckOutDate}
                            />
                        )}

                        <View style={styles.nights}>
                            <Text style={styles.nightsText}>
                                {totalNights} đêm × {((booking.totalPrice || 0) / totalNights).toLocaleString()} đ
                            </Text>
                        </View>
                    </View>

                    {/* Guests & Contact */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Số Khách & Liên Hệ</Text>

                        <Input
                            label="Số Khách"
                            placeholder="1"
                            value={String(guestCount)}
                            onChangeText={(text) => {
                                const num = parseInt(text) || 1;
                                setGuestCount(Math.min(num, booking.guestsCount || 1));
                            }}
                            keyboardType="numeric"
                        />

                        <Input
                            label="Số Điện Thoại"
                            placeholder="0123456789"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Special Requests */}
                    <View style={styles.section}>
                        <Input
                            label="Yêu Cầu Đặc Biệt"
                            placeholder="Nhập yêu cầu thêm (tùy chọn)"
                            value={specialRequests}
                            onChangeText={setSpecialRequests}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* Cancellation Policy */}
                    {policy && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Chính Sách Hủy</Text>
                            <View style={styles.policyBox}>
                                <Text style={styles.policyText}>{policy.description || policy}</Text>
                            </View>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.section}>
                        <Button
                            title="Lưu Thay Đổi"
                            onPress={handleSaveChanges}
                            loading={saving}
                            style={styles.saveButton}
                        />
                        <Button
                            title="Hủy"
                            variant="outline"
                            onPress={() => navigation.goBack()}
                            style={styles.cancelButton}
                        />
                    </View>
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
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: 40,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    errorText: {
        fontSize: 16,
        color: "#6b7280",
        textAlign: "center",
        maxWidth: 300,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: 12,
    },
    infoBox: {
        backgroundColor: "#fff",
        borderRadius: 8,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: "#64748b",
    },
    value: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1e293b",
    },
    dateButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8,
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    dateButtonContent: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 12,
        color: "#64748b",
        marginBottom: 4,
    },
    dateValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1e293b",
    },
    nights: {
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#f0f9ff",
        borderRadius: 6,
    },
    nightsText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#0369a1",
    },
    policyBox: {
        padding: 12,
        backgroundColor: "#fef3c7",
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#f59e0b",
    },
    policyText: {
        fontSize: 13,
        color: "#92400e",
        lineHeight: 18,
    },
    saveButton: {
        marginBottom: 8,
    },
    cancelButton: {
        marginBottom: 8,
    },
});
