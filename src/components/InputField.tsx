import React from "react";
import { StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "@/config/theme";

type Props = {
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode | string;
  error?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "decimal-pad" | "phone-pad";
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  containerStyle?: ViewStyle;
  style?: ViewStyle;
};

export function InputField({
  label,
  placeholder,
  icon,
  error,
  value,
  onChangeText,
  onBlur,
  secureTextEntry,
  keyboardType = "default",
  editable = true,
  multiline = false,
  numberOfLines,
  containerStyle,
  style,
}: Props) {
  const hasError = !!error;
  const resolvedContainerStyle = containerStyle || style;

  return (
    <View style={resolvedContainerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, hasError && styles.inputContainerError]}>
        {typeof icon === "string" ? (
          <MaterialCommunityIcons name={icon as any} size={20} color={colors.subtext} style={styles.icon} />
        ) : (
          icon || null
        )}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputContainerError: {
    borderColor: colors.error,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 48,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  inputMultiline: {
    minHeight: 100,
    paddingVertical: spacing.md,
    textAlignVertical: "top",
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
  },
});
