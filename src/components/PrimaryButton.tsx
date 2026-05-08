import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  style?: ViewStyle;
};

export function PrimaryButton({ title, onPress, variant = "primary", style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "secondary" ? styles.secondary : styles.primary,
        pressed && styles.pressed,
        style
      ]}
    >
      <Text style={[styles.label, variant === "secondary" && styles.secondaryLabel]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  primary: {
    backgroundColor: "#4ade80"
  },
  secondary: {
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#111827"
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }]
  },
  label: {
    color: "#052e16",
    fontSize: 16,
    fontWeight: "700"
  },
  secondaryLabel: {
    color: "#f9fafb"
  }
});