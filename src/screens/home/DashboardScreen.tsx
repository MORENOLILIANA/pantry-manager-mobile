import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import type { DashboardStackParamList, AppStackParamList } from "@/navigation/stacks/AppStack";
import { StatCard } from "@/components/StatCard";
import { fetchCurrentUser, type AuthUser } from "@/api/auth";
import { getPantries, getPantry, getNotifications, type Pantry, type Notification } from "@/api/pantries";
import { getShoppingLists, type ShoppingList } from "@/api/shoppingLists";

type Navigation = CompositeNavigationProp<
  NativeStackNavigationProp<DashboardStackParamList>,
  BottomTabNavigationProp<AppStackParamList>
>;

interface DashboardData {
  user: AuthUser | null;
  pantry: Pantry | null;
  notifications: Notification[];
  shoppingList: ShoppingList | null;
}

export function DashboardScreen() {
  const navigation = useNavigation<Navigation>();

  const [data, setData] = useState<DashboardData>({
    user: null,
    pantry: null,
    notifications: [],
    shoppingList: null,
  });
  const [loading, setLoading] = useState(true);

  // Cargar datos al montar y cada vez que la pantalla se enfoca
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Hacer todas las llamadas en paralelo
      const [userData, pantriesData, shoppingListsData] = await Promise.all([
        fetchCurrentUser().catch((err) => {
          console.error("Error fetching user:", err);
          return null;
        }),
        getPantries().catch((err) => {
          console.error("Error fetching pantries:", err);
          return [];
        }),
        getShoppingLists().catch((err) => {
          console.error("Error fetching shopping lists:", err);
          return [];
        }),
      ]);

      // Obtener despensa completa y notificaciones
      let pantryData: Pantry | null = null;
      let notificationsData: Notification[] = [];

      if (pantriesData && pantriesData.length > 0) {
        const firstPantry = pantriesData[0];
        [pantryData, notificationsData] = await Promise.all([
          getPantry(firstPantry.id).catch((err) => {
            console.error("Error fetching pantry:", err);
            return null;
          }),
          getNotifications(firstPantry.id).catch((err) => {
            console.error("Error fetching notifications:", err);
            return [];
          }),
        ]);
      }

      // Obtener lista activa de compras
      const activeShoppingList = shoppingListsData?.find(
        (l) => l.status === "active"
      ) || null;

      setData({
        user: userData,
        pantry: pantryData,
        notifications: notificationsData,
        shoppingList: activeShoppingList,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  // Calcular métricas
  const totalItems = data.pantry?.items?.length || 0;
  const expiringItems = data.notifications?.length || 0;
  const pendingItems =
    data.shoppingList?.items?.filter((i) => !i.purchased).length || 0;

  // Últimos 5 items añadidos (ordenados por created_at descendente)
  const recentItems = (data.pantry?.items || [])
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    )
    .slice(0, 5);

  const userName = data.user?.name?.split(" ")[0] || "Usuario";

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.greeting}>¡Hola, {userName}! 👋</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString("es-ES", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          <Pressable onPress={() => navigation.navigate("Notifications")}>
            <MaterialCommunityIcons
              name="bell"
              size={28}
              color={colors.primary}
            />
          </Pressable>
        </View>

        {/* Alert Card - Solo mostrar si hay notificaciones */}
        {expiringItems > 0 && (
          <View style={[styles.alertCard, shadows.sm]}>
            <View style={styles.alertIcon}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={28}
                color="#F39C12"
              />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                Tienes {expiringItems} producto{expiringItems > 1 ? "s" : ""} próximo{expiringItems > 1 ? "s" : ""} a caducar
              </Text>
              <Text style={styles.alertSubtitle}>
                En los próximos 7 días
              </Text>
            </View>
            <Pressable
              onPress={() =>
                navigation.navigate("PantriesStack", { screen: "Pantries" })
              }
            >
              <Text style={styles.alertButton}>Ver</Text>
            </Pressable>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="package-variant"
            label="En despensa"
            value={totalItems.toString()}
          />
          <StatCard
            icon="alert-circle"
            label="Próximos"
            value={expiringItems.toString()}
            highlight={expiringItems > 0 ? "orange" : undefined}
          />
          <StatCard
            icon="shopping-cart"
            label="En lista"
            value={pendingItems.toString()}
          />
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accesos rápidos</Text>
          <View style={styles.quickAccessGrid}>
            <Pressable
              onPress={() =>
                navigation.navigate("PantriesStack", { screen: "Products" })
              }
              style={[styles.quickAccessButton, shadows.sm]}
            >
              <MaterialCommunityIcons
                name="plus-circle"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.quickAccessLabel}>Añadir producto</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                navigation.navigate("PantriesStack", { screen: "BarcodeScan" })
              }
              style={[styles.quickAccessButton, shadows.sm]}
            >
              <MaterialCommunityIcons
                name="barcode"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.quickAccessLabel}>Escanear</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Recipes")}
              style={[styles.quickAccessButton, shadows.sm]}
            >
              <MaterialCommunityIcons
                name="chef-hat"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.quickAccessLabel}>Recetas</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                navigation.navigate("ShoppingListStack", {
                  screen: "ShoppingLists",
                })
              }
              style={[styles.quickAccessButton, shadows.sm]}
            >
              <MaterialCommunityIcons
                name="list-box"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.quickAccessLabel}>Mi lista</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Products */}
        {recentItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimos añadidos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
            >
              {recentItems.map((item) => (
                <View
                  key={item.id}
                  style={[styles.recentCard, shadows.sm]}
                >
                  <MaterialCommunityIcons
                    name="package-variant"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.recentLabel}>
                    {item.product.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  greeting: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.bodySm,
    color: colors.subtext,
    textTransform: "capitalize",
  },
  alertCard: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertIcon: {
    marginRight: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  alertSubtitle: {
    ...typography.bodySm,
    color: colors.subtext,
  },
  alertButton: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  quickAccessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  quickAccessButton: {
    width: "48%",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  quickAccessLabel: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
    marginTop: spacing.md,
    textAlign: "center",
  },
  recentScroll: {
    gap: spacing.md,
  },
  recentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    width: 90,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "600",
    marginTop: spacing.sm,
    textAlign: "center",
  },
});