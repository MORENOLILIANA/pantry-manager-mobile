import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "@/config/theme";

type NotificationType = "expiry" | "shopping" | "recipe";

type Props = {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timeAgo: string;
  read?: boolean;
};

const typeConfig: Record<NotificationType, { icon: string; color: string }> = {
  expiry: {
    icon: "clock-alert",
    color: "#F39C12",
  },
  shopping: {
    icon: "shopping-cart",
    color: colors.primary,
  },
  recipe: {
    icon: "chef-hat",
    color: colors.info,
  },
};

export function NotificationItem({ id, type, title, description, timeAgo, read = false }: Props) {
  const config = typeConfig[type];

  return (
    <View style={[styles.container, !read && styles.containerUnread]}>
      <MaterialCommunityIcons name={config.icon} size={24} color={config.color} style={styles.icon} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.time}>{timeAgo}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerUnread: {
    backgroundColor: "#F0F7F4",
  },
  icon: {
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodySm,
    color: colors.subtext,
    marginBottom: spacing.xs,
  },
  time: {
    ...typography.caption,
    color: colors.subtext,
  },
});
