import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, typography, borderRadius, shadows } from "@/config/theme";
import { getPantries, getPantry } from "@/api/pantries";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { DashboardStackParamList } from "@/navigation/stacks/AppStack";
import { EmptyState } from "@/components/EmptyState";

type Navigation = NativeStackNavigationProp<DashboardStackParamList>;

interface MealSummary {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

interface MealDetail {
  idMeal: string;
  strMeal: string;
  strCategory?: string;
  strMealThumb?: string;
  strInstructions?: string;
  ingredients: string[];
}

export function RecipesScreen() {
  const navigation = useNavigation<Navigation>();
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<MealDetail[]>([]);
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const pantries = await getPantries().catch(() => []);
        if (!pantries || pantries.length === 0) {
          setMeals([]);
          setAvailableProducts([]);
          return;
        }

        const first = pantries[0];
        const pantry = await getPantry(first.id).catch(() => null);
        const productNames = (pantry?.items || []).map((i) =>
          i.product.name.toLowerCase()
        );
        setAvailableProducts(productNames);

        const firstIngredient = productNames[0];
        if (!firstIngredient) {
          setMeals([]);
          return;
        }

        const filterRes = await fetch(
          `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(
            firstIngredient
          )}`
        ).then((r) => r.json());

        const summaries: MealSummary[] = filterRes?.meals || [];

        const limited = summaries.slice(0, 12);
        const details: MealDetail[] = [];

        await Promise.all(
          limited.map(async (m) => {
            try {
              const lookup = await fetch(
                `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${m.idMeal}`
              ).then((r) => r.json());
              const meal = lookup?.meals?.[0];
              if (!meal) return;

              const ingredients: string[] = [];
              for (let i = 1; i <= 20; i++) {
                const ing = meal[`strIngredient${i}`];
                if (ing && ing.trim()) ingredients.push(ing.trim());
              }

              details.push({
                idMeal: meal.idMeal,
                strMeal: meal.strMeal,
                strCategory: meal.strCategory,
                strMealThumb: meal.strMealThumb,
                strInstructions: meal.strInstructions,
                ingredients,
              });
            } catch (e) {
              // ignore per-meal errors
            }
          })
        );

        setMeals(details);
      } catch (error) {
        console.error("Error loading recipes:", error);
        Alert.alert("Error", "No se pudieron cargar recetas. Intenta más tarde.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!meals || meals.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="food-apple"
          title="No hay recetas"
          subtitle="No se encontraron recetas basadas en tu despensa"
        />
      </SafeAreaView>
    );
  }

  const hasIngredient = (name: string) =>
    availableProducts.some((p) => p.includes(name.toLowerCase()));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {meals.map((meal) => (
          <View key={meal.idMeal} style={[styles.card, shadows.sm]}>
            <Image source={{ uri: meal.strMealThumb }} style={styles.thumb} />
            <View style={styles.cardBody}>
              <Text style={styles.mealTitle}>{meal.strMeal}</Text>
              {meal.strCategory ? (
                <Text style={styles.category}>{meal.strCategory}</Text>
              ) : null}

              <View style={styles.ingredientsRow}>
                {meal.ingredients.slice(0, 6).map((ing) => {
                  const ok = hasIngredient(ing);
                  return (
                    <View
                      key={ing}
                      style={[
                        styles.ingredientBadge,
                        ok ? styles.ingredientOk : styles.ingredientMissing,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={ok ? "check" : "close"}
                        size={12}
                        color={ok ? colors.white : colors.subtext}
                      />
                      <Text
                        style={[
                          styles.ingredientText,
                          ok && { color: colors.white },
                        ]}
                      >
                        {ing}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() =>
                    navigation.navigate("RecipeDetail", { recipe: meal })
                  }
                  style={styles.viewButton}
                >
                  <Text style={styles.viewButtonText}>Ver receta</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: spacing.lg },
  card: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 120, height: 120 },
  cardBody: { flex: 1, padding: spacing.md },
  mealTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  category: { ...typography.bodySm, color: colors.subtext, marginBottom: spacing.sm },
  ingredientsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  ingredientBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, marginRight: spacing.sm, marginBottom: spacing.sm },
  ingredientOk: { backgroundColor: colors.primary },
  ingredientMissing: { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
  ingredientText: { ...typography.caption, color: colors.text, marginLeft: 6 },
  actionsRow: { marginTop: spacing.sm, flexDirection: "row", justifyContent: "flex-end" },
  viewButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.sm },
  viewButtonText: { ...typography.bodySm, color: colors.white, fontWeight: "700" },
});
