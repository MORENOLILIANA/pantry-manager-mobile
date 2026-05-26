import React, { useState, useRef, useCallback } from "react";
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
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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
  updateItem as updateShoppingItem,
  completeList,
  type ShoppingList,
  type ShoppingListItem,
} from "@/api/shoppingLists";
import { addItem as addItemToPantry, getPantries } from "@/api/pantries";

const UNITS = ["ud", "kg", "g", "L", "ml", "paq"];

type SeparatorRow = { id: string; separator: true };
type ShoppingListRow = ShoppingListItem | SeparatorRow;

type EditState = {
  item: ShoppingListItem;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
};

export function ShoppingListsScreen() {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const initialLoadDone = useRef(false);

  const loadShoppingList = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const lists = await getShoppingLists();
      const activeList = lists.find((l) => l.status === "active");
      if (activeList) {
        const fullList = await getShoppingList(activeList.id);
        setList({ ...fullList, items: fullList.items || [] });
      } else {
        const newList = await createShoppingList({ name: "Mi lista" });
        setList({ ...newList, items: newList.items || [] });
      }
    } catch (error) {
      console.error("Error loading shopping list:", error);
      if (!silent) Alert.alert("Error", "No se pudo cargar la lista de la compra");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        loadShoppingList(false);
      } else {
        loadShoppingList(true);
      }
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadShoppingList(true);
    setRefreshing(false);
  };

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
        unit: "ud",
      });
      setList({ ...targetList, items: [...(targetList.items || []), newItem] });
      setNewItemText("");
      Keyboard.dismiss();
    } catch (error) {
      console.error("Error adding item:", error);
      Alert.alert("Error", "No se pudo añadir el producto");
    } finally {
      setAddingItem(false);
    }
  };

  const handleTogglePurchased = async (item: ShoppingListItem) => {
    if (!list) return;
    const updatedItems = list.items.map((i) =>
      i.id === item.id ? { ...i, purchased: !i.purchased } : i
    );
    setList({ ...list, items: updatedItems });
    try {
      if (item.purchased) {
        await unmarkPurchased(list.id, item.id);
      } else {
        await markPurchased(list.id, item.id);
      }
    } catch {
      setList(list);
      Alert.alert("Error", "No se pudo actualizar el estado");
    }
  };

  const handleOpenEdit = (item: ShoppingListItem) => {
    setEditState({
      item,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editState || !list) return;
    if (!editState.name.trim()) {
      Alert.alert("Error", "El nombre no puede estar vacío");
      return;
    }
    setSaving(true);
    try {
      // Delete old item then re-add with updated data (avoids needing a PUT endpoint)
      const wasPurchased = editState.item.purchased;
      await deleteShoppingItem(list.id, editState.item.id);
      let newItem = await addShoppingItem(list.id, {
        name: editState.name.trim(),
        quantity: editState.quantity,
        unit: editState.unit,
        notes: editState.notes.trim() || undefined,
      });
      if (wasPurchased) {
        newItem = await markPurchased(list.id, newItem.id);
      }
      setList({
        ...list,
        items: list.items.map((i) => (i.id === editState.item.id ? newItem : i)),
      });
      setEditState(null);
    } catch {
      Alert.alert("Error", "No se pudo guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveToPantry = (item: ShoppingListItem) => {
    if (!list) return;
    Alert.alert(
      "Guardar en despensa",
      `¿Añadir "${item.name}" a tu despensa?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Guardar",
          onPress: async () => {
            try {
              const pantries = await getPantries();
              if (!pantries?.length) {
                Alert.alert("Error", "No hay despensas disponibles");
                return;
              }
              const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              const expiry = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              await addItemToPantry(pantries[0].id, {
                product_id: item.product_id,
                quantity: item.quantity,
                unit: item.unit,
                expiry_date: expiry,
                location: "pantry",
                notes: item.notes,
                product_name: item.name,
              });
              await deleteShoppingItem(list.id, item.id);
              setList({ ...list, items: list.items.filter((i) => i.id !== item.id) });
            } catch {
              Alert.alert("Error", "No se pudo mover a la despensa");
            }
          },
        },
      ]
    );
  };

  const handleDeleteItem = (item: ShoppingListItem) => {
    if (!list) return;
    Alert.alert(
      "Eliminar",
      `¿Eliminar "${item.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteShoppingItem(list.id, item.id);
              setList({ ...list, items: list.items.filter((i) => i.id !== item.id) });
            } catch {
              Alert.alert("Error", "No se pudo eliminar el producto");
            }
          },
        },
      ]
    );
  };

  const handleCompleteList = () => {
    if (!list) return;
    Alert.alert(
      "Vaciar lista",
      "¿Marcar la lista como completada y comenzar una nueva?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Completar",
          onPress: async () => {
            try {
              setLoading(true);
              await completeList(list.id);
              const newList = await createShoppingList({ name: "Mi lista" });
              setList({ ...newList, items: newList.items || [] });
            } catch {
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
  const totalCount = list?.items.length || 0;
  const purchasedCount = purchasedItems.length;
  const progress = totalCount > 0 ? purchasedCount / totalCount : 0;
  const separatorRow: SeparatorRow = { id: "separator", separator: true };

  const renderItem = ({ item }: { item: ShoppingListRow }) => {
    if ("separator" in item) {
      return (
        <View style={styles.sectionSeparator}>
          <MaterialCommunityIcons name="cart-check" size={14} color={colors.subtext} />
          <Text style={styles.sectionLabel}>En el carro · {purchasedItems.length}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.itemContainer, item.purchased && styles.itemContainerPurchased]}>
        <Pressable onPress={() => handleTogglePurchased(item)} style={styles.checkboxArea} hitSlop={8}>
          <View style={[styles.checkbox, item.purchased && styles.checkboxChecked]}>
            {item.purchased && (
              <MaterialCommunityIcons name="check" size={14} color={colors.white} />
            )}
          </View>
        </Pressable>

        <Pressable
          style={styles.itemInfo}
          onPress={() => !item.purchased && handleOpenEdit(item)}
        >
          <Text style={[styles.itemName, item.purchased && styles.itemNamePurchased]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.itemQuantity}>
            {item.quantity} {item.unit}
            {item.notes ? ` · ${item.notes}` : ""}
          </Text>
        </Pressable>

        <View style={styles.itemActions}>
          {item.purchased ? (
            <Pressable onPress={() => handleMoveToPantry(item)} style={styles.iconBtn} hitSlop={8}>
              <MaterialCommunityIcons name="fridge-outline" size={20} color={colors.primary} />
            </Pressable>
          ) : (
            <Pressable onPress={() => handleOpenEdit(item)} style={styles.iconBtn} hitSlop={8}>
              <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.subtext} />
            </Pressable>
          )}
          <Pressable onPress={() => handleDeleteItem(item)} style={styles.iconBtn} hitSlop={8}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View style={styles.progressSection}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>
          {purchasedCount === totalCount && totalCount > 0
            ? "¡Lista completa!"
            : `${purchasedCount} de ${totalCount} productos`}
        </Text>
        <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { flex: progress || 0.001 }]} />
        <View style={{ flex: Math.max(1 - progress, 0.001) }} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Mi lista</Text>
        </View>
        <View style={styles.headerRight}>
          {totalCount > 0 && (
            <Pressable onPress={handleCompleteList} hitSlop={8}>
              <MaterialCommunityIcons name="check-all" size={24} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>

      {totalCount === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="cart-outline"
            title="La lista está vacía"
            subtitle="Añade productos que necesites comprar"
          />
        </View>
      ) : (
        <FlatList
          data={
            pendingItems.length > 0
              ? [...pendingItems, ...(purchasedItems.length > 0 ? [separatorRow] : []), ...purchasedItems]
              : purchasedItems
          }
          keyExtractor={(item) => item.id}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={ListHeader}
          renderItem={renderItem}
        />
      )}

      {/* Add input */}
      <View style={styles.inputContainer}>
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
            returnKeyType="done"
          />
          <Pressable
            onPress={handleAddItem}
            disabled={addingItem || !newItemText.trim()}
            style={[styles.addButton, (!newItemText.trim() || addingItem) && styles.addButtonDisabled]}
          >
            {addingItem ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
            )}
          </Pressable>
        </View>
      </View>
      </KeyboardAvoidingView>

      {/* Edit modal */}
      <Modal
        visible={editState !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditState(null)}
      >
        <View style={styles.modalWrapper}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditState(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Editar producto</Text>

            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput
              style={styles.fieldInput}
              value={editState?.name}
              onChangeText={(t) => setEditState((s) => s ? { ...s, name: t } : s)}
              placeholder="Nombre del producto"
              placeholderTextColor={colors.subtext}
            />

            <Text style={styles.fieldLabel}>Cantidad</Text>
            <View style={styles.qtyRow}>
              <Pressable
                onPress={() => setEditState((s) => s ? { ...s, quantity: Math.max(1, s.quantity - 1) } : s)}
                style={styles.qtyBtn}
              >
                <MaterialCommunityIcons name="minus" size={20} color={colors.text} />
              </Pressable>
              <Text style={styles.qtyValue}>{editState?.quantity ?? 1}</Text>
              <Pressable
                onPress={() => setEditState((s) => s ? { ...s, quantity: s.quantity + 1 } : s)}
                style={styles.qtyBtn}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Unidad</Text>
            <View style={styles.unitRow}>
              {UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setEditState((s) => s ? { ...s, unit: u } : s)}
                  style={[styles.unitChip, editState?.unit === u && styles.unitChipActive]}
                >
                  <Text style={[styles.unitChipText, editState?.unit === u && styles.unitChipTextActive]}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Notas (opcional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={editState?.notes}
              onChangeText={(t) => setEditState((s) => s ? { ...s, notes: t } : s)}
              placeholder="Ej. sin sal, marca X..."
              placeholderTextColor={colors.subtext}
            />

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditState(null)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSaveEdit} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  flex: {
    flex: 1,
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {},
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  progressSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    marginBottom: spacing.xs,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  progressLabel: {
    ...typography.bodySm,
    color: colors.subtext,
  },
  progressPct: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    flexDirection: "row",
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  sectionSeparator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionLabel: {
    ...typography.bodySm,
    color: colors.subtext,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
  },
  itemContainerPurchased: {
    opacity: 0.6,
  },
  checkboxArea: {
    marginRight: spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  itemNamePurchased: {
    textDecorationLine: "line-through",
    color: colors.subtext,
    fontWeight: "400",
  },
  itemQuantity: {
    ...typography.bodySm,
    color: colors.subtext,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: spacing.sm,
  },
  iconBtn: {
    padding: spacing.sm,
  },
  inputContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
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
    backgroundColor: colors.disabled,
  },
  modalWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.subtext,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.secondary,
  },
  qtyValue: {
    ...typography.h3,
    color: colors.text,
    minWidth: 48,
    textAlign: "center",
  },
  unitRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  unitChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
  },
  unitChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitChipText: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
  },
  unitChipTextActive: {
    color: colors.white,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelBtnText: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  saveBtnText: {
    ...typography.body,
    color: colors.white,
    fontWeight: "600",
  },
});
