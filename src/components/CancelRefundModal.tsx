import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { bookingService } from "@/service/booking/bookingService";

interface Props {
  visible: boolean;
  bookingId: string;
  onClose: () => void;
  onSuccess: (refundAmount: number, message: string) => void;
}

const BANKS = [
  "Vietcombank", "VietinBank", "BIDV", "Agribank", "Techcombank",
  "MB Bank", "ACB", "VPBank", "TPBank", "Sacombank",
  "HDBank", "OCB", "SHB", "SeABank", "VIB", "MSB", "Eximbank",
];

export default function CancelRefundModal({ visible, bookingId, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [preview, setPreview] = useState<{ estimatedRefund: number; message: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPreviewLoading(true);
    bookingService.previewRefund(bookingId).then((res) => {
      setPreview(res);
      setPreviewLoading(false);
    }).catch(() => setPreviewLoading(false));
  }, [visible, bookingId]);

  const hasRefund = preview && preview.estimatedRefund > 0;
  const isValid =
    reason.trim().length > 0 &&
    (hasRefund ? bankName.trim() && accountNumber.trim() && accountHolderName.trim() : true);

  const handleConfirm = async () => {
    if (!isValid) return;
    setSubmitting(true);
    const res = await bookingService.cancelAndRefund(bookingId, reason.trim(), {
      bankName: hasRefund ? bankName.trim() : "",
      accountNumber: hasRefund ? accountNumber.trim() : "",
      accountHolderName: hasRefund ? accountHolderName.trim() : "",
    });
    setSubmitting(false);
    onSuccess(res.refundAmount, res.message);
  };

  const reset = () => {
    setReason(""); setBankName(""); setAccountNumber(""); setAccountHolderName("");
    setPreview(null); setPreviewLoading(true); setShowBankPicker(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Hủy đặt phòng</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <MaterialCommunityIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Refund preview */}
            <View style={styles.previewBox}>
              {previewLoading ? (
                <ActivityIndicator size="small" color="#0891b2" />
              ) : preview ? (
                <>
                  <Text style={styles.previewLabel}>Hoàn tiền dự kiến</Text>
                  <Text style={[styles.previewAmount, { color: hasRefund ? "#059669" : "#ef4444" }]}>
                    {hasRefund ? `₫${preview.estimatedRefund.toLocaleString("vi-VN")}` : "Không hoàn tiền"}
                  </Text>
                  <Text style={styles.previewNote}>{preview.message}</Text>
                </>
              ) : (
                <Text style={styles.previewNote}>Không thể tải thông tin hoàn tiền</Text>
              )}
            </View>

            {/* Reason */}
            <Text style={styles.label}>Lý do hủy <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập lý do hủy đặt phòng..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Bank info — chỉ hiện khi có hoàn tiền */}
            {hasRefund && (
              <>
                <Text style={styles.sectionLabel}>Thông tin nhận hoàn tiền</Text>

                <Text style={styles.label}>Ngân hàng <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowBankPicker(!showBankPicker)}>
                  <Text style={bankName ? styles.inputText : styles.placeholder}>
                    {bankName || "Chọn ngân hàng..."}
                  </Text>
                </TouchableOpacity>
                {showBankPicker && (
                  <View style={styles.bankList}>
                    {BANKS.map((b) => (
                      <TouchableOpacity key={b} style={styles.bankItem} onPress={() => { setBankName(b); setShowBankPicker(false); }}>
                        <Text style={[styles.bankItemText, bankName === b && styles.bankItemSelected]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.label}>Số tài khoản <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số tài khoản..."
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Tên chủ tài khoản <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên chủ tài khoản..."
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                  autoCapitalize="characters"
                />
              </>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { reset(); onClose(); }}>
                <Text style={styles.btnCancelText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnConfirm, !isValid && styles.btnDisabled]}
                onPress={handleConfirm}
                disabled={!isValid || submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnConfirmText}>Xác nhận hủy</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "90%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  previewBox: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16, alignItems: "center" },
  previewLabel: { fontSize: 12, color: "#64748b", marginBottom: 4 },
  previewAmount: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  previewNote: { fontSize: 12, color: "#64748b", textAlign: "center" },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#0f172a", marginTop: 12, marginBottom: 8 },
  label: { fontSize: 13, color: "#374151", marginBottom: 4, marginTop: 8 },
  required: { color: "#ef4444" },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 12, fontSize: 14, color: "#0f172a", backgroundColor: "#fff", justifyContent: "center" },
  inputText: { fontSize: 14, color: "#0f172a" },
  placeholder: { fontSize: 14, color: "#94a3b8" },
  bankList: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, marginTop: 4, maxHeight: 180, overflow: "hidden" },
  bankItem: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  bankItemText: { fontSize: 14, color: "#374151" },
  bankItemSelected: { color: "#0891b2", fontWeight: "700" },
  actions: { flexDirection: "row", gap: 12, marginTop: 20, marginBottom: 8 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" },
  btnCancelText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  btnConfirm: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#ef4444", alignItems: "center" },
  btnConfirmText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  btnDisabled: { backgroundColor: "#fca5a5" },
});
