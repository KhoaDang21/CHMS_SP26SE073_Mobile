import React from "react";
import {
    View,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
} from "react-native";

interface LoadingIndicatorProps {
    size?: "small" | "large";
    color?: string;
    style?: ViewStyle;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
    size = "large",
    color = "#0891b2",
    style,
}) => {
    return (
        <View style={[styles.container, style]}>
            <ActivityIndicator size={size} color={color} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});
