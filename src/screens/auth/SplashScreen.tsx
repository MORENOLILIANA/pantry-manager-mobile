import { StyleSheet, View, Text, ActivityIndicator, SafeAreaView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography, spacing } from "@/config/theme";

export function SplashScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="leaf" size={60} color={colors.primary} />
          <Text style={styles.logoText}>NutriCasa</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
  },
  logoContainer: {
    alignItems: "center",
    gap: spacing.md,
  },
  logoText: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: "700",
  },
  loader: {
    marginTop: 20,
  },
});