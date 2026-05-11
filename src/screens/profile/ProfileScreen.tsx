import { SafeAreaView, StyleSheet, View, Text, Pressable, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, spacing, typography, borderRadius, shadows } from "@/config/theme";

export function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={[styles.avatar, shadows.md]}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "U"}</Text>
        </View>

        {/* User Info */}
        <View style={styles.userInfoSection}>
          <Text style={styles.userName}>{user?.name || "Usuario"}</Text>
          <Text style={styles.userEmail}>{user?.email || "email@example.com"}</Text>
        </View>

        {/* Section: Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <Pressable style={[styles.settingItem, shadows.sm]}>
            <MaterialCommunityIcons name="lock" size={24} color={colors.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Cambiar contraseña</Text>
              <Text style={styles.settingSubtitle}>Actualiza tu contraseña</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.subtext} />
          </Pressable>
        </View>

        {/* Logout Button */}
        <PrimaryButton
          title="Cerrar sesión"
          onPress={() => void signOut()}
          variant="danger"
          style={styles.logoutButton}
        />
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.xl,
  },
  avatarText: {
    ...typography.h1,
    color: colors.white,
    fontWeight: "700",
  },
  userInfoSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  userName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  userEmail: {
    ...typography.body,
    color: colors.subtext,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  settingItem: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingContent: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  settingLabel: {
    ...typography.body,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  settingSubtitle: {
    ...typography.bodySm,
    color: colors.subtext,
  },
  logoutButton: {
    marginTop: spacing.xxl,
  },
});