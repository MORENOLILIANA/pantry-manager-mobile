import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import type { PantriesStackParamList } from "@/navigation/stacks/AppStack";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  getPantries,
  getPantry,
  deleteItem as deleteItemApi,
  type Pantry,
  type PantryItem,
} from "@/api/pantries";

type Navigation = NativeStackNavigationProp<PantriesStackParamList>;

type LocationFilter = "all" | "refrigerator" | "freezer" | "pantry" | "other";
type ExpiryFilter = "all" | "normal" | "proximo" | "caducado";

const LOCATION_OPTIONS: { label: string; value: LocationFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Nevera", value: "refrigerator" },
  { label: "Congelador", value: "freezer" },
  { label: "Armario", value: "pantry" },
  { label: "Otro", value: "other" },
];

const LOCATION_DISPLAY: Record<string, string> = {
  refrigerator: "Nevera",
  freezer: "Congelador",
  pantry: "Armario",
  other: "Otro",
};

const EXPIRY_OPTIONS: { label: string; value: ExpiryFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Normales", value: "normal" },
  { label: "Próximos", value: "proximo" },
  { label: "Caducados", value: "caducado" },
];

export function PantriesScreen() {
  const navigation = useNavigation<Navigation>();

  const [pantry, setPantry] = useState<Pantry | null>(null);
  const [allItems, setAllItems] = useState<PantryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationFilter>("all");
  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryFilter>("all");

  const loadPantries = async () => {
    try {
      setLoading(true);
      const pantries = await getPantries();

      if (pantries && pantries.length > 0) {
        const firstPantry = pantries[0];
        const fullPantry = await getPantry(firstPantry.id);
        setPantry(fullPantry);
        setAllItems(fullPantry.items || []);
      }
    } catch (error) {
      console.error("Error loading pantries:", error);
      Alert.alert("Error", "No se pudieron cargar las despensas");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPantries();
    setRefreshing(false);
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (expiryDate: string) => {
    const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
    if (daysUntilExpiry < 0) return "caducado";
    if (daysUntilExpiry < 7) return "proximo";
    return "normal";
  };

  useEffect(() => {
    let filtered = allItems;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.product.name.toLowerCase().includes(query)
      );
    }

    if (selectedLocation !== "all") {
      filtered = filtered.filter((item) => item.location === selectedLocation);
    }

    if (selectedExpiry !== "all") {
      filtered = filtered.filter(
        (item) => getExpiryStatus(item.expiry_date) === selectedExpiry
      );
    }

    filtered = [...filtered].sort(
      (a, b) => getDaysUntilExpiry(a.expiry_date) - getDaysUntilExpiry(b.expiry_date)
    );

    setFilteredItems(filtered);
  }, [allItems, searchQuery, selectedLocation, selectedExpiry]);

  useEffect(() => {
    loadPantries();
  }, []);

  const expirySummary = useMemo(() => {
    return allItems.reduce(
      (acc, item) => {
        acc[getExpiryStatus(item.expiry_date)] += 1;
        return acc;
      },
      { normal: 0, proximo: 0, caducado: 0 }
    );
  }, [allItems]);

  const closestExpiry = useMemo(() => {
    if (!allItems.length) return null;
    return [...allItems].sort(
      (a, b) => getDaysUntilExpiry(a.expiry_date) - getDaysUntilExpiry(b.expiry_date)
    )[0];
  }, [allItems]);

  const handleDeleteItem = (item: PantryItem) => {
    if (!pantry) return;

    Alert.alert(
      "Eliminar producto",
      `¿Estás seguro de que deseas eliminar ${item.product.name}?`,
      [
        { text: "Cancelar", onPress: () => {} },
        {
          text: "Eliminar",
          onPress: async () => {
            try {
              await deleteItemApi(pantry.id, item.id);
              setAllItems(allItems.filter((i) => i.id !== item.id));
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "No se pudo eliminar el producto");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleEditItem = (item: PantryItem) => {
    if (!pantry) return;
    navigation.navigate("Products", {
      pantryId: pantry.id,
      itemId: item.id,
      mode: "edit",
      item,
    });
  };

  const handleAddItem = () => {
    if (!pantry) return;
    navigation.navigate("Products", {
      pantryId: pantry.id,
      mode: "add",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!pantry) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="cube-outline"
          title="Sin despensas"
          subtitle="No hay despensas disponibles"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{pantry.name}</Text>
        <Pressable onPress={handleAddItem} style={styles.addButton}>
          <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
        </Pressable>
      </View>

      {/* Búsqueda */}
      <View style={[styles.searchBox, shadows.sm]}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.subtext} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.subtext}
        />
      </View>

      {/* Filtros por ubicación */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={LOCATION_OPTIONS}
          keyExtractor={(item) => item.value}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedLocation(item.value)}
              style={[
                styles.filterChip,
                selectedLocation === item.value && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedLocation === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Filtros por caducidad */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={EXPIRY_OPTIONS}
          keyExtractor={(item) => item.value}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedExpiry(item.value)}
              style={[
                styles.filterChip,
                selectedExpiry === item.value && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedExpiry === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Resumen de caducidades */}
      <View style={styles.expirySummary}>
        <View style={[styles.summaryCard, shadows.sm]}>
          <Text style={styles.summaryValue}>{expirySummary.normal}</Text>
          <Text style={styles.summaryLabel}>Normales</Text>
        </View>
        <View style={[styles.summaryCard, shadows.sm]}>
          <Text style={styles.summaryValue}>{expirySummary.proximo}</Text>
          <Text style={styles.summaryLabel}>Próximos</Text>
        </View>
        <View style={[styles.summaryCard, shadows.sm]}>
          <Text
            style={[
              styles.summaryValue,
              expirySummary.caducado > 0 && styles.summaryValueDanger,
            ]}
          >
            {expirySummary.caducado}
          </Text>
          <Text style={styles.summaryLabel}>Caducados</Text>
        </View>
      </View>

      {/* Próximo a caducar */}
      {closestExpiry ? (
        <View style={styles.closestCard}>
          <MaterialCommunityIcons
            name={
              getExpiryStatus(closestExpiry.expiry_date) === "caducado"
                ? "alert-circle"
                : "clock-alert"
            }
            size={22}
            color={
              getExpiryStatus(closestExpiry.expiry_date) === "caducado"
                ? colors.error
                : "#F39C12"
            }
          />
          <View style={styles.closestText}>
            <Text style={styles.closestTitle}>Más próximo a caducar</Text>
            <Text style={styles.closestSubtitle}>
              {closestExpiry.product.name} ·{" "}
              {new Date(closestExpiry.expiry_date).toLocaleDateString("es-ES")}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Lista de items */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="package-outline"
            title="Sin productos"
            subtitle={
              searchQuery || selectedLocation !== "all"
                ? "No se encontraron productos con esos filtros"
                : "Añade el primer producto a tu despensa"
            }
            button={{ label: "Añadir producto", onPress: handleAddItem }}
          />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.itemWrapper}>
              <ProductCard
                name={item.product.name}
                brand={item.product.brand || "Sin marca"}
                quantity={item.quantity}
                unit={item.unit}
                location={LOCATION_DISPLAY[item.location] || item.location}
                onEdit={() => handleEditItem(item)}
                onDelete={() => handleDeleteItem(item)}
              />
              <View style={styles.itemMeta}>
                <StatusBadge status={getExpiryStatus(item.expiry_date)} />
                <Text style={styles.expiryDate}>
                  {new Date(item.expiry_date).toLocaleDateString("es-ES")}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    marginRight: spacing.sm,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    ...typography.bodySm,
    color: colors.primary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  expirySummary: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  summaryValue: {
    ...typography.h2,
    color: colors.text,
  },
  summaryValueDanger: {
    color: colors.error,
  },
  summaryLabel: {
    ...typography.bodySm,
    color: colors.subtext,
    marginTop: spacing.xs,
  },
  closestCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
  },
  closestText: {
    flex: 1,
  },
  closestTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  closestSubtitle: {
    ...typography.bodySm,
    color: colors.subtext,
    marginTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  itemWrapper: {
    marginBottom: spacing.lg,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  expiryDate: {
    ...typography.bodySm,
    color: colors.subtext,
    marginLeft: spacing.md,
  },
});