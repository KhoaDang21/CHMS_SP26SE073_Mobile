import React, { useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

let toastQueue: ToastMessage[] = [];
let toastListeners: ((msgs: ToastMessage[]) => void)[] = [];

export const showToast = (
    message: string,
    type: ToastType = "info",
    duration: number = 3000
) => {
    const id = Date.now().toString();
    const newMessage: ToastMessage = { id, message, type, duration };
    toastQueue = [...toastQueue, newMessage];
    notifyListeners();

    if (duration > 0) {
        setTimeout(() => {
            toastQueue = toastQueue.filter((m) => m.id !== id);
            notifyListeners();
        }, duration);
    }
};

const notifyListeners = () => {
    toastListeners.forEach((listener) => listener([...toastQueue]));
};

export const useToastContext = () => {
    const [messages, setMessages] = React.useState<ToastMessage[]>(toastQueue);

    React.useEffect(() => {
        const listener = (msgs: ToastMessage[]) => setMessages(msgs);
        toastListeners.push(listener);
        return () => {
            toastListeners = toastListeners.filter((l) => l !== listener);
        };
    }, []);

    return messages;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    return <ToastContainer>{children}</ToastContainer>;
};

const ToastContainer: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const messages = useToastContext();

    return (
        <View style={styles.container}>
            {children}
            <View style={styles.toastContainer}>
                {messages.map((msg) => (
                    <ToastItem key={msg.id} message={msg} />
                ))}
            </View>
        </View>
    );
};

interface ToastItemProps {
    message: ToastMessage;
}

const ToastItem: React.FC<ToastItemProps> = ({ message }) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const getIconAndColor = (type: ToastType) => {
        const typeMap: {
            [key in ToastType]: { icon: keyof typeof MaterialCommunityIcons.glyphMap; bg: string; textColor: string };
        } = {
            success: { icon: "check-circle", bg: "#dcfce7", textColor: "#15803d" },
            error: { icon: "alert-circle", bg: "#fee2e2", textColor: "#991b1b" },
            info: { icon: "information", bg: "#dbeafe", textColor: "#1e40af" },
            warning: { icon: "alert", bg: "#fef3c7", textColor: "#92400e" },
        };
        return typeMap[type];
    };

    const { icon, bg, textColor } = getIconAndColor(message.type);

    return (
        <Animated.View
            style={[
                styles.toast,
                {
                    opacity,
                    transform: [{ translateY }],
                    backgroundColor: bg,
                },
            ]}
        >
            <MaterialCommunityIcons name={icon} size={20} color={textColor} />
            <Text style={[styles.toastText, { color: textColor }]}>
                {message.message}
            </Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    toastContainer: {
        position: "absolute",
        top: 50,
        left: 16,
        right: 16,
        gap: 8,
    },
    toast: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    toastText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "500",
    },
});
