import React, { useEffect, useState, useRef } from "react";
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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import { EmptyState } from "@/components/EmptyState";
import {
  getShoppingLists,
  getShoppingList,
  createShoppingList,
  addItem as addShoppingItem,
  markPurchased,
  unmarkPurchased,
  deleteItem as deleteShoppingItem,
  completeList,
  type ShoppingList,
  type ShoppingListItem,
} from "@/api/shoppingLists";
import { addItem as addItemToPantry, getPantries } from "@/api/pantries";
import { getActiveGroup } from "@/services/groups";

type SeparatorRow = { id: string; separator: true };
type ShoppingListRow = ShoppingListItem | SeparatorRow;

export function ShoppingListsScreen() {
  const navigation = useNavigation<any>();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [activeGroupName, setActiveGroupName] = useState<string | null>(null);
  const [isListShared, setIsListShared] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  // Cargar lista de la compra
  const loadShoppingList = async () => {
    try {
      setLoading(true);

      const lists = await getShoppingLists();
      const activeList = lists.find((l) => l.status === "active");
      const activeGroup = await getActiveGroup();
      setActiveGroupName(activeGroup?.name || null);

      if (activeList) {
        const fullList = await getShoppingList(activeList.id);
        setList({ ...fullList, items: fullList.items || [] });
        setIsListShared(Boolean(activeGroup?.sharedShoppingListId && activeGroup.sharedShoppingListId === fullList.id));
      } else {
        // Crear una nueva lista si no existe activa
        const newList = await createShoppingList({ name: "Mi lista" });
        setList({ ...newList, items: newList.items || [] });
        setIsListShared(false);
      }
    } catch (error) {
      console.error("Error loading shopping list:", error);
      Alert.alert("Error", "No se pudo cargar la lista de la compra");
    } finally {
      setLoading(false);
    }
  };

  // Refrescar lista
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadShoppingList();
    setRefreshing(false);
  };

  // Cargar al montar y cada vez que pantalla se enfoca
  useEffect(() => {
    loadShoppingList();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadShoppingList();
    }, [])
  );

  // Añadir nuevo item
  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    try {
      setAddingItem(true);
      let targetList = list;
      if (!targetList) {
        const created = await createShoppingList({ name: "Mi lista" });
        targetList = { ...created, items: created.items || [] };
        setList(targetList);
      }

      const newItem = await addShoppingItem(targetList.id, {
        name: newItemText.trim(),
        quantity: 1,
        unit: "unidades",
      });

      // Actualizar list en estado (agregar el nuevo item)
      setList({
        ...targetList,
        items: [...(targetList.items || []), newItem],
      });

      setNewItemText("");
      Keyboard.dismiss();
      textInputRef.current?.blur();
    } catch (error) {
      console.error("Error adding item:", error);
      Alert.alert("Error", "No se pudo añadir el producto");
    } finally {
      setAddingItem(false);
    }
  };

  // Toggle comprado/no comprado
  const handleTogglePurchased = async (item: ShoppingListItem) => {
    if (!list) return;

    try {
      // Optimistic update
      const updatedItems = list.items.map((i) =>
        i.id === item.id ? { ...i, purchased: !i.purchased } : i
      );
      setList({ ...list, items: updatedItems });

      // API call
      if (item.purchased) {
        await unmarkPurchased(list.id, item.id);
      } else {
        await markPurchased(list.id, item.id);
      }
    } catch (error) {
      console.error("Error toggling purchased:", error);
      // Rollback
      setList(list);
      Alert.alert("Error", "No se pudo actualizar el estado");
    }
  };

  // Mover a despensa
  const handleMoveToPantry = async (item: ShoppingListItem) => {
    if (!list) return;

    try {
      Alert.alert(
        "Mover a despensa",
        `¿Mover "${item.name}" a la despensa?`,
        [
          { text: "Cancelar", onPress: () => {} },
          {
            text: "Mover",
            onPress: async () => {
              try {
                // Obtener primera despensa
                const pantries = await getPantries();
                if (!pantries || pantries.length === 0) {
                  Alert.alert("Error", "No hay despensas disponibles");
                  return;
                }

                const pantryId = pantries[0].id;

                // Añadir a despensa
                await addItemToPantry(pantryId, {
                  product_id: item.product_id,
                  quantity: item.quantity,
                  unit: item.unit,
                  expiry_date: new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000
                  ) // 30 días por defecto
                    .toISOString()
                    .split("T")[0],
                  location: "pantry",
                  notes: item.notes,
                });

                // Eliminar de lista
                await deleteShoppingItem(list.id, item.id);

                // Actualizar UI
                setList({
                  ...list,
                  items: list.items.filter((i) => i.id !== item.id),
                });

                Alert.alert("Éxito", `${item.name} movido a la despensa`);
              } catch (error) {
                console.error("Error moving to pantry:", error);
                Alert.alert("Error", "No se pudo mover a la despensa");
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Eliminar item
  const handleDeleteItem = async (item: ShoppingListItem) => {
    if (!list) return;

    Alert.alert(
      "Eliminar producto",
      `¿Estás seguro de que deseas eliminar "${item.name}"?`,
      [
        { text: "Cancelar", onPress: () => {} },
        {
          text: "Eliminar",
          onPress: async () => {
            try {
              await deleteShoppingItem(list.id, item.id);
              setList({
                ...list,
                items: list.items.filter((i) => i.id !== item.id),
              });
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

  // Completar lista
  const handleCompleteList = async () => {
    if (!list) return;

    Alert.alert(
      "Completar lista",
      "¿Marcar esta lista como completada?",
      [
        { text: "Cancelar", onPress: () => {} },
        {
          text: "Completar",
          onPress: async () => {
            try {
              setLoading(true);
              await completeList(list.id);

              // Crear nueva lista automáticamente
              const newList = await createShoppingList({ name: "Mi lista" });
              setList({ ...newList, items: newList.items || [] });

              Alert.alert("Éxito", "Lista completada");
            } catch (error) {
              console.error("Error completing list:", error);
              Alert.alert("Error", "No se pudo completar la lista");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const pendingItems = list?.items.filter((i) => !i.purchased) || [];
  const purchasedItems = list?.items.filter((i) => i.purchased) || [];
  const separatorRow: SeparatorRow = { id: "separator", separator: true };
  const openGroups = () => navigation.navigate("ProfileStack", { screen: "Groups" });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!list || list.items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi lista</Text>
          <Pressable onPress={openGroups}>
            <MaterialCommunityIcons name="account-group" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.shareCard}>
          <MaterialCommunityIcons name="share-variant" size={22} color={colors.primary} />
          <View style={styles.shareCardBody}>
            <Text style={styles.shareCardTitle}>
              {activeGroupName ? `Compartida con ${activeGroupName}` : "Sin grupo vinculado"}
            </Text>
            <Text style={styles.shareCardSubtitle}>
              {activeGroupName
                ? "Puedes vincular esta lista desde Grupos y compartidos."
                : "Crea o únete a un grupo para compartir listas."}
            </Text>
          </View>
          <Pressable onPress={openGroups}>
            <Text style={styles.shareCardAction}>Abrir</Text>
          </Pressable>
        </View>

        <View style={styles.emptyContainer}>
          <EmptyState
            icon="shopping-cart-outline"
            title="La lista está vacía"
            subtitle="Añade productos que necesites comprar"
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.inputContainer}
        >
          <View style={[styles.inputBox, shadows.sm]}>
            <TextInput
              ref={textInputRef}
              style={styles.input}
              placeholder="Añadir producto..."
              placeholderTextColor={colors.subtext}
              value={newItemText}
              onChangeText={setNewItemText}
              onSubmitEditing={handleAddItem}
              editable={!addingItem}
            />
            <Pressable
              onPress={handleAddItem}
              disabled={addingItem || !newItemText.trim()}
              style={[
                styles.addButton,
                (!newItemText.trim() || addingItem) &&
                  styles.addButtonDisabled,
              ]}
            >
              {addingItem ? (
                <ActivityIndicator
                  size="small"
                  color={colors.white}
                />
              ) : (
                <MaterialCommunityIcons
                  name="plus"
                  size={24}
                  color={colors.white}
                />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi lista</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={openGroups}>
            <MaterialCommunityIcons name="account-group" size={24} color={colors.primary} />
          </Pressable>
          <Pressable onPress={handleCompleteList}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={28}
              color={colors.primary}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.shareCard}>
        <MaterialCommunityIcons name="share-variant" size={22} color={colors.primary} />
        <View style={styles.shareCardBody}>
          <Text style={styles.shareCardTitle}>
            {activeGroupName ? `Compartida con ${activeGroupName}` : "Sin grupo vinculado"}
          </Text>
          <Text style={styles.shareCardSubtitle}>
            {isListShared
              ? "Esta lista ya está vinculada al grupo activo."
              : activeGroupName
                ? "Vincula la lista actual desde Grupos y compartidos."
                : "Crea o únete a un grupo para compartir listas."}
          </Text>
        </View>
        <Pressable onPress={openGroups}>
          <Text style={styles.shareCardAction}>Abrir</Text>
        </Pressable>
      </View>

      <FlatList
        data={
          pendingItems.length > 0
            ? [
                ...pendingItems,
                ...(purchasedItems.length > 0 ? [separatorRow] : []),
                ...purchasedItems,
              ]
            : purchasedItems
        }
        keyExtractor={(item) => item.id}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: { item: ShoppingListRow }) => {
          // Separator
          if ("separator" in item) {
            return (
              <View style={styles.sectionSeparator}>
                <Text style={styles.sectionLabel}>
                  Comprado ({purchasedItems.length})
                </Text>
              </View>
            );
          }

          return (
            <View
              style={[
                styles.itemContainer,
                item.purchased && styles.itemContainerPurchased,
              ]}
            >
              {/* Checkbox */}
              <Pressable
                onPress={() => handleTogglePurchased(item)}
                style={styles.checkbox}
              >
                <MaterialCommunityIcons
                  name={
                    item.purchased ? "checkbox-marked" : "checkbox-blank-outline"
                  }
                  size={24}
                  color={
                    item.purchased ? colors.primary : colors.subtext
                  }
                />
              </Pressable>

              {/* Info del producto */}
              <View style={styles.itemInfo}>
                <Text
                  style={[
                    styles.itemName,
                    item.purchased && styles.itemNamePurchased,
                  ]}
                >
                  {item.name}
                </Text>
                <Text style={styles.itemQuantity}>
                  {item.quantity} {item.unit}
                  {item.notes ? ` • ${item.notes}` : ""}
                </Text>
              </View>

              {/* Botones acción */}
              <View style={styles.itemActions}>
                {!item.purchased && (
                  <Pressable
                    onPress={() => handleMoveToPantry(item)}
                    style={styles.toPantryButton}
                  >
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={16}
                      color={colors.white}
                    />
                    <Text style={styles.toPantryText}>Despensa</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => handleDeleteItem(item)}
                  style={styles.deleteButton}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color={colors.subtext}
                  />
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <View style={[styles.inputBox, shadows.sm]}>
          <TextInput
            ref={textInputRef}
            style={styles.input}
            placeholder="Añadir producto..."
            placeholderTextColor={colors.subtext}
            value={newItemText}
            onChangeText={setNewItemText}
            onSubmitEditing={handleAddItem}
            editable={!addingItem}
          />
          <Pressable
            onPress={handleAddItem}
            disabled={addingItem || !newItemText.trim()}
            style={[
              styles.addButton,
              (!newItemText.trim() || addingItem) &&
                styles.addButtonDisabled,
            ]}
          >
            {addingItem ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <MaterialCommunityIcons
                name="plus"
                size={24}
                color={colors.white}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },
  listContent: {
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  itemContainer: {
  shareCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
  },
  shareCardBody: {
    flex: 1,
  },
  shareCardTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  shareCardSubtitle: {
    ...typography.bodySm,
    color: colors.subtext,
    marginTop: spacing.xs,
  },
  shareCardAction: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "700",
  },
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  itemContainerPurchased: {
    opacity: 0.6,
  },
  checkbox: {
    marginRight: spacing.md,
    padding: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  itemNamePurchased: {
    textDecorationLine: "line-through",
    color: colors.subtext,
  },
  itemQuantity: {
    ...typography.bodySm,
    color: colors.subtext,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  toPantryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  toPantryText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "600",
  },
  deleteButton: {
    padding: spacing.sm,
  },
  sectionSeparator: {
    marginVertical: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  sectionLabel: {
    ...typography.bodySm,
    color: colors.subtext,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  inputContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonDisabled: {
    backgroundColor: colors.subtext,
    opacity: 0.5,
  },
});