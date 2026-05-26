import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { colors, spacing, typography, borderRadius, shadows } from "@/config/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { DashboardStackParamList } from "@/navigation/stacks/AppStack";
import { createShoppingList, addItem as addShoppingItem, getShoppingLists } from "@/api/shoppingLists";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getRecipeFavoriteIds, toggleRecipeFavoriteId } from "@/services/storage";
import { CATEGORY_ES, translateIngredient, translateToSpanish } from "@/services/translationService";

type Props = NativeStackScreenProps<DashboardStackParamList, "RecipeDetail">;

export default function RecipeDetailScreen({ route }: Props) {
  const { recipe, missingIngredients = [], availableIngredients = [] } = route.params;
  const [loading, setLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [translatedInstructions, setTranslatedInstructions] = useState<string | null>(null);
  const [translating, setTranslating] = useState(true);

  const ingredients: string[] = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

  useEffect(() => {
    void (async () => {
      const favorites = await getRecipeFavoriteIds();
      setIsFavorite(favorites.includes(recipe.idMeal));
    })();
  }, [recipe.idMeal]);

  useEffect(() => {
    if (!recipe.strInstructions) {
      setTranslating(false);
      return;
    }
    void (async () => {
      setTranslating(true);
      try {
        const result = await translateToSpanish(recipe.strInstructions);
        setTranslatedInstructions(result);
      } catch {
        setTranslatedInstructions(null);
      } finally {
        setTranslating(false);
      }
    })();
  }, [recipe.strInstructions]);

  const handleToggleFavorite = async () => {
    try {
      const next = await toggleRecipeFavoriteId(recipe.idMeal);
      setIsFavorite(next.includes(recipe.idMeal));
    } catch {
      Alert.alert("Error", "No se pudo actualizar el favorito.");
    }
  };

  const handleAddMissing = async () => {
    try {
      setLoading(true);
      const lists = await getShoppingLists();
      let list = lists?.find((l) => l.name === "Mi lista");
      if (!list) {
        list = await createShoppingList({ name: "Mi lista" });
      }
      await Promise.all(
        missingIngredients.map((ing) =>
          addShoppingItem(list!.id, {
            name: translateIngredient(ing),
            quantity: 1,
            unit: "ud",
          })
        )
      );
      Alert.alert("Añadido", "Ingredientes faltantes añadidos a 'Mi lista'.");
    } catch {
      Alert.alert("Error", "No se pudieron añadir los ingredientes.");
    } finally {
      setLoading(false);
    }
  };

  const categoryEs = recipe.strCategory
    ? CATEGORY_ES[recipe.strCategory] ?? recipe.strCategory
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {recipe.strMealThumb ? (
          <Image source={{ uri: recipe.strMealThumb }} style={styles.image} />
        ) : null}

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.title}>{recipe.strMeal}</Text>
          {categoryEs ? (
            <Text style={styles.category}>{categoryEs}</Text>
          ) : null}

          <View style={styles.topActions}>
            <Pressable onPress={handleToggleFavorite} style={styles.favoriteButton}>
              <MaterialCommunityIcons
                name={isFavorite ? "heart" : "heart-outline"}
                size={20}
                color={isFavorite ? colors.error : colors.primary}
              />
              <Text style={styles.favoriteButtonText}>
                {isFavorite ? "En favoritos" : "Guardar favorito"}
              </Text>
            </Pressable>
          </View>

          {/* Ingredientes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredientes</Text>
            {ingredients.map((ing) => {
              const esName = translateIngredient(ing);
              const isAvailable = availableIngredients.includes(ing);
              return (
                <View key={ing} style={styles.ingredientRow}>
                  <MaterialCommunityIcons
                    name={isAvailable ? "check-circle" : "circle-outline"}
                    size={16}
                    color={isAvailable ? colors.primary : colors.subtext}
                  />
                  <Text style={[styles.ingredientText, isAvailable && styles.ingredientAvailable]}>
                    {esName}
                    {esName !== ing ? (
                      <Text style={styles.ingredientEn}> ({ing})</Text>
                    ) : null}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Instrucciones */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instrucciones</Text>
            {translating ? (
              <View style={styles.translatingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.translatingText}>Traduciendo instrucciones...</Text>
              </View>
            ) : (
              <Text style={styles.instructions}>
                {translatedInstructions ?? recipe.strInstructions}
              </Text>
            )}
            {!translating && translatedInstructions && (
              <Text style={styles.translationNote}>Traducción automática · MyMemory</Text>
            )}
          </View>

          {/* Añadir faltantes */}
          {missingIngredients.length > 0 && (
            <View style={styles.actions}>
              <Pressable
                onPress={handleAddMissing}
                style={styles.addButton}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="cart-plus" size={18} color={colors.white} />
                    <Text style={styles.addButtonText}>
                      Añadir {missingIngredients.length} ingrediente
                      {missingIngredients.length > 1 ? "s" : ""} faltante
                      {missingIngredients.length > 1 ? "s" : ""} a la lista
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.lg,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  category: {
    ...typography.bodySm,
    color: colors.subtext,
    marginBottom: spacing.sm,
  },
  topActions: {
    marginBottom: spacing.sm,
  },
  favoriteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondary,
  },
  favoriteButtonText: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "700",
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  ingredientText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
  ingredientAvailable: {
    color: colors.primary,
    fontWeight: "600",
  },
  ingredientEn: {
    ...typography.bodySm,
    color: colors.subtext,
    fontWeight: "400",
  },
  translatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  translatingText: {
    ...typography.bodySm,
    color: colors.subtext,
  },
  instructions: {
    ...typography.body,
    color: colors.text,
    lineHeight: 26,
  },
  translationNote: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  actions: {
    marginTop: spacing.lg,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: "700",
  },
});
