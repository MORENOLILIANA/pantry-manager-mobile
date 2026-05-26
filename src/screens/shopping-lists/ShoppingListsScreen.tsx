import React, { useState, useRef, useCallback, useEffect } from "react";
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
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { ShoppingListStackParamList } from "@/navigation/stacks/AppStack";
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

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const UNITS = ["ud", "kg", "g", "L", "ml", "paq"];

type EditState = {
  item: ShoppingListItem;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
};

function ItemAvatar({ name, purchased }: { name: string; purchased: boolean }) {
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  if (purchased) {
    return (
      <View style={[avStyles.circle, avStyles.circleChecked]}>
        <MaterialCommunityIcons name="check" size={18} color={colors.white} />
      </View>
    );
  }
  return (
    <View style={avStyles.circle}>
      <Text style={avStyles.letter}>{letter}</Text>
    </View>
  );
}

const avStyles = StyleSheet.create({
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  circleChecked: {
    backgroundColor: colors.primary,
  },
  letter: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.primary,
  },
});

export function ShoppingListsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ShoppingListStackParamList, "ShoppingLists">>();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [purchasedExpanded, setPurchasedExpanded] = useState(true);
  const textInputRef = useRef<TextInput>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const params = route.params as any;
    if (params?.scannedProduct !== undefined) {
      if (params.scannedProduct?.name) {
        setNewItemText(params.scannedProduct.name);
      }
      (navigation as any).setParams({ scannedProduct: undefined });
      setTimeout(() => textInputRef.current?.focus(), 300);
    }
  }, [route.params]);

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
      "Eliminar producto",
      `¿Quitar "${item.name}" de la lista?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
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

  const togglePurchasedExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPurchasedExpanded((v) => !v);
  };

  const pendingItems = list?.items.filter((i) => !i.purchased) || [];
  const purchasedItems = list?.items.filter((i) => i.purchased) || [];
  const totalCount = list?.items.length || 0;
  const purchasedCount = purchasedItems.length;
  const progress = totalCount > 0 ? purchasedCount / totalCount : 0;
  const allDone = totalCount > 0 && purchasedCount === totalCount;

  const renderPendingItem = ({ item }: { item: ShoppingListItem }) => (
    <Pressable
      style={({ pressed }) => [styles.itemCard, pressed && styles.itemCardPressed]}
      onPress={() => handleOpenEdit(item)}
      onLongPress={() => handleDeleteItem(item)}
    >
      <Pressable onPress={() => handleTogglePurchased(item)} hitSlop={10}>
        <ItemAvatar name={item.name} purchased={false} />
      </Pressable>

      <View style={styles.itemBody}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.itemMeta}>
          <View style={styles.qtyChip}>
            <Text style={styles.qtyChipText}>{item.quantity} {item.unit}</Text>
          </View>
          {item.notes ? (
            <Text style={styles.itemNote} numberOfLines={1}>{item.notes}</Text>
          ) : null}
        </View>
      </View>

      <Pressable onPress={() => handleDeleteItem(item)} hitSlop={8} style={styles.trashBtn}>
        <MaterialCommunityIcons name="close" size={18} color={colors.placeholder} />
      </Pressable>
    </Pressable>
  );

  const renderPurchasedItem = ({ item }: { item: ShoppingListItem }) => (
    <Pressable
      style={[styles.itemCard, styles.itemCardPurchased]}
      onPress={() => handleTogglePurchased(item)}
    >
      <ItemAvatar name={item.name} purchased />

      <View style={styles.itemBody}>
        <Text style={[styles.itemName, styles.itemNamePurchased]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.itemMeta}>
          <View style={[styles.qtyChip, styles.qtyChipPurchased]}>
            <Text style={[styles.qtyChipText, styles.qtyChipTextPurchased]}>{item.quantity} {item.unit}</Text>
          </View>
        </View>
      </View>

      <Pressable onPress={() => handleMoveToPantry(item)} hitSlop={8} style={styles.fridgeBtn}>
        <MaterialCommunityIcons name="fridge-outline" size={20} color={colors.primary} />
      </Pressable>
    </Pressable>
  );

  const ListHeader = () => (
    <View style={styles.progressCard}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>
          {allDone
            ? "¡Todo listo!"
            : pendingItems.length === 0
            ? "Sin productos"
            : `${pendingItems.length} ${pendingItems.length === 1 ? "producto" : "productos"} por comprar`}
        </Text>
        <Text style={[styles.progressPct, allDone && styles.progressPctDone]}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { flex: progress || 0.001 },
            allDone && styles.progressFillDone,
          ]}
        />
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Mi lista</Text>
            {totalCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{totalCount}</Text>
              </View>
            )}
          </View>
          {totalCount > 0 && (
            <Pressable onPress={handleCompleteList} style={styles.completeBtn} hitSlop={8}>
              <MaterialCommunityIcons name="check-all" size={16} color={colors.primary} />
              <Text style={styles.completeBtnText}>Vaciar</Text>
            </Pressable>
          )}
        </View>

        {totalCount === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="cart-outline"
              title="La lista está vacía"
              subtitle="Escribe un producto abajo o escanea un código de barras"
            />
          </View>
        ) : (
          <FlatList
            data={pendingItems}
            keyExtractor={(item) => item.id}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={ListHeader}
            renderItem={renderPendingItem}
            ListFooterComponent={
              purchasedItems.length > 0 ? (
                <View style={styles.purchasedSection}>
                  <Pressable onPress={togglePurchasedExpanded} style={styles.purchasedHeader}>
                    <View style={styles.purchasedHeaderLeft}>
                      <MaterialCommunityIcons name="cart-check" size={16} color={colors.subtext} />
                      <Text style={styles.purchasedHeaderText}>
                        En el carrito · {purchasedItems.length}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={purchasedExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.subtext}
                    />
                  </Pressable>

                  {purchasedExpanded &&
                    purchasedItems.map((item) => (
                      <View key={item.id}>{renderPurchasedItem({ item })}</View>
                    ))}
                </View>
              ) : null
            }
          />
        )}

        {/* Add input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Pressable
              onPress={() =>
                (navigation as any).navigate("PantriesStack", {
                  screen: "BarcodeScan",
                  params: { shoppingListMode: true },
                })
              }
              style={styles.scanBtn}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="barcode-scan" size={22} color={colors.primary} />
            </Pressable>

            <TextInput
              ref={textInputRef}
              style={styles.input}
              placeholder="Añadir producto..."
              placeholderTextColor={colors.placeholder}
              value={newItemText}
              onChangeText={setNewItemText}
              onSubmitEditing={handleAddItem}
              editable={!addingItem}
              returnKeyType="done"
            />

            <Pressable
              onPress={handleAddItem}
              disabled={addingItem || !newItemText.trim()}
              style={[
                styles.sendBtn,
                (!newItemText.trim() || addingItem) && styles.sendBtnDisabled,
              ]}
            >
              {addingItem ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <MaterialCommunityIcons name="arrow-up" size={20} color={colors.white} />
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
              onChangeText={(t) => setEditState((s) => (s ? { ...s, name: t } : s))}
              placeholder="Nombre del producto"
              placeholderTextColor={colors.placeholder}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Cantidad</Text>
            <View style={styles.qtyRow}>
              <Pressable
                onPress={() =>
                  setEditState((s) => (s ? { ...s, quantity: Math.max(1, s.quantity - 1) } : s))
                }
                style={styles.qtyStepBtn}
              >
                <MaterialCommunityIcons name="minus" size={20} color={colors.text} />
              </Pressable>
              <Text style={styles.qtyValue}>{editState?.quantity ?? 1}</Text>
              <Pressable
                onPress={() =>
                  setEditState((s) => (s ? { ...s, quantity: s.quantity + 1 } : s))
                }
                style={styles.qtyStepBtn}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Unidad</Text>
            <View style={styles.unitRow}>
              {UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setEditState((s) => (s ? { ...s, unit: u } : s))}
                  style={[styles.unitChip, editState?.unit === u && styles.unitChipActive]}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      editState?.unit === u && styles.unitChipTextActive,
                    ]}
                  >
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Notas (opcional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={editState?.notes}
              onChangeText={(t) => setEditState((s) => (s ? { ...s, notes: t } : s))}
              placeholder="Ej. sin sal, marca X..."
              placeholderTextColor={colors.placeholder}
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
    backgroundColor: "#F0F4F3",
  },
  flex: { flex: 1 },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 7,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },

  // Progress
  progressCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  progressLabel: {
    ...typography.bodySm,
    color: colors.subtext,
    fontWeight: "500",
  },
  progressPct: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "700",
  },
  progressPctDone: {
    color: colors.success,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E8F5E9",
    flexDirection: "row",
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressFillDone: {
    backgroundColor: colors.success,
  },

  // List
  listContent: {
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },

  // Item cards
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  itemCardPressed: {
    opacity: 0.85,
  },
  itemCardPurchased: {
    opacity: 0.65,
    ...shadows.sm,
  },
  itemBody: {
    flex: 1,
    marginLeft: spacing.md,
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  itemNamePurchased: {
    textDecorationLine: "line-through",
    color: colors.subtext,
    fontWeight: "400",
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  qtyChip: {
    backgroundColor: "#E8F5E9",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  qtyChipPurchased: {
    backgroundColor: colors.border,
  },
  qtyChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  qtyChipTextPurchased: {
    color: colors.subtext,
  },
  itemNote: {
    fontSize: 12,
    color: colors.subtext,
    fontStyle: "italic",
    flex: 1,
  },
  trashBtn: {
    padding: spacing.xs,
  },
  fridgeBtn: {
    padding: spacing.xs,
  },

  // Purchased section
  purchasedSection: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
  },
  purchasedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  purchasedHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  purchasedHeaderText: {
    ...typography.bodySm,
    color: colors.subtext,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Input area
  inputContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4F3",
    borderRadius: borderRadius.full,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  scanBtn: {
    padding: spacing.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: colors.disabled,
  },

  // Edit modal
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
  qtyStepBtn: {
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
