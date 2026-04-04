import {
    Button,
    Card,
    Header,
    LoadingIndicator
} from "@/components";
import { notificationService, type NotificationPreferences } from "@/service/notification/notificationService";
import { logger } from "@/utils/logger";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationPreferencesScreen() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        emailNotif: true,
        pushNotif: true,
        smsNotif: false,
    });

    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const data = await notificationService.getPreferences();
                setPreferences(data);
            } catch (error) {
                showToast("Không thể tải cài đặt thông báo", "error");

            } finally {
                setLoading(false);
            }
        };

        loadPreferences();
    }, []);

    const handleToggle = (key: keyof NotificationPreferences) => {
        setPreferences((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handleSave = useCallback(async () => {
        try {
            setSaving(true);
            await notificationService.updatePreferences(preferences);
            showToast("Cập nhật cài đặt thành công", "success");
        } catch (error) {
            showToast("Không thể cập nhật cài đặt", "error");

        } finally {
            setSaving(false);
        }
    }, [preferences]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header showBack title="Cài Đặt Thông Báo" />
                <LoadingIndicator />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header showBack title="Cài Đặt Thông Báo" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Card style={styles.preferenceCard}>
                    <View style={styles.preferenceHeader}>
                        <View style={styles.preferenceInfo}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons
                                    name="bell-outline"
                                    size={24}
                                    color="#0891b2"
                                />
                            </View>
                            <View style={styles.textContent}>
                                <Text style={styles.preferenceTitle}>Thông Báo Đẩy</Text>
                                <Text style={styles.preferenceDesc}>
                                    Nhận thông báo trên điện thoại
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={preferences.pushNotif}
                            onValueChange={() => handleToggle("pushNotif")}
                            trackColor={{ false: "#cbd5e1", true: "#86efac" }}
                            thumbColor={preferences.pushNotif ? "#22c55e" : "#f1f5f9"}
                        />
                    </View>
                </Card>

                <Card style={styles.preferenceCard}>
                    <View style={styles.preferenceHeader}>
                        <View style={styles.preferenceInfo}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons
                                    name="email-outline"
                                    size={24}
                                    color="#2563eb"
                                />
                            </View>
                            <View style={styles.textContent}>
                                <Text style={styles.preferenceTitle}>Thông Báo Email</Text>
                                <Text style={styles.preferenceDesc}>
                                    Nhận email về đặt phòng và thanh toán
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={preferences.emailNotif}
                            onValueChange={() => handleToggle("emailNotif")}
                            trackColor={{ false: "#cbd5e1", true: "#86efac" }}
                            thumbColor={preferences.emailNotif ? "#22c55e" : "#f1f5f9"}
                        />
                    </View>
                </Card>

                <Card style={styles.preferenceCard}>
                    <View style={styles.preferenceHeader}>
                        <View style={styles.preferenceInfo}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons
                                    name="message-text-outline"
                                    size={24}
                                    color="#f59e0b"
                                />
                            </View>
                            <View style={styles.textContent}>
                                <Text style={styles.preferenceTitle}>Thông Báo SMS</Text>
                                <Text style={styles.preferenceDesc}>
                                    Nhận tin nhắn về lịch đặt phòng
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={preferences.smsNotif}
                            onValueChange={() => handleToggle("smsNotif")}
                            trackColor={{ false: "#cbd5e1", true: "#86efac" }}
                            thumbColor={preferences.smsNotif ? "#22c55e" : "#f1f5f9"}
                        />
                    </View>
                </Card>

                <View style={styles.infoBox}>
                    <MaterialCommunityIcons
                        name="information-outline"
                        size={20}
                        color="#0369a1"
                    />
                    <Text style={styles.infoText}>
                        Bạn có thể thay đổi cài đặt này bất cứ lúc nào. Các tùy chọn đồng bộ với trang khách trên web.
                    </Text>
                </View>

                <View style={styles.actionButtons}>
                    <Button
                        title="Lưu Cài Đặt"
                        onPress={handleSave}
                        loading={saving}
                    />
                </View>
            </ScrollView>
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
        paddingBottom: 40,
    },
    preferenceCard: {
        marginBottom: 12,
        padding: 16,
    },
    preferenceHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    preferenceInfo: {
        flex: 1,
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: "#f8fafc",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 2,
    },
    textContent: {
        flex: 1,
        marginRight: 12,
    },
    preferenceTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: 4,
    },
    preferenceDesc: {
        fontSize: 13,
        color: "#64748b",
        lineHeight: 18,
    },
    infoBox: {
        flexDirection: "row",
        gap: 12,
        padding: 12,
        marginVertical: 20,
        backgroundColor: "#dbeafe",
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#2563eb",
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: "#1e40af",
        lineHeight: 18,
    },
    actionButtons: {
        marginTop: 12,
    },
});
