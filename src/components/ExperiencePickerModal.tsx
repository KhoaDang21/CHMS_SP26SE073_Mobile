import { Button } from "./Button";
import type { Experience } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
    FlatList,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useState } from "react";

export interface SelectedExperience {
    item: Experience;
    qty: number;
}

interface ExperiencePickerModalProps {
    visible: boolean;
    experiences: Experience[];
    selected?: SelectedExperience[];
    title?: string;
    onConfirm: (selected: SelectedExperience[]) => void;
    onCancel: () => void;
    loading?: boolean;
}

const fmt = (n: number) =>
    n.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export function ExperiencePickerModal({
    visible,
    experiences,
    selected = [],
    title = "Dịch vụ địa phương",
    onConfirm,
    onCancel,
    loading = false,
}: ExperiencePickerModalProps) {
    const [tempQtys, setTempQtys] = useState<Record<string, number>>(() => {
        const map: Record<string, number> = {};
        selected.forEach((s) => { map[s.item.id] = s.qty; });
        return map;
    });

    const onShow = () => {
        const map: Record<string, number> = {};
        selected.forEach((s) => { map[s.item.id] = s.qty; });
        setTempQtys(map);
    };

    const handleToggle = (id: string) => {
        setTempQtys((prev) => {
            if (prev[id]) {
                const next = { ...prev };
                delete next[id];
                return next;
            }
            return { ...prev, [id]: 1 };
        });
    };

    const handleQtyChange = (id: string, delta: number) => {
        setTempQtys((prev) => {
            const current = prev[id] ?? 0;
            const next = current + delta;
            if (next <= 0) {
                const updated = { ...prev };
                delete updated[id];
                return updated;
            }
            return { ...prev, [id]: Math.min(next, 20) };
        });
    };

    const handleConfirm = () => {
        const result: SelectedExperience[] = Object.entries(tempQtys)
            .map(([id, qty]) => {
                const exp = experiences.find((e) => e.id === id);
                return exp ? { item: exp, qty } : null;
            })
            .filter((x): x is SelectedExperience => x !== null);
        onConfirm(result);
    };

    const totalPrice = Object.entries(tempQtys).reduce((sum, [id, qty]) => {
        const exp = experiences.find((e) => e.id === id);
        return sum + (exp ? exp.price * qty : 0);
    }, 0);

    const selectedCount = Object.keys(tempQtys).length;

    const renderItem = ({ item }: { item: Experience }) => {
        const qty = tempQtys[item.id] ?? 0;
        const isSelected = qty > 0;

        return (
            <View style={[styles.itemContainer, isSelected && styles.itemSelected]}>
                <View style={styles.itemRow}>
                    {/* Checkbox */}
                    <TouchableOpacity
                        style={styles.checkboxWrap}
                        onPress={() => handleToggle(item.id)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                            {isSelected && (
                                <MaterialCommunityIcons name="check" size={14} color="#fff" />
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* Info */}
                    <TouchableOpacity
                        style={styles.itemInfo}
                        onPress={() => handleToggle(item.id)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.itemMeta}>
                            {item.category ? `${item.category} · ` : ""}
                            <Text style={styles.itemPrice}>{fmt(item.price)}</Text>
                            <Text style={styles.itemUnit}>/người</Text>
                        </Text>
                        {item.description ? (
                            <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
                        ) : null}
                    </TouchableOpacity>

                    {/* Qty picker — chỉ hiện khi đã chọn */}
                    {isSelected && (
                        <View style={styles.qtyRow}>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => handleQtyChange(item.id, -1)}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="minus" size={16} color="#0891b2" />
                            </TouchableOpacity>
                            <View style={styles.qtyDisplay}>
                                <Text style={styles.qtyText}>{qty}</Text>
                                <Text style={styles.qtyLabel}>người</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.qtyBtn, qty >= 20 && styles.qtyBtnDisabled]}
                                onPress={() => handleQtyChange(item.id, 1)}
                                disabled={qty >= 20}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons
                                    name="plus"
                                    size={16}
                                    color={qty >= 20 ? "#cbd5e1" : "#0891b2"}
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Subtotal khi đã chọn */}
                {isSelected && (
                    <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>{qty} người × {fmt(item.price)}</Text>
                        <Text style={styles.subtotalPrice}>{fmt(item.price * qty)}</Text>
                    </View>
                )}
            </View>
        );
    };

    const content = (
        <View style={styles.content}>
            {loading ? (
                <View style={styles.centerBox}>
                    <MaterialCommunityIcons name="loading" size={32} color="#0891b2" />
                    <Text style={styles.centerText}>Đang tải dịch vụ...</Text>
                </View>
            ) : experiences.length === 0 ? (
                <View style={styles.centerBox}>
                    <MaterialCommunityIcons name="inbox-outline" size={48} color="#cbd5e1" />
                    <Text style={styles.centerText}>Không có dịch vụ nào</Text>
                </View>
            ) : (
                <FlatList
                    data={experiences}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled
                    nestedScrollEnabled
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );

    const footer = !loading && experiences.length > 0 ? (
        <View style={styles.footer}>
            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                    {selectedCount > 0 ? `${selectedCount} dịch vụ đã chọn` : "Chưa chọn dịch vụ"}
                </Text>
                <Text style={styles.totalPrice}>{totalPrice > 0 ? fmt(totalPrice) : "—"}</Text>
            </View>
            <Button
                title={selectedCount > 0 ? `Xác nhận (${selectedCount})` : "Bỏ qua"}
                onPress={handleConfirm}
                style={styles.confirmBtn}
            />
        </View>
    ) : null;

    const sheetStyle = Platform.OS === "android" ? styles.androidSheet : styles.iosSheet;

    return (
        <Modal
            visible={visible}
            transparent
            animationType={Platform.OS === "ios" ? "slide" : "fade"}
            onShow={onShow}
            onRequestClose={onCancel}
        >
            <Pressable style={styles.overlay} onPress={onCancel}>
                <Pressable style={sheetStyle} onPress={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.headerBtn} onPress={onCancel} activeOpacity={0.7}>
                            <Text style={styles.cancelText}>Hủy</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{title}</Text>
                        <TouchableOpacity
                            style={styles.headerBtn}
                            onPress={handleConfirm}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.doneText, selectedCount === 0 && styles.doneTextMuted]}>
                                Xong
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Hint */}
                    <View style={styles.hintBox}>
                        <MaterialCommunityIcons name="information-outline" size={14} color="#0891b2" />
                        <Text style={styles.hintText}>
                            Tích chọn dịch vụ, sau đó chọn số người tham gia để tính giá
                        </Text>
                    </View>

                    {content}
                    {footer}
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
    androidSheet: {
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
    headerBtn: { minWidth: 56, alignItems: "center", paddingVertical: 4 },
    headerTitle: {
        flex: 1,
        textAlign: "center",
        fontSize: 16,
        fontWeight: "800",
        color: "#0f172a",
    },
    cancelText: { fontSize: 14, color: "#64748b", fontWeight: "600" },
    doneText: { fontSize: 14, color: "#0891b2", fontWeight: "700" },
    doneTextMuted: { color: "#94a3b8" },

    hintBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#e0f2fe",
        borderBottomWidth: 1,
        borderBottomColor: "#bae6fd",
    },
    hintText: { flex: 1, fontSize: 12, color: "#0369a1", lineHeight: 17 },

    content: { flex: 1 },
    centerBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingVertical: 40 },
    centerText: { fontSize: 14, color: "#94a3b8" },

    list: { flex: 1 },
    listContent: { paddingVertical: 4 },

    itemContainer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    itemSelected: { backgroundColor: "#f0f9ff" },
    itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

    checkboxWrap: { paddingTop: 2 },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#cbd5e1",
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxChecked: { backgroundColor: "#0891b2", borderColor: "#0891b2" },

    itemInfo: { flex: 1 },
    itemName: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 3 },
    itemMeta: { fontSize: 13, color: "#64748b" },
    itemPrice: { fontSize: 13, fontWeight: "700", color: "#0891b2" },
    itemUnit: { fontSize: 12, color: "#94a3b8" },
    itemDesc: { fontSize: 12, color: "#94a3b8", marginTop: 4, lineHeight: 17 },

    qtyRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#cffafe",
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: "#e0f2fe",
        justifyContent: "center",
        alignItems: "center",
    },
    qtyBtnDisabled: { backgroundColor: "#f1f5f9" },
    qtyDisplay: { alignItems: "center", minWidth: 32 },
    qtyText: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
    qtyLabel: { fontSize: 10, color: "#64748b", fontWeight: "500" },

    subtotalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#e0f2fe",
    },
    subtotalLabel: { fontSize: 12, color: "#0369a1", fontWeight: "500" },
    subtotalPrice: { fontSize: 13, fontWeight: "700", color: "#0891b2" },

    footer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        backgroundColor: "#f8fafc",
        gap: 10,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: { fontSize: 13, color: "#64748b", fontWeight: "600" },
    totalPrice: { fontSize: 16, fontWeight: "800", color: "#0891b2" },
    confirmBtn: {},
});
