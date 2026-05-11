import { SafeAreaView, StyleSheet } from "react-native";
import { colors } from "@/config/theme";
import { EmptyState } from "@/components/EmptyState";

export function ProductsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <EmptyState
        icon="package-plus"
        title="Añadir producto"
        subtitle="Rellena los detalles del producto"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
});