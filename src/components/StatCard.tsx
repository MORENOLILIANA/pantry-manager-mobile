import { StyleSheet, Text, View, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "@/config/theme";

type Props = {
  label: string;
  value: string;
  icon?: string;
  highlight?: string;
  onPress?: () => void;
};

export function StatCard({ label, value, icon, highlight, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        highlight === "orange" && styles.cardHighlight,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      {icon ? <MaterialCommunityIcons name={icon as any} size={20} color={highlight === "orange" ? "#F39C12" : colors.primary} /> : null}
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 96,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardHighlight: {
    borderColor: "#F39C12",
    backgroundColor: "#FFF9EF",
  },
  cardPressed: {
    opacity: 0.7,
  },
  label: {
    color: colors.subtext,
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  value: {
    color: colors.text,
    ...typography.h2,
  }
});