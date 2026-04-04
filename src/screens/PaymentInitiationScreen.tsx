import {
    Button,
    Card,
    Divider,
    Header,
    Input,
    LoadingIndicator,
} from "@/components";
import { bookingService } from "@/service/booking/bookingService";
import { paymentService } from "@/service/payment/paymentService";
import type { Booking } from "@/types";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
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

export default function PaymentInitiationScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const bookingId = route.params?.bookingId as string;

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [amount, setAmount] = useState<string>("");
    const [amountOption, setAmountOption] = useState<"deposit" | "full" | "custom">("deposit");

    useEffect(() => {
        const loadBooking = async () => {
            try {
                const data = await bookingService.getBookingDetail(bookingId);
                if (data) {
                    setBooking(data);
                    // Default to deposit
                    if (data.depositAmount) {
                        setAmount(String(Math.ceil(data.depositAmount)));
                    }
                }
            } catch (error) {
                showToast("Không thể tải chi tiết đặt phòng", "error");

            } finally {
                setLoading(false);
            }
        };

        loadBooking();
    }, [bookingId]);

    const handleAmountOptionChange = (option: "deposit" | "full" | "custom") => {
        setAmountOption(option);
        if (option === "deposit" && booking?.depositAmount) {
            setAmount(String(Math.ceil(booking.depositAmount)));
        } else if (option === "full" && booking?.totalPrice) {
            setAmount(String(Math.ceil(booking.totalPrice)));
        }
    };

    const handleInitiatePayment = useCallback(async () => {
        if (!booking || !amount || parseFloat(amount) <= 0) {
            showToast("Vui lòng nhập số tiền hợp lệ", "warning");
            return;
        }

        try {
            setProcessing(true);

            const returnUrl = Linking.createURL("payment-result", {
                queryParams: { bookingId: booking.id },
            });
            const cancelUrl = Linking.createURL("payment-result", {
                queryParams: { bookingId: booking.id, cancel: "true" },
            });

            const paymentLink = await paymentService.createPaymentLink({
                bookingId: booking.id,
                cancelUrl,
                returnUrl,
            });

            if (paymentLink?.checkoutUrl) {
                const result = await WebBrowser.openBrowserAsync(
                    paymentLink.checkoutUrl,
                );
                if (result.type === "dismiss") {
                    navigation.navigate("PaymentResult", { bookingId: booking.id });
                } else {
                    navigation.navigate("PaymentResult", { bookingId: booking.id });
                }
            } else {
                showToast("Không thể tạo link thanh toán", "error");
            }
        } catch (error: any) {
            showToast(error?.message || "Lỗi khi khởi tạo thanh toán", "error");

        } finally {
            setProcessing(false);
        }
    }, [booking, amount, navigation]);

    const formatCurrency = (value: number) =>
        value.toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        });

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header showBack title="Thanh Toán" />
                <LoadingIndicator />
            </SafeAreaView>
        );
    }

    if (!booking) {
        return (
            <SafeAreaView style={styles.container}>
                <Header showBack title="Thanh Toán" />
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={48}
                        color="#ef4444"
                    />
                    <Text style={styles.errorText}>Không tìm thấy đặt phòng</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header showBack title="Thanh Toán" />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Booking Summary */}
                    <Card style={styles.bookingSummary}>
                        <View style={styles.summaryHeader}>
                            <Text style={styles.homestayName}>{booking.homestayName}</Text>
                            <View style={styles.dateRange}>
                                <MaterialCommunityIcons
                                    name="calendar-range"
                                    size={14}
                                    color="#64748b"
                                />
                                <Text style={styles.dateText}>
                                    {Math.ceil(
                                        (new Date(booking.checkOut).getTime() -
                                            new Date(booking.checkIn).getTime()) /
                                        86400000
                                    )}{" "}
                                    đêm
                                </Text>
                            </View>
                        </View>

                        <Divider style={styles.divider} />

                        <View style={styles.priceBreakdown}>
                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Tổng tiền phòng</Text>
                                <Text style={styles.priceValue}>
                                    {formatCurrency(booking.totalPrice || 0)}
                                </Text>
                            </View>
                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Tiền cọc (yêu cầu)</Text>
                                <Text style={styles.depositValue}>
                                    {formatCurrency(booking.depositAmount || 0)}
                                </Text>
                            </View>
                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Còn lại phải thanh toán</Text>
                                <Text style={styles.remainingValue}>
                                    {formatCurrency(booking.remainingAmount || 0)}
                                </Text>
                            </View>
                        </View>
                    </Card>

                    {/* Payment Options */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Chọn Loại Thanh Toán</Text>

                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                amountOption === "deposit" && styles.paymentOptionSelected,
                            ]}
                            onPress={() => handleAmountOptionChange("deposit")}
                            activeOpacity={0.7}
                        >
                            <View style={styles.optionHeader}>
                                <MaterialCommunityIcons
                                    name={amountOption === "deposit" ? "radiobox-marked" : "radiobox-blank"}
                                    size={20}
                                    color={amountOption === "deposit" ? "#0891b2" : "#cbd5e1"}
                                />
                                <View style={styles.optionContent}>
                                    <Text style={styles.optionTitle}>Thanh Toán Cọc</Text>
                                    <Text style={styles.optionDesc}>
                                        Thanh toán tạm thời (~50%)
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.optionAmount}>
                                {formatCurrency(booking.depositAmount || 0)}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                amountOption === "full" && styles.paymentOptionSelected,
                            ]}
                            onPress={() => handleAmountOptionChange("full")}
                            activeOpacity={0.7}
                        >
                            <View style={styles.optionHeader}>
                                <MaterialCommunityIcons
                                    name={amountOption === "full" ? "radiobox-marked" : "radiobox-blank"}
                                    size={20}
                                    color={amountOption === "full" ? "#0891b2" : "#cbd5e1"}
                                />
                                <View style={styles.optionContent}>
                                    <Text style={styles.optionTitle}>Thanh Toán Toàn Bộ</Text>
                                    <Text style={styles.optionDesc}>
                                        Thanh toán 100% ngay bây giờ
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.optionAmount}>
                                {formatCurrency(booking.totalPrice || 0)}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                amountOption === "custom" && styles.paymentOptionSelected,
                            ]}
                            onPress={() => handleAmountOptionChange("custom")}
                            activeOpacity={0.7}
                        >
                            <View style={styles.optionHeader}>
                                <MaterialCommunityIcons
                                    name={amountOption === "custom" ? "radiobox-marked" : "radiobox-blank"}
                                    size={20}
                                    color={amountOption === "custom" ? "#0891b2" : "#cbd5e1"}
                                />
                                <View style={styles.optionContent}>
                                    <Text style={styles.optionTitle}>Nhập Số Tiền Tùy Chỉnh</Text>
                                    <Text style={styles.optionDesc}>Chọn số tiền bạn muốn thanh toán</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Custom Amount Input */}
                    {amountOption === "custom" && (
                        <View style={styles.section}>
                            <Input
                                label="Số Tiền (đ)"
                                placeholder={`Từ ${Math.ceil(booking.depositAmount || 0)} đến ${Math.ceil(booking.totalPrice || 0)}`}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                            />
                        </View>
                    )}

                    {/* Amount Display */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Số Tiền Thanh Toán</Text>
                        <View style={styles.amountBox}>
                            <Text style={styles.amountLabel}>Tổng cộng</Text>
                            <Text style={styles.amountValue}>{formatCurrency(parseFloat(amount) || 0)}</Text>
                        </View>
                    </View>

                    {/* Payment Method Info */}
                    <View style={styles.section}>
                        <View style={styles.methodBox}>
                            <MaterialCommunityIcons
                                name="information-outline"
                                size={20}
                                color="#2563eb"
                            />
                            <Text style={styles.methodText}>
                                Thanh toán qua PayOS - An toàn, nhanh chóng và tiện lợi
                            </Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.section}>
                        <Button
                            title="Tiến Hành Thanh Toán"
                            onPress={handleInitiatePayment}
                            loading={processing}
                            style={styles.payButton}
                        />
                        <Button
                            title="Hủy"
                            variant="outline"
                            onPress={() => navigation.goBack()}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
    },
    bookingSummary: {
        marginBottom: 24,
        padding: 16,
    },
    summaryHeader: {
        marginBottom: 12,
    },
    homestayName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: 8,
    },
    dateRange: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    dateText: {
        fontSize: 13,
        color: "#64748b",
    },
    divider: {
        marginVertical: 12,
    },
    priceBreakdown: {
        gap: 8,
    },
    priceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    priceLabel: {
        fontSize: 13,
        color: "#64748b",
    },
    priceValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1e293b",
    },
    depositValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#f59e0b",
    },
    remainingValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#22c55e",
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
    paymentOption: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: "#e2e8f0",
        backgroundColor: "#fff",
    },
    paymentOptionSelected: {
        borderColor: "#0891b2",
        backgroundColor: "#f0f9ff",
    },
    optionHeader: {
        flex: 1,
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
    },
    optionContent: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: 2,
    },
    optionDesc: {
        fontSize: 12,
        color: "#64748b",
    },
    optionAmount: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0891b2",
        marginLeft: 12,
    },
    amountBox: {
        padding: 16,
        backgroundColor: "#f0f9ff",
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#0891b2",
    },
    amountLabel: {
        fontSize: 13,
        color: "#0369a1",
        marginBottom: 4,
    },
    amountValue: {
        fontSize: 28,
        fontWeight: "700",
        color: "#0891b2",
    },
    methodBox: {
        flexDirection: "row",
        gap: 12,
        padding: 12,
        backgroundColor: "#dbeafe",
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#2563eb",
    },
    methodText: {
        flex: 1,
        fontSize: 13,
        color: "#1e40af",
        lineHeight: 18,
    },
    payButton: {
        marginBottom: 8,
    },
});
