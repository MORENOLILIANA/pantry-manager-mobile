import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, spacing, borderRadius, typography } from "@/config/theme";

type Props = {
  title?: string;
  label?: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({ title, label, onPress, variant = "primary", loading = false, disabled = false, style }: Props) {
  const text = title ?? label ?? "";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === "secondary" ? styles.secondary : variant === "danger" ? styles.danger : styles.primary,
        pressed && !disabled && !loading && styles.pressed,
        (disabled || loading) && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.text : colors.white} />
      ) : (
        <Text style={[styles.label, variant === "secondary" && styles.secondaryLabel, variant === "danger" && styles.dangerLabel]}>{text}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary
  },
  danger: {
    backgroundColor: colors.error
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }]
  },
  disabled: {
    opacity: 0.55
  },
  label: {
    ...typography.body,
    color: colors.white,
    fontWeight: "700"
  },
  secondaryLabel: {
    color: colors.text
  },
  dangerLabel: {
    color: colors.white
  }
});