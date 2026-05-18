import { Pressable, StyleSheet, Text, View } from "react-native";
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
  onPress?: (id: string) => void;
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

export function NotificationItem({ id, type, title, description, timeAgo, read = false, onPress }: Props) {
  const config = typeConfig[type];

  return (
    <Pressable onPress={() => onPress?.(id)} style={[styles.container, !read && styles.containerUnread]}>
      <MaterialCommunityIcons name={config.icon as any} size={24} color={config.color} style={styles.icon} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {!read ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.time}>{timeAgo}</Text>
      </View>
    </Pressable>
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
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
