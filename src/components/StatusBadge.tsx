import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, borderRadius, typography } from "@/config/theme";

type Status = "normal" | "proximo" | "caducado";

type Props = {
  status: Status;
  text?: string;
};

const statusConfig: Record<Status, { bg: string; text: string; label: string }> = {
  normal: {
    bg: "#D5F4E6",
    text: colors.success,
    label: "Normal",
  },
  proximo: {
    bg: "#FFF3E0",
    text: "#F39C12",
    label: "Próximo",
  },
  caducado: {
    bg: "#FADBD8",
    text: colors.error,
    label: "Caducado",
  },
};

export function StatusBadge({ status, text }: Props) {
  const config = statusConfig[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{text || config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: "flex-start",
  },
  text: {
    ...typography.caption,
    fontWeight: "600",
  },
});
