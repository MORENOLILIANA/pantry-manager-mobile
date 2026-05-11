import { SafeAreaView, StyleSheet } from "react-native";
import { colors } from "@/config/theme";
import { EmptyState } from "@/components/EmptyState";

export function ShoppingListsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <EmptyState
        icon="shopping-cart"
        title="La lista está vacía"
        subtitle="Añade lo que necesites comprar"
        buttonText="Añadir item"
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