import { StyleSheet, View, Text, ScrollView, SafeAreaView, SectionList } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "@/config/theme";
import { NotificationItem } from "@/components/NotificationItem";
import { EmptyState } from "@/components/EmptyState";

interface Notification {
  id: string;
  type: "expiry" | "shopping" | "recipe";
  title: string;
  description: string;
  timeAgo: string;
  read: boolean;
}

// Mock data
const mockNotifications: Array<{ title: string; data: Notification[] }> = [
  {
    title: "Hoy",
    data: [
      {
        id: "1",
        type: "expiry",
        title: "Lechuga próxima a caducar",
        description: "Tu lechuga vence en 2 días",
        timeAgo: "hace 2h",
        read: false,
      }
    ]
  },
  {
    title: "Esta semana",
    data: [
      {
        id: "2",
        type: "shopping",
        title: "Compra completada",
        description: "Moviste 3 items de la lista de compra a tu despensa",
        timeAgo: "hace 3 días",
        read: true,
      },
      {
        id: "3",
        type: "recipe",
        title: "Nueva receta disponible",
        description: "Ensalada mediterránea basada en tus productos",
        timeAgo: "hace 5 días",
        read: true,
      }
    ]
  }
];

export function NotificationsScreen() {
  const allNotifications = mockNotifications.flatMap(section => section.data);

  if (!allNotifications || allNotifications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="bell"
          title="Sin notificaciones"
          subtitle="Aquí aparecerán alertas sobre tu despensa"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        sections={mockNotifications}
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
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        scrollEnabled={true}
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
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
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
