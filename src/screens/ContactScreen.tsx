import {
    Button,
    Header,
    Input,
} from "@/components";
import { apiClient } from "@/service/api/apiClient";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ContactScreen() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const handleSendMessage = useCallback(async () => {
        if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
            showToast("Vui lòng điền đầy đủ thông tin", "warning");
            return;
        }

        try {
            setSending(true);
            const res = await apiClient.post("/api/contact", {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                subject: subject.trim(),
                message: message.trim(),
            });

            if ((res as any)?.success ?? true) {
                showToast("Gửi liên hệ thành công. Chúng tôi sẽ liên hệ bạn sớm!", "success");
                setName("");
                setEmail("");
                setPhone("");
                setSubject("");
                setMessage("");
            } else {
                showToast((res as any)?.message || "Không thể gửi liên hệ", "error");
            }
        } catch (error: any) {
            showToast(error?.message || "Gửi liên hệ thất bại", "error");
            logger.error("Failed to send contact", error);
        } finally {
            setSending(false);
        }
    }, [name, email, phone, subject, message]);

    const openPhone = () => {
        Linking.openURL("tel:+84123456789");
    };

    const openEmail = () => {
        Linking.openURL("mailto:support@chms.com");
    };

    const openMap = () => {
        Linking.openURL("https://maps.google.com/?q=CHMS+Vietnam");
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header showBack title="Liên Hệ Chúng Tôi" />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Contact Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thông Tin Liên Hệ</Text>

                        <TouchableOpacity
                            style={styles.contactCard}
                            onPress={openPhone}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBox, styles.phoneIcon]}>
                                <MaterialCommunityIcons
                                    name="phone-outline"
                                    size={24}
                                    color="#fff"
                                />
                            </View>
                            <View style={styles.contactContent}>
                                <Text style={styles.contactLabel}>Gọi Chúng Tôi</Text>
                                <Text style={styles.contactValue}>+84 (0)123 456 789</Text>
                            </View>
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={24}
                                color="#cbd5e1"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.contactCard}
                            onPress={openEmail}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBox, styles.emailIcon]}>
                                <MaterialCommunityIcons
                                    name="email-outline"
                                    size={24}
                                    color="#fff"
                                />
                            </View>
                            <View style={styles.contactContent}>
                                <Text style={styles.contactLabel}>Email</Text>
                                <Text style={styles.contactValue}>support@chms.com</Text>
                            </View>
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={24}
                                color="#cbd5e1"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.contactCard}
                            onPress={openMap}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBox, styles.locationIcon]}>
                                <MaterialCommunityIcons
                                    name="map-marker-outline"
                                    size={24}
                                    color="#fff"
                                />
                            </View>
                            <View style={styles.contactContent}>
                                <Text style={styles.contactLabel}>Địa Chỉ</Text>
                                <Text style={styles.contactValue}>
                                    123 Nguyễn Huệ, Q. 1, TP.HCM, Việt Nam
                                </Text>
                            </View>
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={24}
                                color="#cbd5e1"
                            />
                        </TouchableOpacity>

                        <View style={styles.hoursBox}>
                            <MaterialCommunityIcons
                                name="clock-outline"
                                size={20}
                                color="#0891b2"
                            />
                            <View style={styles.hoursContent}>
                                <Text style={styles.hoursTitle}>Giờ Làm Việc</Text>
                                <Text style={styles.hoursText}>Thứ 2 - Thứ 6: 08:00 - 17:00</Text>
                                <Text style={styles.hoursText}>Thứ 7 - Chủ Nhật: 09:00 - 16:00</Text>
                            </View>
                        </View>
                    </View>

                    {/* Contact Form */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Gửi Tin Nhắn</Text>

                        <Input
                            label="Họ Tên"
                            placeholder="Nhập họ tên của bạn"
                            value={name}
                            onChangeText={setName}
                            editable={!sending}
                        />

                        <Input
                            label="Email"
                            placeholder="Nhập email của bạn"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            editable={!sending}
                        />

                        <Input
                            label="Số Điện Thoại (Tùy Chọn)"
                            placeholder="Nhập số điện thoại"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            editable={!sending}
                        />

                        <Input
                            label="Tiêu Đề"
                            placeholder="Nhập tiêu đề vấn đề"
                            value={subject}
                            onChangeText={setSubject}
                            editable={!sending}
                        />

                        <Input
                            label="Nội Dung"
                            placeholder="Mô tả chi tiết vấn đề của bạn"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            numberOfLines={4}
                            editable={!sending}
                        />

                        <Button
                            title="Gửi Tin Nhắn"
                            onPress={handleSendMessage}
                            loading={sending}
                        />
                    </View>

                    {/* FAQ Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Câu Hỏi Thường Gặp</Text>

                        <View style={styles.faqItem}>
                            <View style={styles.faqHeader}>
                                <MaterialCommunityIcons
                                    name="help-circle-outline"
                                    size={20}
                                    color="#0891b2"
                                />
                                <Text style={styles.faqQuestion}>
                                    Làm cách nào để đặt một căn nhà?
                                </Text>
                            </View>
                            <Text style={styles.faqAnswer}>
                                Truy cập trang chủ, tìm kiếm căn nhà bạn muốn, chọn ngày ở và
                                hoàn tất quá trình thanh toán.
                            </Text>
                        </View>

                        <View style={styles.faqItem}>
                            <View style={styles.faqHeader}>
                                <MaterialCommunityIcons
                                    name="help-circle-outline"
                                    size={20}
                                    color="#0891b2"
                                />
                                <Text style={styles.faqQuestion}>
                                    Chính sách hủy như thế nào?
                                </Text>
                            </View>
                            <Text style={styles.faqAnswer}>
                                Bạn có thể hủy miễn phí tối đa 48 giờ trước khi nhận phòng. Sau
                                đó sẽ mất 50% số tiền đặt.
                            </Text>
                        </View>

                        <View style={styles.faqItem}>
                            <View style={styles.faqHeader}>
                                <MaterialCommunityIcons
                                    name="help-circle-outline"
                                    size={20}
                                    color="#0891b2"
                                />
                                <Text style={styles.faqQuestion}>
                                    Tôi có được hoàn tiền không?
                                </Text>
                            </View>
                            <Text style={styles.faqAnswer}>
                                Hoàn tiền sẽ được xử lý trong vòng 5-7 ngày làm việc sau khi hủy
                                đơn đặt phòng.
                            </Text>
                        </View>
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
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 16,
    },
    contactCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
        borderRadius: 8,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    phoneIcon: {
        backgroundColor: "#22c55e",
    },
    emailIcon: {
        backgroundColor: "#2563eb",
    },
    locationIcon: {
        backgroundColor: "#f59e0b",
    },
    contactContent: {
        flex: 1,
    },
    contactLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748b",
        marginBottom: 2,
    },
    contactValue: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1e293b",
    },
    hoursBox: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
        borderRadius: 8,
        backgroundColor: "#f0f9ff",
        borderWidth: 1,
        borderColor: "#bae6fd",
    },
    hoursContent: {
        flex: 1,
    },
    hoursTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: "#0369a1",
        marginBottom: 4,
    },
    hoursText: {
        fontSize: 12,
        color: "#0c4a6e",
        fontWeight: "500",
        marginBottom: 2,
    },
    faqItem: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 12,
        borderRadius: 8,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    faqHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    faqQuestion: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1e293b",
        flex: 1,
    },
    faqAnswer: {
        fontSize: 12,
        color: "#64748b",
        lineHeight: 18,
    },
});
