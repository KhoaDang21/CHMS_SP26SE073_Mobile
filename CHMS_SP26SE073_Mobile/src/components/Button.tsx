import React from "react";
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from "react-native";

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "small" | "medium" | "large";
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = "primary",
    size = "medium",
    loading = false,
    disabled = false,
    style,
}) => {
    const containerStyle = [
        styles.container,
        styles[`container_${variant}`],
        styles[`container_${size}`],
        disabled && styles.disabled,
        style,
    ];

    const textStyle = [
        styles.text,
        styles[`text_${variant}`],
        styles[`text_${size}`],
    ];

    return (
        <TouchableOpacity
            style={containerStyle}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={variant === "ghost" ? "#0891b2" : "#fff"} />
            ) : (
                <Text style={textStyle}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
    },
    container_primary: {
        backgroundColor: "#0891b2",
    },
    container_secondary: {
        backgroundColor: "#e0f2fe",
        borderWidth: 1,
        borderColor: "#0891b2",
    },
    container_danger: {
        backgroundColor: "#ef4444",
    },
    container_ghost: {
        backgroundColor: "transparent",
    },
    container_small: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    container_medium: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    container_large: {
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        fontWeight: "600",
        textAlign: "center",
    },
    text_primary: {
        color: "#fff",
        fontSize: 16,
    },
    text_secondary: {
        color: "#0891b2",
        fontSize: 16,
    },
    text_danger: {
        color: "#fff",
        fontSize: 16,
    },
    text_ghost: {
        color: "#0891b2",
        fontSize: 16,
    },
    text_small: {
        fontSize: 13,
    },
    text_medium: {
        fontSize: 16,
    },
    text_large: {
        fontSize: 18,
    },
});
