import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    ViewStyle,
} from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  gradient?: boolean;
}

const SIZE_STYLES: Record<
  NonNullable<ButtonProps["size"]>,
  ViewStyle
> = {
  small: { paddingVertical: 8, paddingHorizontal: 14 },
  medium: { paddingVertical: 12, paddingHorizontal: 18 },
  large: { paddingVertical: 15, paddingHorizontal: 20 },
};

const VARIANT_STYLES: Record<
  NonNullable<ButtonProps["variant"]>,
  ViewStyle
> = {
  primary: { backgroundColor: "#0891b2" },
  secondary: {
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#0891b2",
  },
  danger: { backgroundColor: "#ef4444" },
  ghost: { backgroundColor: "transparent" },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#0891b2",
  },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  style,
  gradient = false,
}) => {
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    SIZE_STYLES[size],
    isDisabled ? styles.disabled : null,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`textSize_${size}` as keyof typeof styles],
    styles[`textVariant_${variant}` as keyof typeof styles],
  ];

  const indicatorColor =
    variant === "secondary" || variant === "ghost" || variant === "outline"
      ? "#0891b2"
      : "#fff";

  if (variant === "primary" && gradient) {
    return (
      <TouchableOpacity
        style={[styles.base, isDisabled ? styles.disabled : null, style, { overflow: "hidden" }]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#2563eb", "#0891b2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientInner, SIZE_STYLES[size]]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.text, styles[`textSize_${size}` as keyof typeof styles], styles.textVariant_primary]}>
              {title}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[containerStyle, VARIANT_STYLES[variant]]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  gradientInner: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  // Sizes
  size_small: { paddingVertical: 8, paddingHorizontal: 14 },
  size_medium: { paddingVertical: 12, paddingHorizontal: 18 },
  size_large: { paddingVertical: 15, paddingHorizontal: 20 },

  // Variants
  variant_primary: { backgroundColor: "#0891b2" },
  variant_secondary: { backgroundColor: "#e0f2fe", borderWidth: 1, borderColor: "#0891b2" },
  variant_danger: { backgroundColor: "#ef4444" },
  variant_ghost: { backgroundColor: "transparent" },
  variant_outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "#0891b2" },

  disabled: { opacity: 0.5 },

  // Text base
  text: { fontWeight: "600", textAlign: "center" },

  // Text sizes
  textSize_small: { fontSize: 13 },
  textSize_medium: { fontSize: 15 },
  textSize_large: { fontSize: 16 },

  // Text variants
  textVariant_primary: { color: "#fff" },
  textVariant_secondary: { color: "#0891b2" },
  textVariant_danger: { color: "#fff" },
  textVariant_ghost: { color: "#0891b2" },
  textVariant_outline: { color: "#0891b2" },
});
