import { Card, Divider, Header, LoadingIndicator } from "@/components";
import { bookingService } from "@/service/booking/bookingService";
import { paymentService } from "@/service/payment/paymentService";
import type { Booking } from "@/types";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const fmt = (n: number) =>
  n.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export default function PaymentInitiationScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const bookingId = route.params?.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    bookingService.getBookingDetail(bookingId)
      .then((data) => { if (data) setBooking(data); })
      .catch(() => showToast("Không thể tải chi tiết đặt phòng", "error"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // Xác định đây là thanh toán cọc hay còn lại — giống FE
  const isDepositPayment = !booking || booking.status === "PENDING";
  const amountDue = isDepositPayment
    ? (booking?.depositAmount ?? 0)
    : (booking?.remainingAmount ?? 0);
  const paymentLabel = isDepositPayment ? "Đặt cọc" : "Thanh toán còn lại";
  const depositPct = (booking as any)?.depositPercentage ?? 20;
  const nights = booking
    ? Math.max(1, Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000))
    : 0;

  const handlePay = useCallback(async () => {
    if (!booking || amountDue <= 0) {
      showToast("Số tiền không hợp lệ", "warning");
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
      const res = await paymentService.createPaymentLink({
        bookingId: booking.id,
        cancelUrl,
        returnUrl,
      });
      if (res?.checkoutUrl) {
        await WebBrowser.openBrowserAsync(res.checkoutUrl);
        navigation.navigate("PaymentResult", { bookingId: booking.id });
      } else {
        showToast("Không thể tạo link thanh toán", "error");
      }
    } catch (e: any) {
      showToast(e?.message || "Lỗi khi khởi tạo thanh toán", "error");
    } finally {
      setProcessing(false);
    }
  }, [booking, amountDue, navigation]);

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
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Không tìm thấy đặt phòng</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header showBack title={paymentLabel} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Booking summary card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialCommunityIcons name="home-outline" size={18} color="#0891b2" />
            <Text style={styles.homestayName} numberOfLines={2}>{booking.homestayName}</Text>
          </View>
          <View style={styles.summaryMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar-range" size={14} color="#64748b" />
              <Text style={styles.metaText}>
                {new Date(booking.checkIn).toLocaleDateString("vi-VN")} → {new Date(booking.checkOut).toLocaleDateString("vi-VN")}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="moon-waning-crescent" size={14} color="#64748b" />
              <Text style={styles.metaText}>{nights} đêm</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="account-multiple" size={14} color="#64748b" />
              <Text style={styles.metaText}>{booking.guestsCount} khách</Text>
            </View>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          {/* Price breakdown */}
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tổng tiền booking</Text>
              <Text style={styles.priceVal}>{fmt(booking.totalPrice ?? 0)}</Text>
            </View>
            <View style={[styles.priceRow, styles.depositRow]}>
              <Text style={[styles.priceLabel, isDepositPayment && styles.highlightLabel]}>
                {isDepositPayment ? "→ Cọc ngay" : "Đã cọc"} ({depositPct}%)
              </Text>
              <Text style={[styles.priceVal, isDepositPayment ? styles.depositVal : styles.mutedVal]}>
                {fmt(booking.depositAmount ?? 0)}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, !isDepositPayment && styles.highlightLabel]}>
                {!isDepositPayment ? "→ Còn lại thanh toán" : "Còn lại khi nhận phòng"} ({100 - depositPct}%)
              </Text>
              <Text style={[styles.priceVal, !isDepositPayment ? styles.remainingVal : styles.mutedVal]}>
                {fmt(booking.remainingAmount ?? 0)}
              </Text>
            </View>
            <Divider style={{ marginVertical: 10 }} />
            <View style={styles.priceRow}>
              <Text style={styles.amountDueLabel}>Thanh toán ngay</Text>
              <Text style={styles.amountDueVal}>{fmt(amountDue)}</Text>
            </View>
          </View>
        </Card>

        {/* Payment method — chỉ PayOS, không có lựa chọn khác */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          <View style={styles.methodCard}>
            <View style={styles.methodIcon}>
              <MaterialCommunityIcons name="credit-card-outline" size={22} color="#fff" />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodName}>PayOS</Text>
              <Text style={styles.methodDesc}>Thanh toán qua cổng PayOS (ATM, Visa, QR)</Text>
            </View>
            <View style={styles.methodCheck}>
              <View style={styles.methodCheckInner} />
            </View>
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteBox}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#2563eb" />
          <Text style={styles.noteText}>
            Bạn sẽ được chuyển đến trang thanh toán an toàn của PayOS
          </Text>
        </View>

        {/* Pay button */}
        <TouchableOpacity
          style={[styles.payBtn, processing && { opacity: 0.6 }]}
          onPress={handlePay}
          disabled={processing}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#f97316", "#ea580c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.payBtnGradient}
          >
            {processing ? (
              <MaterialCommunityIcons name="loading" size={20} color="#fff" />
            ) : (
              <MaterialCommunityIcons name="open-in-new" size={20} color="#fff" />
            )}
            <Text style={styles.payBtnText}>
              {processing ? "Đang xử lý..." : `${paymentLabel} · ${fmt(amountDue)}`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Hủy</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  scroll: { padding: 16 },
  errorBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 16, color: "#ef4444", fontWeight: "600" },

  summaryCard: { marginBottom: 20, padding: 16 },
  summaryHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  homestayName: { flex: 1, fontSize: 16, fontWeight: "700", color: "#0f172a" },
  summaryMeta: { gap: 6, marginBottom: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 13, color: "#64748b" },

  priceBreakdown: { gap: 8 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  depositRow: { paddingTop: 4 },
  priceLabel: { fontSize: 13, color: "#64748b", flex: 1 },
  priceVal: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
  highlightLabel: { color: "#0f172a", fontWeight: "700" },
  depositVal: { color: "#f59e0b", fontWeight: "700" },
  remainingVal: { color: "#2563eb", fontWeight: "700" },
  mutedVal: { color: "#94a3b8" },
  amountDueLabel: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  amountDueVal: { fontSize: 18, fontWeight: "900", color: "#f97316" },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 12 },

  methodCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#eff6ff", borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: "#2563eb",
  },
  methodIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: "#2563eb",
    justifyContent: "center", alignItems: "center",
  },
  methodInfo: { flex: 1 },
  methodName: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  methodDesc: { fontSize: 12, color: "#64748b", marginTop: 2 },
  methodCheck: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: "#2563eb", backgroundColor: "#2563eb",
    justifyContent: "center", alignItems: "center",
  },
  methodCheckInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },

  noteBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#dbeafe", borderRadius: 12, padding: 12,
    borderLeftWidth: 4, borderLeftColor: "#2563eb", marginBottom: 20,
  },
  noteText: { flex: 1, fontSize: 12, color: "#1e40af", lineHeight: 18 },

  payBtn: { borderRadius: 16, overflow: "hidden", marginBottom: 12 },
  payBtnGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 18,
  },
  payBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },

  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelBtnText: { fontSize: 14, color: "#64748b", fontWeight: "600" },
});
