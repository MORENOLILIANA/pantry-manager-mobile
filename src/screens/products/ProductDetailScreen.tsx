import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet, View, Text, SafeAreaView, ScrollView,
  Pressable, Alert, Image, FlatList, Dimensions, Modal, ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import type { PantriesStackParamList } from "@/navigation/stacks/AppStack";
import { deleteItem as deleteItemApi, addItem as addItemApi, updateItem, getPantries, type Pantry, type PantryItem, type NutritionalInfo } from "@/api/pantries";
import { fetchNutritionalFromOFF } from "@/api/products";
import { getProductImage } from "@/services/productImages";
import { calculateNutriscore } from "@/utils/nutriscore";

type Navigation = NativeStackNavigationProp<PantriesStackParamList>;
type Route = RouteProp<PantriesStackParamList, "ProductDetail">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const LOCATION_DISPLAY: Record<string, string> = {
  refrigerator: "Nevera", freezer: "Congelador", pantry: "Armario", other: "Otro",
};
const NUTRISCORE_COLORS: Record<string, string> = {
  A: "#038141", B: "#85BB2F", C: "#FECB02", D: "#EE8100", E: "#E63E11",
};
const STATUS_BG:    Record<string, string> = { caducado: "#FADBD8", proximo: "#FFF3E0", normal: "#D5F4E6" };
const STATUS_COLOR: Record<string, string> = { caducado: "#E74C3C", proximo: "#F39C12", normal: "#27AE60" };

function getExpiryInfo(expiryDate: string): { label: string; status: "normal" | "proximo" | "caducado" } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const datePart = (expiryDate || "").split("T")[0];
  const parts = datePart.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return { label: "Sin fecha", status: "normal" };
  const expiry = new Date(parts[0], parts[1] - 1, parts[2]);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0)  return { label: "Caducado",    status: "caducado" };
  if (days === 0) return { label: "Caduca hoy", status: "proximo"  };
  if (days === 1) return { label: "Mañana",     status: "proximo"  };
  if (days < 7)  return { label: `${days} días`, status: "proximo" };
  return { label: `${days} días`, status: "normal" };
}

function getCategoryIcon(category?: string): string {
  if (!category) return "package-variant";
  const s = category.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/(lact|leche|queso|yogur|nata|mantequilla)/.test(s)) return "cup";
  if (/(carne|pollo|cerdo|ternera|pesc|mariscos|jamon|embutid|salchich)/.test(s)) return "food-drumstick";
  if (/(fruta|verdura|vegetal|legumbre|hortaliza)/.test(s)) return "food-apple";
  if (/(cereal|pasta|arroz|pan|harina|galleta|avena)/.test(s)) return "bread-slice";
  if (/(bebida|zumo|agua|refresc|cafe|vino|cerveza)/.test(s)) return "bottle-wine";
  if (/(conserva|lata|bote|enlatad)/.test(s)) return "archive";
  if (/congelad/.test(s)) return "snowflake";
  if (/(fruto.seco|nuez|almendra|pistacho|anacardo|avellana|cacahuete)/.test(s)) return "food-variant";
  if (/(limpiez|detergente|jabón|jabon|suavizante|limpiad|bayeta)/.test(s)) return "broom";
  if (/(higiene|champu|gel de|pasta diente|desodorante)/.test(s)) return "shower";
  return "package-variant";
}

