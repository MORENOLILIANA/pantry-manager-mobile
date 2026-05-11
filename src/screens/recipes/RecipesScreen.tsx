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
