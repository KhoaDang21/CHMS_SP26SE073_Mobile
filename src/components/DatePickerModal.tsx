/**
 * DatePickerModal — Modal bọc DateTimePicker với nút Xác nhận / Hủy.
 *
 * Fix 2 bugs:
 * 1. iOS spinner tự apply khi scroll → dùng temp state, chỉ apply khi bấm "Xác nhận"
 * 2. 2 picker chồng lên nhau → chỉ render 1 modal tại một thời điểm (caller kiểm soát)
 */
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export function DatePickerModal({
  visible,
  value,
  minimumDate,
  maximumDate,
  title,
  onConfirm,
  onCancel,
}: DatePickerModalProps) {
  // Temp state — chỉ apply khi bấm Xác nhận
  const [tempDate, setTempDate] = useState<Date>(value);

  // Reset temp khi modal mở
  const handleShow = () => setTempDate(value);

  if (Platform.OS === "android") {
    // Android: DateTimePicker tự hiện native dialog, không cần Modal bọc
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="default"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={(_, date) => {
          if (date) onConfirm(date);
          else onCancel();
        }}
      />
    );
  }

  // iOS: bọc trong Modal với nút Xác nhận / Hủy
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleShow}
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            {title ? <Text style={styles.title}>{title}</Text> : <View style={{ flex: 1 }} />}
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => onConfirm(tempDate)}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>

          {/* Picker */}
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            locale="vi-VN"
            onChange={(_, date) => {
              if (date) setTempDate(date);
            }}
            style={styles.picker}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: "52%",
    maxHeight: "78%",
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerBtn: { minWidth: 64, alignItems: "center" },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  cancelText: { fontSize: 15, color: "#64748b", fontWeight: "500" },
  confirmText: { fontSize: 15, color: "#0891b2", fontWeight: "700" },
  picker: { height: 200 },
});
