import React, { useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import type { DashboardStackParamList, AppStackParamList } from "@/navigation/stacks/AppStack";
import { StatCard } from "@/components/StatCard";
import { fetchCurrentUser, type AuthUser } from "@/api/auth";
import { getPantries, getPantry, getNotifications, type Pantry, type Notification } from "@/api/pantries";
import { getShoppingLists, getShoppingList, type ShoppingList } from "@/api/shoppingLists";
import { OnboardingModal } from "@/components/OnboardingModal";
import { getOnboardingDone, setOnboardingDone, getSelectedPantryId } from "@/services/storage";

function getExpiryLabel(expiryDate: string): string {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Caducado";
  if (diff === 0) return "Caduca hoy";
  if (diff === 1) return "Caduca mañana";
  return `En ${diff} días`;
}

function getExpiryColor(expiryDate: string): string {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "#E74C3C";
  if (diff === 1) return "#E67E22";
  return "#F39C12";
}

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const initialLoadDone = useRef(false);

  const loadDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

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
        const savedId = await getSelectedPantryId();
        const preferred = savedId && pantriesData.find((p) => String(p.id) === savedId)
          ? savedId
          : String(pantriesData[0].id);
        [pantryData, notificationsData] = await Promise.all([
          getPantry(preferred).catch((err) => {
            console.error("Error fetching pantry:", err);
            return null;
          }),
          getNotifications(preferred).catch((err) => {
            console.error("Error fetching notifications:", err);
            return [];
          }),
        ]);
      }

      // Obtener lista activa con sus items
      let activeShoppingList: ShoppingList | null = null;
      const foundList = shoppingListsData?.find((l) => l.status === "active");
      if (foundList) {
        activeShoppingList = await getShoppingList(foundList.id).catch(() => ({ ...foundList, items: [] }));
      }

      setData({
        user: userData,
        pantry: pantryData,
        notifications: notificationsData,
        shoppingList: activeShoppingList,
      });

      // Mostrar onboarding solo si es la primera vez y no tiene despensa
      const done = await getOnboardingDone();
      if (!done) {
        if (!pantryData) {
          setShowOnboarding(true);
        } else {
          // Ya tiene despensa, marcar como completado para no volver a mostrar
          await setOnboardingDone();
        }
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        loadDashboardData(false);
      } else {
        loadDashboardData(true);
      }
    }, [loadDashboardData])
  );

  // Calcular métricas
  const totalItems = data.pantry?.items?.length || 0;
  const pendingItems =
    data.shoppingList?.items?.filter((i) => !i.purchased).length || 0;

  // Productos próximos a caducar (hasta 2, dentro de 7 días)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiringCards = (data.pantry?.items || [])
    .filter((item) => {
      if (!item.expiry_date) return false;
      const exp = new Date(item.expiry_date);
      exp.setHours(0, 0, 0, 0);
      const diff = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 7;
    })
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
    .slice(0, 2);

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
      <OnboardingModal
        visible={showOnboarding}
        navigation={navigation}
        onDone={async () => {
          setShowOnboarding(false);
          await setOnboardingDone();
          loadDashboardData();
        }}
      />
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

        {/* Onboarding — sin despensa creada todavía */}
        {!data.pantry && (
          <Pressable
            style={[styles.onboardingCard, shadows.sm]}
            onPress={() => navigation.navigate("PantriesStack", { screen: "Pantries" } as any)}
          >
            <MaterialCommunityIcons name="fridge-outline" size={36} color={colors.primary} />
            <View style={styles.onboardingContent}>
              <Text style={styles.onboardingTitle}>Crea tu primera despensa</Text>
              <Text style={styles.onboardingSubtitle}>
                Toca aquí para empezar a gestionar tus productos.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
          </Pressable>
        )}

        {/* Próximos a caducar */}
        {expiringCards.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Próximos a caducar</Text>
              <Pressable onPress={() => navigation.navigate("Notifications")}>
                <Text style={styles.sectionLink}>Ver todos</Text>
              </Pressable>
            </View>
            {expiringCards.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.expiryCard, shadows.sm]}
                onPress={() =>
                  navigation.navigate("PantriesStack", { screen: "Pantries", params: { viewMode: "expiry" } } as any)
                }
              >
                <View style={styles.expiryThumb}>
                  {item.product.image_url ? (
                    <Image source={{ uri: item.product.image_url }} style={styles.expiryImg} />
                  ) : (
                    <MaterialCommunityIcons name="package-variant" size={26} color={colors.subtext} />
                  )}
                </View>
                <View style={styles.expiryInfo}>
                  <Text style={styles.expiryName} numberOfLines={1}>{item.product.name}</Text>
                  <Text style={[styles.expiryLabel, { color: getExpiryColor(item.expiry_date) }]}>
                    {getExpiryLabel(item.expiry_date)}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="clock-alert-outline"
                  size={20}
                  color={getExpiryColor(item.expiry_date)}
                />
              </Pressable>
            ))}
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="package-variant"
            label="Despensa"
            value={totalItems.toString()}
            onPress={() => navigation.navigate("PantriesStack", { screen: "Pantries" } as any)}
          />
          <StatCard
            icon="cart-outline"
            label="Lista"
            value={pendingItems.toString()}
            onPress={() => navigation.navigate("ShoppingListStack", { screen: "ShoppingLists" } as any)}
          />
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accesos rápidos</Text>
          <View style={styles.quickAccessGrid}>
            <Pressable
              onPress={() =>
                data.pantry
                  ? navigation.navigate("PantriesStack", { screen: "Products", params: { pantryId: data.pantry.id, mode: "add" } } as any)
                  : navigation.navigate("PantriesStack", { screen: "Pantries" } as any)
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
                navigation.navigate("PantriesStack", { screen: "BarcodeScan" } as any)
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
                name={"chef-hat" as any}
                size={32}
                color={colors.primary}
              />
              <Text style={styles.quickAccessLabel}>Recetas</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                navigation.navigate("ShoppingListStack", { screen: "ShoppingLists" } as any)
              }
              style={[styles.quickAccessButton, shadows.sm]}
            >
              <MaterialCommunityIcons
                name={"format-list-bulleted" as any}
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
                  <Text
                    style={styles.recentLabel}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionLink: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "600",
  },
  expiryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  expiryThumb: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  expiryImg: {
    width: 52,
    height: 52,
    resizeMode: "cover",
  },
  expiryInfo: {
    flex: 1,
    gap: 4,
  },
  expiryName: {
    ...typography.body,
    fontWeight: "600",
    color: colors.text,
  },
  expiryLabel: {
    ...typography.bodySm,
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
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    width: 90,
    height: 90,
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
  onboardingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.primary + "40",
    gap: spacing.md,
  },
  onboardingContent: {
    flex: 1,
  },
  onboardingTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  onboardingSubtitle: {
    ...typography.bodySm,
    color: colors.subtext,
  },
});