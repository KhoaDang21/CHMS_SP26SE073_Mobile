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

interface ExperiencePickerModalProps {
    visible: boolean;
    experiences: Experience[];
    selectedIds?: string[];
    title?: string;
    onConfirm: (selected: Experience[]) => void;
    onCancel: () => void;
    loading?: boolean;
}

const fmt = (n: number) =>
    n.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export function ExperiencePickerModal({
    visible,
    experiences,
    selectedIds = [],
    title = "Chọn Dịch Vụ",
    onConfirm,
    onCancel,
    loading = false,
}: ExperiencePickerModalProps) {
    const [tempSelected, setTempSelected] = useState<Set<string>>(
        new Set(selectedIds),
    );

    const handleToggle = (id: string) => {
        const updated = new Set(tempSelected);
        if (updated.has(id)) {
            updated.delete(id);
        } else {
            updated.add(id);
        }
        setTempSelected(updated);
    };

    const handleConfirm = () => {
        const selected = experiences.filter((e) => tempSelected.has(e.id));
        onConfirm(selected);
    };

    const onShow = () => {
        setTempSelected(new Set(selectedIds));
    };

    const totalPrice = experiences
        .filter((e) => tempSelected.has(e.id))
        .reduce((sum, e) => sum + e.price, 0);

    const renderItem = ({ item }: { item: Experience }) => {
        const isSelected = tempSelected.has(item.id);
        return (
            <TouchableOpacity
                style={[styles.itemContainer, isSelected && styles.itemSelected]}
                onPress={() => handleToggle(item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.itemContent}>
                    <View style={styles.checkboxContainer}>
                        <View
                            style={[
                                styles.checkbox,
                                isSelected && styles.checkboxChecked,
                            ]}
                        >
                            {isSelected && (
                                <MaterialCommunityIcons
                                    name="check"
                                    size={16}
                                    color="#fff"
                                />
                            )}
                        </View>
                    </View>
                    <View style={styles.itemDetails}>
                        <Text style={styles.itemName} numberOfLines={1}>
                            {item.name}
                        </Text>
                        {item.description && (
                            <Text style={styles.itemDesc} numberOfLines={2}>
                                {item.description}
                            </Text>
                        )}
                        {item.category && (
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryText}>{item.category}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.priceContainer}>
                        <Text style={styles.price}>{fmt(item.price)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const content = (
        <View style={styles.content}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <MaterialCommunityIcons
                        name="loading"
                        size={32}
                        color="#0891b2"
                    />
                    <Text style={styles.loadingText}>Đang tải dịch vụ...</Text>
                </View>
            ) : experiences.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons
                        name="inbox-outline"
                        size={48}
                        color="#cbd5e1"
                    />
                    <Text style={styles.emptyText}>Không có dịch vụ nào</Text>
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

    if (Platform.OS === "android") {
        return (
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onShow={onShow}
                onRequestClose={onCancel}
            >
                <Pressable style={styles.overlay} onPress={onCancel}>
                    <Pressable
                        style={styles.androidContainer}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.headerBtn}
                                onPress={onCancel}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <Text style={styles.title}>{title}</Text>
                            <View style={{ width: 64 }} />
                        </View>

                        {/* Content */}
                        {content}

                        {/* Footer */}
                        {!loading && experiences.length > 0 && (
                            <View style={styles.footer}>
                                <View style={styles.totalContainer}>
                                    <Text style={styles.totalLabel}>Tổng cộng:</Text>
                                    <Text style={styles.totalPrice}>{fmt(totalPrice)}</Text>
                                </View>
                                <Button
                                    title={`Xác Nhận (${tempSelected.size})`}
                                    onPress={handleConfirm}
                                    style={styles.confirmBtn}
                                    disabled={tempSelected.size === 0}
                                />
                            </View>
                        )}
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
            onRequestClose={onCancel}
        >
            <Pressable style={styles.overlay} onPress={onCancel}>
                <Pressable
                    style={styles.iosSheet}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.headerBtn}
                            onPress={onCancel}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelText}>Hủy</Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity
                            style={styles.headerBtn}
                            onPress={handleConfirm}
                            activeOpacity={0.7}
                            disabled={tempSelected.size === 0}
                        >
                            <Text
                                style={[
                                    styles.confirmText,
                                    tempSelected.size === 0 && styles.confirmTextDisabled,
                                ]}
                            >
                                Xác Nhận
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    {content}

                    {/* Footer */}
                    {!loading && experiences.length > 0 && (
                        <View style={styles.footerIos}>
                            <View style={styles.totalContainer}>
                                <Text style={styles.totalLabel}>Tổng cộng:</Text>
                                <Text style={styles.totalPrice}>{fmt(totalPrice)}</Text>
                            </View>
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
        flex: 1,
        paddingVertical: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: "#64748b",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        color: "#94a3b8",
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingVertical: 8,
    },
    itemContainer: {
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    itemSelected: {
        backgroundColor: "#ecf9ff",
    },
    itemContent: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    checkboxContainer: {
        paddingTop: 2,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: "#cbd5e1",
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxChecked: {
        backgroundColor: "#0891b2",
        borderColor: "#0891b2",
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0f172a",
    },
    itemDesc: {
        fontSize: 13,
        color: "#64748b",
        marginTop: 5,
        fontWeight: "500",
    },
    categoryBadge: {
        alignSelf: "flex-start",
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: "#e0f2fe",
        borderRadius: 4,
    },
    categoryText: {
        fontSize: 12,
        color: "#0369a1",
        fontWeight: "500",
    },
    priceContainer: {
        alignItems: "flex-end",
        paddingLeft: 8,
    },
    price: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0891b2",
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
    footerIos: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        backgroundColor: "#f8fafc",
    },
    totalContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748b",
    },
    totalPrice: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0891b2",
    },
    confirmBtn: {
        marginTop: 8,
    },
});
