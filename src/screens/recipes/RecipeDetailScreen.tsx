import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from "react-native";
import { colors, spacing, typography, borderRadius, shadows } from "@/config/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { DashboardStackParamList } from "@/navigation/stacks/AppStack";
import { createShoppingList, addItem as addShoppingItem, getShoppingLists } from "@/api/shoppingLists";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<DashboardStackParamList, "RecipeDetail">;

export default function RecipeDetailScreen({ route }: Props) {
  const { recipe, missingIngredients = [], availableIngredients = [] } = route.params;
  const [loading, setLoading] = useState(false);

  const ingredients: string[] = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

  async function handleAddMissing() {
    try {
      setLoading(true);
      // find or create a shopping list named 'Mi lista'
      const lists = await getShoppingLists();
      let list = lists?.find((l) => l.name === "Mi lista");
      if (!list) {
        list = await createShoppingList({ name: "Mi lista" });
      }

      await Promise.all(
        missingIngredients.map((ing) =>
          addShoppingItem(list.id, { name: ing, quantity: 1, unit: "unidades" })
        )
      );

      Alert.alert("Añadido", "Ingredientes faltantes añadidos a 'Mi lista'.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudieron añadir los ingredientes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: recipe.strMealThumb }} style={styles.image} />
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.title}>{recipe.strMeal}</Text>
          {recipe.strCategory ? (
            <Text style={styles.category}>{recipe.strCategory}</Text>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredientes</Text>
            {ingredients.map((ing) => (
              <View key={ing} style={styles.ingredientRow}>
                <MaterialCommunityIcons
                  name={availableIngredients.includes(ing) ? "check-circle" : "circle-outline"}
                  size={16}
                  color={availableIngredients.includes(ing) ? colors.primary : colors.subtext}
                />
                <Text style={styles.ingredientText}>{ing}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instrucciones</Text>
            <Text style={styles.instructions}>{recipe.strInstructions}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={handleAddMissing} style={styles.addButton} disabled={loading}>
              <Text style={styles.addButtonText}>{loading ? "Añadiendo..." : "Añadir ingredientes faltantes"}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.lg },
  image: { width: "100%", height: 220, borderRadius: borderRadius.md, marginBottom: spacing.md },
  card: { backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  category: { ...typography.bodySm, color: colors.subtext, marginBottom: spacing.sm },
  section: { marginTop: spacing.md },
  sectionTitle: { ...typography.h3, marginBottom: spacing.xs },
  ingredientRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs },
  ingredientText: { marginLeft: spacing.sm, ...typography.body },
  instructions: { ...typography.body, color: colors.text },
  actions: { marginTop: spacing.md, alignItems: "center" },
  addButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.sm },
  addButtonText: { color: colors.white, fontWeight: "700" },
});
