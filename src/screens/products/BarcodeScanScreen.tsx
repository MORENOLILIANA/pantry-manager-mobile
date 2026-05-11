import { SafeAreaView, StyleSheet, View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography, spacing } from "@/config/theme";

export function BarcodeScanScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <MaterialCommunityIcons name="barcode" size={80} color={colors.primary} style={styles.icon} />
        <Text style={styles.title}>Escanear Código</Text>
        <Text style={styles.subtitle}>Apunta al código de barras del producto</Text>
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
    paddingHorizontal: spacing.xl,
  },
  icon: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
  },
});