function formatDate(date: string): string {
  try {
    const datePart = date.split("T")[0];
    const [y, m, d] = datePart.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch { return date; }
}

// ─── Una página del carrusel ───────────────────────────────────────────────────

function ProductPage({
  item,
  pantryId,
  onEdit,
  onDelete,
  onMove,
}: {
  item: PantryItem;
  pantryId: string;
  onEdit: () => void;
  onDelete: () => void;
  onMove?: () => void;
}) {
  const [imageUri, setImageUri] = useState<string | null>(item.product.image_url || null);
  const [liveNutritional, setLiveNutritional] = useState<NutritionalInfo | null>(null);

  useEffect(() => {
    if (item.product.id) {
      getProductImage(item.product.id)
        .then((uri) => { if (uri) setImageUri(uri); })
        .catch(() => {});
    }
  }, [item.product.id]);

  // Si el producto tiene código de barras pero sin datos nutricionales → los busca en OFF
  useEffect(() => {
    if (item.product.calories != null) return;
    const barcode = item.product.barcode;
    if (!barcode) return;
    fetchNutritionalFromOFF(barcode).then((info) => {
      if (!info) return;
      setLiveNutritional(info);
      updateItem(pantryId, item.id, { nutritional_info: info }).catch(() => {});
    });
  }, [item.product.id]);

  // Si tiene datos nutricionales pero no tiene nutriscore → pide al backend que lo calcule
  useEffect(() => {
    if (item.product.calories == null) return;   // sin datos: el efecto anterior lo gestiona
    if (item.product.nutriscore != null) return; // ya tiene nutriscore, nada que hacer
    const info: NutritionalInfo = {
      calories:      parseFloat(String(item.product.calories)),
      proteins:      item.product.proteins      != null ? parseFloat(String(item.product.proteins))           : undefined,
      carbs:         item.product.carbohydrates != null ? parseFloat(String(item.product.carbohydrates))      : undefined,
      fats:          item.product.fats          != null ? parseFloat(String(item.product.fats))               : undefined,
      saturated_fat: item.product.saturated_fat_per_100g != null ? parseFloat(String(item.product.saturated_fat_per_100g)) : undefined,
      fiber:         item.product.fiber         != null ? parseFloat(String(item.product.fiber))              : undefined,
      sugars:        item.product.sugar         != null ? parseFloat(String(item.product.sugar))              : undefined,
      salt:          item.product.salt          != null ? parseFloat(String(item.product.salt))               : undefined,
      // nutriscore ausente → backend lo calcula y lo persiste
    };
    updateItem(pantryId, item.id, { nutritional_info: info }).catch(() => {});
  }, [item.product.id]);

  const expiryInfo = getExpiryInfo(item.expiry_date);

  const nutritionalInfo: NutritionalInfo | undefined =
    item.product.calories != null
      ? {
          calories:      parseFloat(String(item.product.calories)),
          proteins:      item.product.proteins      != null ? parseFloat(String(item.product.proteins))           : undefined,
          carbs:         item.product.carbohydrates != null ? parseFloat(String(item.product.carbohydrates))      : undefined,
          fats:          item.product.fats          != null ? parseFloat(String(item.product.fats))               : undefined,
          saturated_fat: item.product.saturated_fat_per_100g != null ? parseFloat(String(item.product.saturated_fat_per_100g)) : undefined,
          fiber:         item.product.fiber         != null ? parseFloat(String(item.product.fiber))              : undefined,
          sugars:        item.product.sugar         != null ? parseFloat(String(item.product.sugar))              : undefined,
          salt:          item.product.salt          != null ? parseFloat(String(item.product.salt))               : undefined,
          nutriscore:    item.product.nutriscore ?? undefined,
        }
      : liveNutritional ?? undefined;

  const officialNutriscore  = nutritionalInfo?.nutriscore;
  const estimatedNutriscore = nutritionalInfo && !officialNutriscore ? calculateNutriscore(nutritionalInfo, item.product.category) : null;
  const displayNutriscore   = officialNutriscore ?? estimatedNutriscore ?? null;

  return (
    <ScrollView
      style={{ width: SCREEN_WIDTH }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.pageBody}
    >
      {/* Imagen */}
      <View style={styles.imageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialCommunityIcons
              name={getCategoryIcon(item.product.category) as any}
              size={80}
              color={colors.subtext}
            />
          </View>
        )}
        <View style={[styles.expiryBadge, { backgroundColor: STATUS_BG[expiryInfo.status] }]}>
          <MaterialCommunityIcons
            name={expiryInfo.status === "caducado" ? "alert-circle" : expiryInfo.status === "proximo" ? "clock-alert" : "check-circle"}
            size={14}
            color={STATUS_COLOR[expiryInfo.status]}
          />
          <Text style={[styles.expiryBadgeText, { color: STATUS_COLOR[expiryInfo.status] }]}>
            {expiryInfo.label}
          </Text>
        </View>
      </View>

      {/* Nombre y marca */}
      <View style={styles.titleSection}>
        <Text style={styles.productName}>{item.product.name}</Text>
        {item.product.brand ? <Text style={styles.productBrand}>{item.product.brand}</Text> : null}
      </View>

      {/* Acciones */}
      <View style={styles.actionRow}>
        <Pressable style={styles.actionBtn} onPress={onEdit}>
          <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
          <Text style={styles.actionBtnText}>Editar</Text>
        </Pressable>
        {onMove && (
          <>
            <View style={styles.actionDivider} />
            <Pressable style={styles.actionBtn} onPress={onMove}>
              <MaterialCommunityIcons name="folder-move-outline" size={18} color={colors.primary} />
              <Text style={styles.actionBtnText}>Mover</Text>
            </Pressable>
          </>
        )}
        <View style={styles.actionDivider} />
        <Pressable style={styles.actionBtn} onPress={onDelete}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
          <Text style={[styles.actionBtnText, { color: colors.error }]}>Eliminar</Text>
        </Pressable>
      </View>

      {/* Info */}
      <View style={[styles.infoCard, shadows.sm]}>
        <InfoRow icon="package-variant-closed" label="Cantidad"  value={`${item.quantity} ${item.unit}`} />
        <InfoRow icon="map-marker-outline"     label="Ubicación" value={LOCATION_DISPLAY[item.location] || item.location} />
        <InfoRow icon="calendar-outline"       label="Caducidad" value={formatDate(item.expiry_date)} />
        {item.notes ? <InfoRow icon="note-text-outline"  label="Notas"      value={item.notes} /> : null}
        {item.added_by?.name
          ? <InfoRow icon="account-outline" label="Añadido por" value={item.added_by.name} last />
          : <InfoRow icon="package-variant-closed" label="" value="" last />}
      </View>

      {/* Panel nutricional */}
      {nutritionalInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información nutricional</Text>
          <View style={[styles.infoCard, shadows.sm]}>
            {displayNutriscore && (
              <View style={styles.nutriScoreRow}>
                <View style={styles.nutriScoreLabelWrap}>
                  <Text style={styles.nutriScoreLabel}>Nutri-Score</Text>
                  {estimatedNutriscore && (
                    <Text style={styles.nutriScoreEst}>estimado</Text>
                  )}
                </View>
                {(["A", "B", "C", "D", "E"] as const).map((letter) => {
                  const active = letter === displayNutriscore;
                  return (
                    <View
                      key={letter}
                      style={[
                        styles.nutriScoreLetter,
                        active && { backgroundColor: NUTRISCORE_COLORS[letter], transform: [{ scale: 1.2 }] },
                      ]}
                    >
                      <Text style={[styles.nutriLetterText, active && styles.nutriLetterActive]}>
                        {letter}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
            <Text style={styles.nutriPer100}>Por 100g de producto</Text>
            {[
              { label: "Calorías",      icon: "fire",             value: nutritionalInfo.calories   != null ? `${nutritionalInfo.calories} kcal` : null },
              { label: "Proteínas",     icon: "arm-flex-outline", value: nutritionalInfo.proteins   != null ? `${nutritionalInfo.proteins.toFixed(1)}g` : null },
              { label: "Carbohidratos", icon: "grain",            value: nutritionalInfo.carbs      != null ? `${nutritionalInfo.carbs.toFixed(1)}g` : null },
              { label: "Grasas",        icon: "water-outline",    value: nutritionalInfo.fats       != null ? `${nutritionalInfo.fats.toFixed(1)}g` : null },
              { label: "Fibra",         icon: "leaf-outline",     value: nutritionalInfo.fiber      != null ? `${nutritionalInfo.fiber.toFixed(1)}g` : null },
              { label: "Azúcares",      icon: "cube-outline",     value: nutritionalInfo.sugars     != null ? `${nutritionalInfo.sugars.toFixed(1)}g` : null },
              { label: "Sal",           icon: "shaker-outline",   value: nutritionalInfo.salt       != null ? `${nutritionalInfo.salt.toFixed(2)}g` : null },
            ]
              .filter((r) => r.value !== null)
              .map(({ label, icon, value }) => (
                <View key={label} style={styles.nutriRow}>
                  <MaterialCommunityIcons name={icon as any} size={16} color={colors.primary} />
                  <Text style={styles.nutriLabel}>{label}</Text>
                  <Text style={styles.nutriValue}>{value}</Text>
                </View>
              ))}
          </View>
        </View>
      )}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, last }: {
  icon: string; label: string; value: string; last?: boolean;
}) {
  if (!label && !value) return null;
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <MaterialCommunityIcons name={icon as any} size={18} color={colors.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ─── Screen principal con carrusel ────────────────────────────────────────────

export function ProductDetailScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { pantryId, items, initialIndex } = route.params;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  const [allPantries, setAllPantries] = useState<Pantry[]>([]);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [movingItem, setMovingItem] = useState<PantryItem | null>(null);
  const [movingToPantryId, setMovingToPantryId] = useState<string | null>(null);

  const currentItem = items[currentIndex] ?? items[0];

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleEdit = useCallback((item: PantryItem) => {
    navigation.navigate("Products", {
      pantryId, mode: "edit", itemId: item.id, item,
    });
  }, [navigation, pantryId]);

  const handleDelete = useCallback((item: PantryItem) => {
    Alert.alert(
      "Eliminar producto",
      `¿Eliminar "${item.product.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteItemApi(pantryId, item.id);
              navigation.goBack();
            } catch {
              Alert.alert("Error", "No se pudo eliminar el producto");
            }
          },
        },
      ]
    );
  }, [navigation, pantryId]);

  const handleOpenMove = useCallback(async (item: PantryItem) => {
    try {
      const pantries = await getPantries();
      const others = pantries.filter((p) => p.id !== pantryId);
      if (others.length === 0) {
        Alert.alert("Sin otras despensas", "No tienes otras despensas a las que mover este producto.");
        return;
      }
      setAllPantries(others);
      setMovingItem(item);
      setMoveModalVisible(true);
    } catch {
      Alert.alert("Error", "No se pudieron cargar las despensas.");
    }
  }, [pantryId]);

  const handleMoveItem = useCallback(async (targetPantryId: string) => {
    if (!movingItem) return;
    try {
      setMovingToPantryId(targetPantryId);
      await addItemApi(targetPantryId, {
        product_id: movingItem.product_id,
        quantity: movingItem.quantity,
        unit: movingItem.unit,
        expiry_date: movingItem.expiry_date,
        location: movingItem.location,
        notes: movingItem.notes,
        product_name: movingItem.product.name,
        product_brand: movingItem.product.brand,
        product_category: movingItem.product.category,
        product_image_url: movingItem.product.image_url,
        nutritional_info: {
          calories: movingItem.product.calories,
          proteins: movingItem.product.proteins,
          carbs: movingItem.product.carbohydrates,
          fats: movingItem.product.fats,
          saturated_fat: movingItem.product.saturated_fat_per_100g,
          fiber: movingItem.product.fiber,
          sugars: movingItem.product.sugar,
          salt: movingItem.product.salt,
          nutriscore: movingItem.product.nutriscore,
        },
      });
      await deleteItemApi(pantryId, movingItem.id);
      setMoveModalVisible(false);
      setMovingItem(null);
      navigation.goBack();
    } catch {
      Alert.alert("Error", "No se pudo mover el producto. Inténtalo de nuevo.");
    } finally {
      setMovingToPantryId(null);
    }
  }, [movingItem, pantryId, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{currentItem.product.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Carrusel */}
      <FlatList
        ref={flatListRef}
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <ProductPage
            item={item}
            pantryId={pantryId}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
            onMove={() => handleOpenMove(item)}
          />
        )}
      />

      {/* Indicador */}
      {items.length > 1 && (
        <View style={styles.dotsRow}>
          {items.length <= 8
            ? items.map((_, i) => (
                <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
              ))
            : <Text style={styles.pageCounter}>{currentIndex + 1} / {items.length}</Text>
          }
        </View>
      )}

      {/* Modal mover producto */}
      <Modal visible={moveModalVisible} transparent animationType="fade" onRequestClose={() => { if (!movingToPantryId) { setMoveModalVisible(false); setMovingItem(null); } }}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => { if (!movingToPantryId) { setMoveModalVisible(false); setMovingItem(null); } }} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mover producto</Text>
            {movingItem && (
              <Text style={styles.modalDesc}>
                ¿A qué despensa quieres mover{" "}
                <Text style={{ fontWeight: "700", color: colors.text }}>{movingItem.product.name}</Text>?
              </Text>
            )}
            {allPantries.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => handleMoveItem(p.id)}
                disabled={movingToPantryId !== null}
                style={[styles.movePantryRow, movingToPantryId !== null && { opacity: 0.5 }]}
              >
                <View style={styles.movePantryIcon}>
                  <MaterialCommunityIcons name="package-variant" size={18} color={colors.primary} />
                </View>
                <Text style={styles.movePantryName}>{p.name}</Text>
                {movingToPantryId === p.id
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <MaterialCommunityIcons name="chevron-right" size={20} color={colors.subtext} />
                }
              </Pressable>
            ))}
            <Pressable onPress={() => { setMoveModalVisible(false); setMovingItem(null); }} disabled={movingToPantryId !== null} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: {
    ...typography.h3, color: colors.text, fontWeight: "700",
    flex: 1, textAlign: "center",
  },
  // ─── Página ─────────────────────────────────────────────────────────────────
  pageBody: { padding: spacing.lg },
  imageWrap: {
    borderRadius: borderRadius.lg, overflow: "hidden",
    marginBottom: spacing.lg, height: 220,
    backgroundColor: colors.secondary, position: "relative",
  },
  image: { width: "100%", height: 220 },
  imagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  expiryBadge: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.xs, paddingVertical: spacing.sm,
  },
  expiryBadgeText: { ...typography.bodySm, fontWeight: "700" },
  titleSection: { marginBottom: spacing.md },
  productName: { ...typography.h2, color: colors.text, fontWeight: "700", marginBottom: spacing.xs },
  productBrand: { ...typography.body, color: colors.subtext },
  // ─── Acciones editar/eliminar ────────────────────────────────────────────────
  actionRow: {
    flexDirection: "row",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  actionBtnText: { ...typography.bodySm, fontWeight: "700", color: colors.primary },
  actionDivider: { width: 1, backgroundColor: colors.border },
  // ─── Info card ───────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg, overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { ...typography.bodySm, color: colors.subtext, width: 90 },
  infoValue: { ...typography.bodySm, color: colors.text, fontWeight: "600", flex: 1 },
  // ─── Sección nutricional ─────────────────────────────────────────────────────
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.bodySm, color: colors.subtext, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.5,
    marginBottom: spacing.sm, marginLeft: spacing.xs,
  },
  nutriScoreRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  nutriScoreLabelWrap: { flex: 1, marginRight: spacing.xs },
  nutriScoreLabel: { ...typography.bodySm, color: colors.subtext, fontWeight: "600" },
  nutriScoreEst: { fontSize: 9, color: colors.subtext, fontStyle: "italic", marginTop: 1 },
  nutriScoreLetter: {
    width: 28, height: 28, borderRadius: 4,
    justifyContent: "center", alignItems: "center", backgroundColor: colors.border,
  },
  nutriLetterText: { fontSize: 13, fontWeight: "600", color: colors.subtext },
  nutriLetterActive: { color: colors.white, fontWeight: "700" },
  nutriPer100: {
    ...typography.caption, color: colors.subtext,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  nutriRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  nutriLabel: { ...typography.bodySm, color: colors.text, flex: 1 },
  nutriValue: { ...typography.bodySm, color: colors.text, fontWeight: "700" },
  // ─── Dots ────────────────────────────────────────────────────────────────────
  dotsRow: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    gap: spacing.xs, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.primary },
  pageCounter: { ...typography.bodySm, color: colors.subtext, fontWeight: "600" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, width: "88%", maxWidth: 420 },
  modalTitle: { ...typography.h2, color: colors.text, textAlign: "center", marginBottom: spacing.lg },
  modalDesc: { ...typography.bodySm, color: colors.subtext, marginBottom: spacing.md },
  movePantryRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  movePantryIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
  movePantryName: { ...typography.body, color: colors.text, fontWeight: "600", flex: 1 },
  modalClose: { marginTop: spacing.lg, alignItems: "center" },
  modalCloseText: { ...typography.bodySm, color: colors.subtext, fontWeight: "600" },
});
