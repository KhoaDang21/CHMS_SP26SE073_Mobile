import React from "react";
import {
    Modal,
    View,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BottomSheetProps {
    visible: boolean;
    onDismiss: () => void;
    children: React.ReactNode;
    snapPoints?: number[];
    fullScreen?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
    visible,
    onDismiss,
    children,
    snapPoints: _snapPoints = [200, 400],
    fullScreen = false,
}) => {
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onDismiss}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onDismiss}
            >
                <View
                    style={[
                        styles.sheet,
                        fullScreen ? styles.sheetFull : styles.sheetNormal,
                        { paddingBottom: insets.bottom + 12 },
                    ]}
                >
                    <View style={styles.handle} />
                    <TouchableOpacity
                        activeOpacity={1}
                        style={styles.content}
                        onPress={() => { }}
                    >
                        {children}
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 12,
    },
    sheetNormal: { maxHeight: "86%" },
    sheetFull: { minHeight: "88%", maxHeight: "96%" },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: "#cbd5e1",
        borderRadius: 2,
        alignSelf: "center",
    },
    content: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
});
