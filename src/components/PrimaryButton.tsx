import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, spacing, borderRadius, typography } from "@/config/theme";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  style?: ViewStyle;
};

export function PrimaryButton({ title, onPress, variant = "primary", style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "secondary" ? styles.secondary : variant === "danger" ? styles.danger : styles.primary,
        pressed && styles.pressed,
        style
      ]}
    >
      <Text style={[styles.label, variant === "secondary" && styles.secondaryLabel, variant === "danger" && styles.dangerLabel]}>{title}</Text>
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