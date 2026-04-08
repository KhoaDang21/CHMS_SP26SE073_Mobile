import { Button } from "./Button";
import { Input } from "./Input";
import { Divider } from "./Header";
import type { Promotion } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export interface ValidatedCoupon {
    isValid: boolean;
    name?: string;
    description?: string;
    discountType?: "PERCENTAGE" | "FIXED";
    discountValue?: number;
    message?: string;
}

interface CouponInputModalProps {
    visible: boolean;
    couponCode: string;
    onCodeChange: (code: string) => void;
    onValidate: (code: string) => Promise<boolean>;
    validatedPromotion?: ValidatedCoupon | null;
    discountAmount?: number;
    isValidating?: boolean;
    onClear: () => void;
    onClose: () => void;
}

const fmt = (n: number) =>
    n.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export function CouponInputModal({
    visible,
    couponCode,
    onCodeChange,
    onValidate,
    validatedPromotion,
    discountAmount,
    isValidating = false,
    onClear,
    onClose,
}: CouponInputModalProps) {
    const [tempCode, setTempCode] = useState(couponCode);
    const [validating, setValidating] = useState(false);
    const [error, setError] = useState<string>("");

    const handleValidate = async () => {
        if (!tempCode.trim()) {
            setError("Vui lòng nhập mã giảm giá");
            return;
        }
        try {
            setValidating(true);
            setError("");
            const isValid = await onValidate(tempCode.trim().toUpperCase());
            if (isValid) {
                onClose();
            } else {
                setError("Mã giảm giá không hợp lệ hoặc hết hạn");
            }
        } catch (e) {
            setError("Lỗi khi kiểm tra mã giảm giá");
        } finally {
            setValidating(false);
        }
    };

    const handleClear = () => {
        setTempCode("");
        setError("");
        onClear();
    };

    const onShow = () => {
        setTempCode(couponCode);
        setError("");
    };

    const content = (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.inputSection}>
                <Input
                    label="Mã giảm giá"
                    placeholder="Nhập mã giảm giá (VD: SUMMER20)"
                    value={tempCode}
                    onChangeText={setTempCode}
                    icon="tag-outline"
                    editable={!validating && !validatedPromotion}
                    autoCapitalize="characters"
                />
                {error && (
                    <View style={styles.errorBox}>
                        <MaterialCommunityIcons name="alert-circle" size={16} color="#ef4444" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}
            </View>

            {validatedPromotion ? (
                <>
                    <Divider style={{ marginVertical: 14 }} />
                    <View style={styles.promoBox}>
                        <View style={styles.promoHeader}>
                            <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
                            <Text style={styles.promoTitle}>{validatedPromotion.name}</Text>
                        </View>
                        {validatedPromotion.description && (
                            <Text style={styles.promoDesc}>{validatedPromotion.description}</Text>
                        )}

                        <View style={styles.promoBenefits}>
                            <View style={styles.benefitRow}>
                                <Text style={styles.benefitLabel}>Loại khuyến mãi</Text>
                                <Text style={styles.benefitValue}>
                                    {validatedPromotion.discountType === "PERCENTAGE"
                                        ? `${validatedPromotion.discountValue || 0}%`
                                        : fmt(validatedPromotion.discountValue || 0)}
                                </Text>
                            </View>
                            {discountAmount !== undefined && (
                                <>
                                    <Divider style={{ marginVertical: 8 }} />
                                    <View style={styles.benefitRow}>
                                        <Text style={styles.benefitLabel}>Giảm giá</Text>
                                        <Text style={[styles.benefitValue, { color: "#10b981", fontWeight: "700" }]}>
                                            -{fmt(discountAmount)}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </>
            ) : null}
        </ScrollView>
    );

    if (Platform.OS === "android") {
        return (
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onShow={onShow}
                onRequestClose={onClose}
            >
                <Pressable style={styles.overlay} onPress={onClose}>
                    <Pressable style={styles.androidContainer} onPress={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.headerBtn} onPress={onClose} activeOpacity={0.7}>
                                <Text style={styles.cancelText}>Đóng</Text>
                            </TouchableOpacity>
                            <Text style={styles.title}>Mã giảm giá</Text>
                            <View style={{ width: 64 }} />
                        </View>

                        {/* Content */}
                        {content}

                        {/* Footer */}
                        <View style={styles.footer}>
                            {validatedPromotion ? (
                                <>
                                    <Button
                                        title="Xóa mã"
                                        onPress={handleClear}
                                        style={styles.clearBtn}
                                    />
                                    <Button
                                        title="Xác nhận"
                                        onPress={onClose}
                                        style={styles.confirmBtn}
                                    />
                                </>
                            ) : (
                                <>
                                    <Button
                                        title={validating ? "Đang kiểm tra..." : "Kiểm tra mã"}
                                        onPress={handleValidate}
                                        loading={validating}
                                        disabled={!tempCode.trim() || validating}
                                    />
                                </>
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    }

    // iOS
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onShow={onShow}
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.iosSheet} onPress={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.headerBtn} onPress={onClose} activeOpacity={0.7}>
                            <Text style={styles.cancelText}>Đóng</Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>Mã giảm giá</Text>
                        {validatedPromotion && (
                            <TouchableOpacity style={styles.headerBtn} onPress={onClose} activeOpacity={0.7}>
                                <Text style={styles.confirmText}>Xong</Text>
                            </TouchableOpacity>
                        )}
                        {!validatedPromotion && (
                            <TouchableOpacity
                                style={styles.headerBtn}
                                onPress={handleValidate}
                                activeOpacity={0.7}
                                disabled={!tempCode.trim() || validating}
                            >
                                <Text style={[styles.confirmText, (!tempCode.trim() || validating) && styles.confirmTextDisabled]}>
                                    Kiểm tra
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Content */}
                    {content}

                    {/* Footer */}
                    {validatedPromotion && (
                        <View style={styles.footerIos}>
                            <Button title="Xóa mã" onPress={handleClear} style={styles.clearBtn} />
                        </View>
                    )}
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
    androidContainer: {
        backgroundColor: "#fff",
        minHeight: "82%",
        maxHeight: "96%",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: "hidden",
        elevation: 10,
    },
    iosSheet: {
        backgroundColor: "#fff",
        minHeight: "82%",
        maxHeight: "96%",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        backgroundColor: "#f8fafc",
    },
    headerBtn: {
        minWidth: 64,
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    title: {
        flex: 1,
        textAlign: "center",
        fontSize: 16,
        fontWeight: "800",
        color: "#0f172a",
    },
    cancelText: {
        fontSize: 14,
        color: "#64748b",
        fontWeight: "600",
    },
    confirmText: {
        fontSize: 14,
        color: "#0891b2",
        fontWeight: "700",
    },
    confirmTextDisabled: {
        color: "#cbd5e1",
    },
    content: {
        paddingVertical: 20,
        paddingHorizontal: 20,
        paddingBottom: 28,
    },
    inputSection: {
        gap: 14,
    },
    errorBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#fecaca",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#ef4444",
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        color: "#991b1b",
        fontWeight: "600",
    },
    promoBox: {
        backgroundColor: "#f0fdf4",
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "#bbf7d0",
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginTop: 12,
    },
    promoHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
    },
    promoTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#059669",
        flex: 1,
    },
    promoDesc: {
        fontSize: 13,
        color: "#047857",
        fontWeight: "500",
        marginBottom: 12,
        lineHeight: 20,
    },
    promoBenefits: {
        gap: 10,
    },
    benefitRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
    },
    benefitLabel: {
        fontSize: 13,
        color: "#059669",
        fontWeight: "600",
    },
    benefitValue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#047857",
    },
    footer: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        backgroundColor: "#f8fafc",
    },
    clearBtn: {
        flex: 1,
    },
    confirmBtn: {
        flex: 1,
    },
    footerIos: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        backgroundColor: "#f8fafc",
    },
});
