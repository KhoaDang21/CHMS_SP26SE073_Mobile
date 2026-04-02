import React from "react";
import { View, TextInput, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface TextInputProps {
    label?: string;
    placeholder?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    error?: string;
    secureTextEntry?: boolean;
    keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
    editable?: boolean;
    style?: ViewStyle;
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
    multiline?: boolean;
    numberOfLines?: number;
}

export const Input: React.FC<TextInputProps> = ({
    label,
    placeholder,
    value,
    onChangeText,
    error,
    secureTextEntry = false,
    keyboardType = "default",
    editable = true,
    style,
    icon,
    multiline = false,
    numberOfLines = 1,
}) => {
    return (
        <View style={[styles.container, style]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View
                style={[
                    styles.inputContainer,
                    error && styles.inputContainerError,
                    !editable && styles.inputContainerDisabled,
                ]}
            >
                {icon && (
                    <MaterialCommunityIcons
                        name={icon}
                        size={20}
                        color="#64748b"
                        style={styles.icon}
                    />
                )}
                <TextInput
                    style={[styles.input, icon && styles.inputWithIcon]}
                    placeholder={placeholder}
                    placeholderTextColor="#cbd5e1"
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    editable={editable}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                />
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        paddingHorizontal: 12,
        minHeight: 48,
    },
    inputContainerError: {
        borderColor: "#ef4444",
        backgroundColor: "#fff5f5",
    },
    inputContainerDisabled: {
        backgroundColor: "#f1f5f9",
        opacity: 0.6,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: "#1e293b",
        paddingVertical: 12,
        fontFamily: "System",
    },
    inputWithIcon: {
        paddingLeft: 0,
    },
    icon: {
        marginRight: 8,
    },
    error: {
        color: "#ef4444",
        fontSize: 12,
        marginTop: 4,
        fontWeight: "500",
    },
});
