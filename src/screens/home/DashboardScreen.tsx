import { StyleSheet, View, Text, ScrollView, SafeAreaView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import type { DashboardStackParamList } from "@/navigation/stacks/AppStack";
import { StatCard } from "@/components/StatCard";

type Navigation = NativeStackNavigationProp<DashboardStackParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<Navigation>();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.greeting}>¡Hola, Juan! 👋</Text>
            <Text style={styles.date}>{new Date().toLocaleDateString("es-ES", { weekday: "long", month: "long", day: "numeric" })}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("Notifications")}>
            <MaterialCommunityIcons name="bell" size={28} color={colors.primary} />
          </Pressable>
        </View>

        {/* Alert Card */}
        <View style={[styles.alertCard, shadows.sm]}>
          <View style={styles.alertIcon}>
            <MaterialCommunityIcons name="alert-circle" size={28} color="#F39C12" />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>3 productos próximos a caducar</Text>
            <Text style={styles.alertSubtitle}>En los próximos 7 días</Text>
          </View>
          <Pressable>
            <Text style={styles.alertButton}>Ver</Text>
          </Pressable>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="package-variant"
            label="En despensa"
            value="24"
          />
          <StatCard
            icon="alert-circle"
            label="Próximos"
            value="3"
            highlight="orange"
          />
          <StatCard
            icon="shopping-cart"
            label="En lista"
            value="8"
          />
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accesos rápidos</Text>
          <View style={styles.quickAccessGrid}>
            <Pressable style={[styles.quickAccessButton, shadows.sm]}>
              <MaterialCommunityIcons name="plus-circle" size={32} color={colors.primary} />
              <Text style={styles.quickAccessLabel}>Añadir producto</Text>
            </Pressable>
            <Pressable style={[styles.quickAccessButton, shadows.sm]}>
              <MaterialCommunityIcons name="barcode" size={32} color={colors.primary} />
              <Text style={styles.quickAccessLabel}>Escanear</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("Recipes")} style={[styles.quickAccessButton, shadows.sm]}>
              <MaterialCommunityIcons name="chef-hat" size={32} color={colors.primary} />
              <Text style={styles.quickAccessLabel}>Recetas</Text>
            </Pressable>
            <Pressable style={[styles.quickAccessButton, shadows.sm]}>
              <MaterialCommunityIcons name="list-box" size={32} color={colors.primary} />
              <Text style={styles.quickAccessLabel}>Mi lista</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimos añadidos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentScroll}
          >
            {["Leche", "Pan", "Tomate", "Huevos"].map((product) => (
              <View key={product} style={[styles.recentCard, shadows.sm]}>
                <MaterialCommunityIcons name="package-variant" size={24} color={colors.primary} />
                <Text style={styles.recentLabel}>{product}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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