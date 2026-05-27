import { StyleSheet, View, Text, ActivityIndicator, SafeAreaView, Image } from "react-native";
import { colors, typography, spacing } from "@/config/theme";

export function SplashScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image source={require("../../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.logoText}>La Despensa</Text>
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
  logo: {
    width: 130,
    height: 130,
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