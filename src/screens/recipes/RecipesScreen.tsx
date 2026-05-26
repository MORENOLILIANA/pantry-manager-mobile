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
import { InputField } from "@/components/InputField";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, typography, borderRadius, shadows } from "@/config/theme";
import { getPantries, getPantry } from "@/api/pantries";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { DashboardStackParamList } from "@/navigation/stacks/AppStack";
import { EmptyState } from "@/components/EmptyState";
import { getRecipeFavoriteIds, toggleRecipeFavoriteId } from "@/services/storage";

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
  matchCount: number;
  totalIngredients: number;
}

// Traducciones básicas español → inglés para TheMealDB
const ES_TO_EN: Record<string, string> = {
  leche: "milk",
  huevo: "egg",
  huevos: "eggs",
  pollo: "chicken",
  carne: "beef",
  ternera: "beef",
  cerdo: "pork",
  tomate: "tomato",
  tomates: "tomatoes",
  cebolla: "onion",
  cebollas: "onions",
  ajo: "garlic",
  arroz: "rice",
  pasta: "pasta",
  espaguetis: "spaghetti",
  macarrones: "macaroni",
  aceite: "oil",
  "aceite de oliva": "olive oil",
  mantequilla: "butter",
  sal: "salt",
  azucar: "sugar",
  azúcar: "sugar",
  harina: "flour",
  zanahoria: "carrot",
  zanahorias: "carrots",
  patata: "potato",
  patatas: "potatoes",
  papa: "potato",
  papas: "potatoes",
  pimiento: "pepper",
  pimientos: "peppers",
  lechuga: "lettuce",
  queso: "cheese",
  yogur: "yogurt",
  atun: "tuna",
  atún: "tuna",
  salmon: "salmon",
  salmón: "salmon",
  jamon: "ham",
  jamón: "ham",
  chorizo: "chorizo",
  lenteja: "lentils",
  lentejas: "lentils",
  garbanzo: "chickpeas",
  garbanzos: "chickpeas",
  frijoles: "beans",
  alubias: "beans",
  espinaca: "spinach",
  espinacas: "spinach",
  brocoli: "broccoli",
  brócoli: "broccoli",
  coliflor: "cauliflower",
  champiñon: "mushroom",
  champiñones: "mushrooms",
  limon: "lemon",
  limón: "lemon",
  naranja: "orange",
  manzana: "apple",
  platano: "banana",
  plátano: "banana",
  uvas: "grapes",
  fresas: "strawberries",
  pan: "bread",
  leche_de_coco: "coconut milk",
  "leche de coco": "coconut milk",
  nata: "cream",
  crema: "cream",
  vinagre: "vinegar",
  pimienta: "black pepper",
  oregano: "oregano",
  orégano: "oregano",
  comino: "cumin",
  paprika: "paprika",
  pimenton: "paprika",
  pimentón: "paprika",
  cilantro: "coriander",
  perejil: "parsley",
  albahaca: "basil",
  tomillo: "thyme",
  romero: "rosemary",
  canela: "cinnamon",
  vainilla: "vanilla",
  chocolate: "chocolate",
  cacao: "cocoa powder",
  nuez: "walnut",
  nueces: "walnuts",
  almendra: "almonds",
  almendras: "almonds",
  cacahuete: "peanut",
  cacahuetes: "peanuts",
  maiz: "corn",
  maíz: "corn",
  atun_en_lata: "tuna",
  sardinas: "sardines",
  gambas: "prawns",
  langostinos: "prawns",
  mejillones: "mussels",
  bacalao: "cod",
  merluza: "hake",
};

function translateToEnglish(spanishName: string): string {
  const lower = spanishName.toLowerCase().trim();
  return ES_TO_EN[lower] ?? lower;
}

async function fetchMealsByIngredient(ingredient: string): Promise<MealSummary[]> {
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`
    );
    const json = await res.json();
    return json?.meals ?? [];
  } catch {
    return [];
  }
}

async function fetchMealDetail(idMeal: string): Promise<MealDetail | null> {
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${idMeal}`
    );
    const json = await res.json();
    const meal = json?.meals?.[0];
    if (!meal) return null;

    const ingredients: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      if (ing && ing.trim()) ingredients.push(ing.trim().toLowerCase());
    }

    return {
      idMeal: meal.idMeal,
      strMeal: meal.strMeal,
      strCategory: meal.strCategory,
      strMealThumb: meal.strMealThumb,
      strInstructions: meal.strInstructions,
      ingredients,
      matchCount: 0,
      totalIngredients: ingredients.length,
    };
  } catch {
    return null;
  }
}

