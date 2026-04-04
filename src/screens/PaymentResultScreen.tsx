import { Button, Header, LoadingIndicator } from "@/components";
import { bookingService } from "@/service/booking/bookingService";
import { paymentService } from "@/service/payment/paymentService";
import { colors } from "@/utils/colors";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentResultScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const paymentId = route.params?.paymentId as string;
    const bookingId = route.params?.bookingId as string;

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<"SUCCESS" | "PENDING" | "FAILED" | "ERROR">("PENDING");
    const [paymentDetail, setPaymentDetail] = useState<any>(null);
    const [bookingDetail, setBookingDetail] = useState<any>(null);

    useEffect(() => {
        const checkPaymentStatus = async () => {
            if (!paymentId && !bookingId) {
                setStatus("ERROR");
                setLoading(false);
                return;
            }

            try {
                let resolvedPaymentId = paymentId;

                if (!resolvedPaymentId && bookingId) {
                    const history = await paymentService.getPaymentHistory();
                    const forBooking = history
                        .filter((p) => p.bookingId === bookingId)
                        .sort(
                            (a, b) =>
                                new Date(b.createdAt).getTime() -
                                new Date(a.createdAt).getTime(),
                        );
                    resolvedPaymentId = forBooking[0]?.id;
                }

                const [payment, bookingRow] = await Promise.all([
                    resolvedPaymentId
                        ? paymentService.getPaymentDetail(resolvedPaymentId)
                        : Promise.resolve(null),
                    bookingId
                        ? bookingService.getBookingDetail(bookingId)
                        : Promise.resolve(null),
                ]);

                setPaymentDetail(payment);
                setBookingDetail(bookingRow);

                if (payment?.status === "COMPLETED") {
                    setStatus("SUCCESS");
                } else if (payment?.status === "PENDING") {
                    setStatus("PENDING");
                } else if (
                    payment?.status === "FAILED" ||
                    payment?.status === "CANCELLED"
                ) {
                    setStatus("FAILED");
                } else if (!payment && bookingRow?.paymentStatus === "FULLY_PAID") {
                    setStatus("SUCCESS");
                } else if (!payment && bookingRow?.paymentStatus === "DEPOSIT_PAID") {
                    setStatus("PENDING");
                } else if (!payment) {
                    setStatus("PENDING");
                }
            } catch (error) {

                setStatus("ERROR");
                showToast("Không thể kiểm tra trạng thái thanh toán", "error");
            } finally {
                setLoading(false);
            }
        };

        checkPaymentStatus();
    }, [paymentId, bookingId]);

    const handleContinue = useCallback(() => {
        if (status === "SUCCESS") {
            navigation.replace("MainTabs", { screen: "Bookings" });
        } else {
            navigation.goBack();
        }
    }, [status, navigation]);

    const getStatusInfo = () => {
        switch (status) {
            case "SUCCESS":
                return {
                    icon: "check-circle",
                    title: "Thanh Toán Thành Công",
                    description: "Đặt phòng của bạn đã được xác nhận",
                    color: "#22c55e",
                    bgColor: "#dcfce7",
                };
            case "PENDING":
                return {
                    icon: "clock-outline",
                    title: "Thanh Toán Đang Xử Lý",
                    description: "Vui lòng chờ xác nhận thanh toán",
                    color: "#f59e0b",
                    bgColor: "#fef3c7",
                };
            case "FAILED":
                return {
                    icon: "close-circle",
                    title: "Thanh Toán Thất Bại",
                    description: "Vui lòng thử lại hoặc liên hệ hỗ trợ",
                    color: "#ef4444",
                    bgColor: "#fee2e2",
                };
            default:
                return {
                    icon: "alert-circle",
                    title: "Lỗi",
                    description: "Không thể xử lý thanh toán",
                    color: "#6b7280",
                    bgColor: "#f3f4f6",
                };
        }
    };

    const info = getStatusInfo();

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header showBack title="" />
                <LoadingIndicator />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header showBack title="" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Status Icon */}
                <View style={[styles.statusContainer, { backgroundColor: info.bgColor }]}>
                    <MaterialCommunityIcons
                        name={info.icon as any}
                        size={80}
                        color={info.color}
                    />
                </View>

                {/* Status Title */}
                <Text style={styles.statusTitle}>{info.title}</Text>
                <Text style={styles.statusDescription}>{info.description}</Text>

                {/* Details Card */}
                {paymentDetail && (
                    <View style={styles.detailsCard}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Mã giao dịch</Text>
                            <Text style={styles.detailValue}>{paymentDetail.transactionId || paymentDetail.id}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Số tiền</Text>
                            <Text style={styles.detailValue}>
                                {paymentDetail.amount?.toLocaleString("vi-VN")} ₫
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Phương thức</Text>
                            <Text style={styles.detailValue}>{paymentDetail.method || "PayOS"}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Ngày thanh toán</Text>
                            <Text style={styles.detailValue}>
                                {new Date(paymentDetail.createdAt).toLocaleDateString("vi-VN", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Booking Details */}
                {bookingDetail && (
                    <View style={styles.bookingCard}>
                        <Text style={styles.bookingCardTitle}>Chi tiết đặt phòng</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Căn nhà</Text>
                            <Text style={styles.detailValue} numberOfLines={2}>
                                {bookingDetail.homestayName}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Ngày nhận phòng</Text>
                            <Text style={styles.detailValue}>
                                {new Date(bookingDetail.checkIn).toLocaleDateString("vi-VN")}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Ngày trả phòng</Text>
                            <Text style={styles.detailValue}>
                                {new Date(bookingDetail.checkOut).toLocaleDateString("vi-VN")}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Tổng giá</Text>
                            <Text style={[styles.detailValue, { fontWeight: "700", color: "#0891b2" }]}>
                                {bookingDetail.totalPrice?.toLocaleString("vi-VN")} ₫
                            </Text>
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    {status === "FAILED" && (
                        <Button
                            title="Thử Lại Thanh Toán"
                            onPress={() => navigation.goBack()}
                            size="large"
                            style={styles.button}
                        />
                    )}
                    <Button
                        title={status === "SUCCESS" ? "Xem Đặt Phòng" : "Quay Lại"}
                        onPress={handleContinue}
                        size="large"
                        style={styles.button}
                        variant={status === "SUCCESS" ? "primary" : "outline"}
                    />
                </View>

                {/* Help Text */}
                {status === "PENDING" && (
                    <View style={styles.helpBox}>
                        <MaterialCommunityIcons
                            name="information-outline"
                            size={16}
                            color="#0891b2"
                        />
                        <Text style={styles.helpText}>
                            Nếu không nhận được xác nhận trong 5 phút, vui lòng liên hệ hỗ trợ
                        </Text>
                    </View>
                )}

                {status === "FAILED" && (
                    <View style={[styles.helpBox, { borderColor: "#ef4444", backgroundColor: "#fee2e2" }]}>
                        <MaterialCommunityIcons
                            name="alert-circle-outline"
                            size={16}
                            color="#ef4444"
                        />
                        <Text style={[styles.helpText, { color: "#dc2626" }]}>
                            Thanh toán không thành công. Vui lòng kiểm tra tài khoản hoặc thử phương thức khác
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 16 },
    statusContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        marginVertical: 24,
    },
    statusTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: colors.text.primary,
        textAlign: "center",
        marginBottom: 8,
    },
    statusDescription: {
        fontSize: 14,
        color: colors.text.secondary,
        textAlign: "center",
        marginBottom: 24,
    },
    detailsCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    bookingCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    bookingCardTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.text.primary,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    detailLabel: {
        fontSize: 13,
        color: colors.text.secondary,
        fontWeight: "500",
    },
    detailValue: {
        fontSize: 13,
        color: colors.text.primary,
        fontWeight: "600",
        textAlign: "right",
        maxWidth: "60%",
    },
    actionButtons: { gap: 12, marginBottom: 24 },
    button: {},
    helpBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#e0f2fe",
        borderWidth: 1,
        borderColor: "#0891b2",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    helpText: {
        fontSize: 12,
        color: "#0891b2",
        flex: 1,
        lineHeight: 16,
    },
});
