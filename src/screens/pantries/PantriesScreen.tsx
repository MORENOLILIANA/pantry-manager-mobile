import { SafeAreaView, StyleSheet } from "react-native";
import { colors } from "@/config/theme";
import { EmptyState } from "@/components/EmptyState";

export function PantriesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <EmptyState
        icon="package-variant"
        title="Tu despensa está vacía"
        subtitle="Añade tu primer producto para empezar"
        buttonText="Añadir producto"
        onButtonPress={() => {}}
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