export function RecipesScreen() {
  const navigation = useNavigation<Navigation>();
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<MealDetail[]>([]);
  const [pantryWords, setPantryWords] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      setFavoriteIds(await getRecipeFavoriteIds());
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const pantries = await getPantries().catch(() => []);
        if (!pantries?.length) {
          setMeals([]);
          return;
        }

        const pantry = await getPantry(pantries[0].id).catch(() => null);
        const rawNames = (pantry?.items ?? []).map((i) => i.product.name.toLowerCase());

        // Traduce los nombres al inglés para TheMealDB
        const englishNames = rawNames.map(translateToEnglish);
        const uniqueEnglish = [...new Set(englishNames)];
        setPantryWords(uniqueEnglish);

        if (!uniqueEnglish.length) {
          setMeals([]);
          return;
        }

        // Busca con los primeros 6 ingredientes en paralelo
        const searchTerms = uniqueEnglish.slice(0, 6);
        const searchResults = await Promise.all(
          searchTerms.map(fetchMealsByIngredient)
        );

        // Cuenta cuántas búsquedas encontraron cada meal
        const idCount: Record<string, number> = {};
        const idThumb: Record<string, string> = {};
        for (const results of searchResults) {
          for (const meal of results) {
            idCount[meal.idMeal] = (idCount[meal.idMeal] ?? 0) + 1;
            idThumb[meal.idMeal] = meal.strMealThumb;
          }
        }

        // Ordenar por apariciones (más = más relevante), tomar los 24 mejores
        const sortedIds = Object.entries(idCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 24)
          .map(([id]) => id);

        // Obtener detalles en paralelo
        const details = (
          await Promise.all(sortedIds.map(fetchMealDetail))
        ).filter((m): m is MealDetail => m !== null);

        // Calcular score real: cuántos ingredientes de la receta están en la despensa
        const scored = details
          .map((meal) => {
            const matchCount = meal.ingredients.filter((ing) =>
              uniqueEnglish.some((p) => p.includes(ing) || ing.includes(p))
            ).length;
            return { ...meal, matchCount };
          })
          .filter((m) => m.matchCount > 0)
          .sort((a, b) => b.matchCount - a.matchCount);

        setMeals(scored);
      } catch (error) {
        console.error("Error loading recipes:", error);
        Alert.alert("Error", "No se pudieron cargar recetas. Inténtalo más tarde.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const hasIngredient = (ing: string) =>
    pantryWords.some((p) => p.includes(ing.toLowerCase()) || ing.toLowerCase().includes(p));

  const filteredMeals = meals.filter((meal) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      meal.strMeal.toLowerCase().includes(query) ||
      meal.ingredients.some((i) => i.includes(query));
    const matchesFavorite = !favoritesOnly || favoriteIds.includes(meal.idMeal);
    return matchesSearch && matchesFavorite;
  });

  const handleToggleFavorite = async (recipeId: string) => {
    try {
      const next = await toggleRecipeFavoriteId(recipeId);
      setFavoriteIds(next);
    } catch {
      Alert.alert("Error", "No se pudo actualizar el favorito");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando recetas con tus ingredientes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!meals.length) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="food-apple"
          title="Sin recetas"
          subtitle="Añade productos a tu despensa para descubrir recetas que puedes preparar"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.toolbar}>
          <InputField
            placeholder="Buscar recetas o ingredientes"
            icon="magnify"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setFavoritesOnly(false)}
              style={[styles.filterChip, !favoritesOnly && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, !favoritesOnly && styles.filterChipTextActive]}>
                Todas
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFavoritesOnly(true)}
              style={[styles.filterChip, favoritesOnly && styles.filterChipActive]}
            >
              <MaterialCommunityIcons
                name="heart"
                size={13}
                color={favoritesOnly ? colors.white : colors.subtext}
                style={{ marginRight: 2 }}
              />
              <Text style={[styles.filterChipText, favoritesOnly && styles.filterChipTextActive]}>
                Favoritas
              </Text>
            </Pressable>
          </View>
          <Text style={styles.summaryText}>
            {filteredMeals.length} receta{filteredMeals.length !== 1 ? "s" : ""} · ordenadas por coincidencia
          </Text>
        </View>

        {filteredMeals.map((meal) => {
          const pct = Math.round((meal.matchCount / meal.totalIngredients) * 100);
          const isFav = favoriteIds.includes(meal.idMeal);
          return (
            <View key={meal.idMeal} style={[styles.card, shadows.sm]}>
              {meal.strMealThumb ? (
                <Image source={{ uri: meal.strMealThumb }} style={styles.thumb} />
              ) : null}
              <View style={styles.cardBody}>
                {/* Favorito */}
                <Pressable
                  onPress={() => void handleToggleFavorite(meal.idMeal)}
                  hitSlop={10}
                  style={styles.favoriteButton}
                >
                  <MaterialCommunityIcons
                    name={isFav ? "heart" : "heart-outline"}
                    size={22}
                    color={isFav ? colors.error : colors.subtext}
                  />
                </Pressable>

                <Text style={styles.mealTitle} numberOfLines={2}>{meal.strMeal}</Text>
                {meal.strCategory ? (
                  <Text style={styles.category}>{meal.strCategory}</Text>
                ) : null}

                {/* Barra de coincidencia */}
                <View style={styles.matchRow}>
                  <View style={styles.matchBarBg}>
                    <View style={[styles.matchBarFill, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={styles.matchLabel}>
                    {meal.matchCount}/{meal.totalIngredients} ingredientes
                  </Text>
                </View>

                {/* Badges de ingredientes */}
                <View style={styles.ingredientsRow}>
                  {meal.ingredients.slice(0, 7).map((ing) => {
                    const ok = hasIngredient(ing);
                    return (
                      <View
                        key={ing}
                        style={[styles.ingredientBadge, ok ? styles.ingredientOk : styles.ingredientMissing]}
                      >
                        <MaterialCommunityIcons
                          name={ok ? "check" : "close"}
                          size={11}
                          color={ok ? colors.white : colors.subtext}
                        />
                        <Text style={[styles.ingredientText, ok && { color: colors.white }]} numberOfLines={1}>
                          {ing}
                        </Text>
                      </View>
                    );
                  })}
                  {meal.ingredients.length > 7 ? (
                    <Text style={styles.moreIngredients}>+{meal.ingredients.length - 7} más</Text>
                  ) : null}
                </View>

                <Pressable
                  onPress={() =>
                    navigation.navigate("RecipeDetail", {
                      recipe: meal,
                      availableIngredients: meal.ingredients.filter(hasIngredient),
                      missingIngredients: meal.ingredients.filter((i) => !hasIngredient(i)),
                    })
                  }
                  style={styles.viewButton}
                >
                  <Text style={styles.viewButtonText}>Ver receta</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  loadingText: { ...typography.bodySm, color: colors.subtext, textAlign: "center", marginTop: spacing.sm },
  content: { padding: spacing.lg },
  toolbar: { marginBottom: spacing.lg },
  searchInput: { marginBottom: spacing.md },
  filterRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.secondary,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { ...typography.bodySm, color: colors.subtext, fontWeight: "600" },
  filterChipTextActive: { color: colors.white },
  summaryText: { ...typography.bodySm, color: colors.subtext },
  card: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 110, height: "100%" as any, minHeight: 130 },
  cardBody: { flex: 1, padding: spacing.md, position: "relative" },
  favoriteButton: { position: "absolute", top: spacing.sm, right: spacing.sm, zIndex: 1 },
  mealTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs, paddingRight: 28 },
  category: { ...typography.bodySm, color: colors.subtext, marginBottom: spacing.sm },
  matchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  matchBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.secondary,
    borderRadius: 999,
    overflow: "hidden",
  },
  matchBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  matchLabel: { ...typography.caption, color: colors.subtext, minWidth: 90 },
  ingredientsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: spacing.sm },
  ingredientBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ingredientOk: { backgroundColor: colors.primary },
  ingredientMissing: { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
  ingredientText: { ...typography.caption, color: colors.text, marginLeft: 3 },
  moreIngredients: { ...typography.caption, color: colors.subtext, alignSelf: "center" },
  viewButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  viewButtonText: { ...typography.bodySm, color: colors.white, fontWeight: "700" },
});
