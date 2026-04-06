import React from "react";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface AlertDialogProps {
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmButtonColor?: "primary" | "danger" | "warning";
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
    visible,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    confirmButtonColor = "primary",
}) => {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                    <View style={styles.actions}>
                        {onCancel && (
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={onCancel}
                                activeOpacity={0.6}
                            >
                                <Text style={styles.cancelButtonText}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.button,
                                confirmButtonColor === "danger"
                                    ? styles.dangerButton
                                    : confirmButtonColor === "warning"
                                    ? styles.warningButton
                                    : styles.confirmButton,
                            ]}
                            onPress={onConfirm}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.confirmButtonText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

interface LoadingDialogProps {
    visible: boolean;
    message?: string;
}

export const LoadingDialog: React.FC<LoadingDialogProps> = ({
    visible,
    message = "Đang xử lý...",
}) => {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.loadingDialog}>
                    <View style={styles.loadingSpinner} />
                    <Text style={styles.loadingMessage}>{message}</Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    dialog: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 20,
        minWidth: 280,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: "#64748b",
        lineHeight: 20,
        marginBottom: 20,
    },
    actions: {
        flexDirection: "row",
        gap: 12,
        justifyContent: "flex-end",
    },
    button: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 100,
        justifyContent: "center",
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#f1f5f9",
    },
    confirmButton: {
        backgroundColor: "#0891b2",
    },
    dangerButton: {
        backgroundColor: "#ef4444",
    },
    warningButton: {
        backgroundColor: "#f97316",
    },
    cancelButtonText: {
        color: "#64748b",
        fontWeight: "600",
        fontSize: 14,
    },
    confirmButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
    },
    loadingDialog: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        minWidth: 200,
    },
    loadingSpinner: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 4,
        borderColor: "#e2e8f0",
        borderTopColor: "#0891b2",
    },
    loadingMessage: {
        marginTop: 16,
        color: "#64748b",
        fontSize: 14,
        fontWeight: "500",
    },
});
