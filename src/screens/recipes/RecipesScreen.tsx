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
import { StyleSheet, View, Text, ScrollView, SafeAreaView, FlatList, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import { EmptyState } from "@/components/EmptyState";

interface Recipe {
  id: string;
  name: string;
  time: number; // minutos
  difficulty: "Fácil" | "Media" | "Difícil";
  ingredientsAvailable: string[];
  ingredientsMissing: string[];
}

// Mock data
const mockRecipes: Recipe[] = [
  {
    id: "1",
    name: "Ensalada Fresca",
    time: 15,
    difficulty: "Fácil",
    ingredientsAvailable: ["Lechuga", "Tomate", "Pepino"],
    ingredientsMissing: ["Aderezo"]
  },
  {
    id: "2",
    name: "Pasta Carbonara",
    time: 25,
    difficulty: "Media",
    ingredientsAvailable: ["Pasta", "Huevos"],
    ingredientsMissing: ["Queso Parmesano", "Jamón"]
  }
];

export function RecipesScreen() {
  const handleRecipePress = (id: string) => {
    // TODO: Navegar a RecipeDetailScreen
    console.log("Ver receta:", id);
  };

  if (!mockRecipes || mockRecipes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="chef-hat"
          title="No hay recetas disponibles"
          subtitle="Añade productos a tu despensa para ver recetas sugeridas"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Recetas sugeridas</Text>
          <Text style={styles.subtitle}>Basadas en tu despensa</Text>
        </View>

        <FlatList
          data={mockRecipes}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleRecipePress(item.id)}
              style={[styles.card, shadows.sm]}
            >
              {/* Imagen placeholder */}
              <View style={styles.imageContainer}>
                <MaterialCommunityIcons name="chef-hat" size={48} color={colors.primary} />
              </View>

              {/* Contenido */}
              <View style={styles.cardContent}>
                <Text style={styles.recipeName}>{item.name}</Text>

                {/* Info row */}
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="clock" size={14} color={colors.subtext} />
                    <Text style={styles.infoText}>{item.time} min</Text>
                  </View>
                  <View style={styles.difficulty}>
                    <Text style={[styles.difficultyText, { color: getDifficultyColor(item.difficulty) }]}>
                      {item.difficulty}
                    </Text>
                  </View>
                </View>

                {/* Ingredientes disponibles */}
                {item.ingredientsAvailable.length > 0 && (
                  <View style={styles.ingredientsSection}>
                    <Text style={styles.ingredientsTitle}>Tienes:</Text>
                    <View style={styles.ingredientsList}>
                      {item.ingredientsAvailable.map((ingredient, idx) => (
                        <View key={idx} style={styles.ingredientTag}>
                          <MaterialCommunityIcons name="check-circle" size={12} color={colors.success} />
                          <Text style={styles.ingredientText}>{ingredient}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Ingredientes faltantes */}
                {item.ingredientsMissing.length > 0 && (
                  <View style={styles.ingredientsSection}>
                    <Text style={styles.ingredientsTitle}>Te falta:</Text>
                    <View style={styles.ingredientsList}>
                      {item.ingredientsMissing.map((ingredient, idx) => (
                        <View key={idx} style={styles.ingredientTagMissing}>
                          <MaterialCommunityIcons name="close-circle" size={12} color={colors.subtext} />
                          <Text style={styles.ingredientTextMissing}>{ingredient}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Ver receta button */}
                <Pressable style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>Ver receta</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color={colors.white} />
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "Fácil":
      return colors.success;
    case "Media":
      return "#F39C12";
    case "Difícil":
      return colors.error;
    default:
      return colors.text;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  card: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    width: 100,
    height: 100,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
  },
  recipeName: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  infoText: {
    ...typography.caption,
    color: colors.subtext,
  },
  difficulty: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  difficultyText: {
    ...typography.caption,
    fontWeight: "600",
  },
  ingredientsSection: {
    marginBottom: spacing.sm,
  },
  ingredientsTitle: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ingredientsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  ingredientTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 4,
  },
  ingredientText: {
    ...typography.caption,
    color: colors.success,
  },
  ingredientTagMissing: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#F0F0F0",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 4,
  },
  ingredientTextMissing: {
    ...typography.caption,
    color: colors.subtext,
  },
  viewButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  viewButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "700",
  },
});
