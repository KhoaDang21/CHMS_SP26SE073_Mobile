import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";

interface InputProps {
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
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  rightIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
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
  autoCapitalize = "none",
  rightIcon,
  onRightIconPress,
}) => {
  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputContainer,
          error ? styles.inputContainerError : null,
          !editable ? styles.inputContainerDisabled : null,
        ]}
      >
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color="#64748b"
            style={styles.leftIcon}
          />
        ) : null}
        <TextInput
          style={[styles.input, multiline ? styles.inputMultiline : null]}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete="off"
        />
        {rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} activeOpacity={0.7} style={styles.rightIconBtn}>
            <MaterialCommunityIcons name={rightIcon} size={20} color="#64748b" />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputContainerError: {
    borderColor: "#ef4444",
    backgroundColor: "#fff5f5",
  },
  inputContainerDisabled: {
    backgroundColor: "#f1f5f9",
    opacity: 0.6,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIconBtn: {
    padding: 4,
    marginLeft: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1e293b",
    paddingVertical: 12,
  },
  inputMultiline: {
    paddingTop: 12,
    textAlignVertical: "top",
  },
  error: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
});
