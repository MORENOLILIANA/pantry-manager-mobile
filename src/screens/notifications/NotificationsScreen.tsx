import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, borderRadius, typography } from "@/config/theme";
import { NotificationItem } from "@/components/NotificationItem";
import { EmptyState } from "@/components/EmptyState";
import { getPantries, getNotifications, type Notification as PantryNotification } from "@/api/pantries";
import { getReadNotificationIds, markNotificationAsRead, markNotificationsAsRead } from "@/services/storage";

interface NotificationViewModel {
  id: string;
  type: "expiry" | "shopping" | "recipe";
  title: string;
  description: string;
  timeAgo: string;
  read: boolean;
}

type NotificationSection = {
  title: string;
  data: NotificationViewModel[];
};

function getTimeAgo(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return "Reciente";

  const diffMinutes = Math.max(1, Math.floor((Date.now() - created) / 60000));
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

function mapNotification(notification: PantryNotification, read: boolean): NotificationViewModel {
  const isExpired = notification.type === "expired";
  return {
    id: notification.id,
    type: isExpired ? "expiry" : notification.type === "low_stock" ? "shopping" : "recipe",
    title:
      notification.type === "expired"
        ? "Producto caducado"
        : notification.type === "low_stock"
          ? "Stock bajo"
          : "Alerta de despensa",
    description: notification.message,
    timeAgo: getTimeAgo(notification.created_at),
    read,
  };
}

export function NotificationsScreen() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationViewModel[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const pantries = await getPantries();
      if (!pantries.length) {
        setNotifications([]);
        return;
      }

      const pantryNotifications = await getNotifications(pantries[0].id).catch(() => []);
      const readIds = await getReadNotificationIds();
      setNotifications(pantryNotifications.map((item) => mapNotification(item, readIds.includes(item.id))));
    } catch (error) {
      console.error("Error loading notifications:", error);
      Alert.alert("Error", "No se pudieron cargar las notificaciones.");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      void loadNotifications();
    }, [])
  );

  const visibleNotifications = useMemo(() => {
    return filter === "all" ? notifications : notifications.filter((item) => !item.read);
  }, [filter, notifications]);

  const sections: NotificationSection[] = useMemo(() => {
    const unread = visibleNotifications.filter((item) => !item.read);
    const read = visibleNotifications.filter((item) => item.read);
    const result: NotificationSection[] = [];

    if (unread.length) result.push({ title: "Nuevas", data: unread });
    if (read.length) result.push({ title: "Leídas", data: read });

    return result;
  }, [visibleNotifications]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
      if (!unreadIds.length) return;
      await markNotificationsAsRead(unreadIds);
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      Alert.alert("Error", "No se pudieron marcar como leídas.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!notifications.length) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="bell-off-outline"
          title="Sin notificaciones"
          subtitle="Aquí aparecerán alertas reales sobre caducidades, compras y recetas"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.toolbar}>
        <View>
          <Text style={styles.toolbarTitle}>Notificaciones</Text>
          <Text style={styles.toolbarSubtitle}>
            {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día"}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Marcar todas</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setFilter("all")}
          style={[styles.filterChip, filter === "all" && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
            Todas
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilter("unread")}
          style={[styles.filterChip, filter === "unread" && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filter === "unread" && styles.filterTextActive]}>
            Sin leer
          </Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <NotificationItem
            id={item.id}
            type={item.type}
            title={item.title}
            description={item.description}
            timeAgo={item.timeAgo}
            read={item.read}
            onPress={handleMarkAsRead}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bell-off-outline"
            title="Sin resultados"
            subtitle="No hay notificaciones para este filtro"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  toolbar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  toolbarTitle: {
    ...typography.h2,
    color: colors.text,
  },
  toolbarSubtitle: {
    ...typography.bodySm,
    color: colors.subtext,
    marginTop: spacing.xs,
  },
  markAllButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
  },
  markAllText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.secondary,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
  },
  filterTextActive: {
    color: colors.white,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    ...typography.bodySm,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    marginLeft: 0,
  },
});
