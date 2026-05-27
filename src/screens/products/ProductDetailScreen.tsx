import React, { useEffect, useState } from "react";
import {
  StyleSheet, View, Text, SafeAreaView, ScrollView,
  Pressable, Alert, Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import type { PantriesStackParamList } from "@/navigation/stacks/AppStack";
import { deleteItem as deleteItemApi, type NutritionalInfo } from "@/api/pantries";
import { getProductImage } from "@/services/productImages";

type Navigation = NativeStackNavigationProp<PantriesStackParamList>;
type Route = RouteProp<PantriesStackParamList, "ProductDetail">;

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
  if (days < 0)  return { label: "Caducado",   status: "caducado" };
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

export function ProductDetailScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { pantryId, item } = route.params;

  const [localImageUri, setLocalImageUri] = useState<string | null>(
    item.product.image_url || null
  );

  useEffect(() => {
    if (item.product.id) {
      getProductImage(item.product.id)
        .then((uri) => { if (uri) setLocalImageUri(uri); })
        .catch(() => {});
    }
  }, [item.product.id]);

  const nutritionalInfo: NutritionalInfo | undefined =
    item.product.calories != null
      ? {
          calories:   item.product.calories,
          proteins:   item.product.proteins,
          carbs:      item.product.carbs,
          fats:       item.product.fats,
          fiber:      item.product.fiber,
          sugars:     item.product.sugars,
          salt:       item.product.salt,
          nutriscore: item.product.nutriscore,
        }
      : undefined;

  const expiryInfo = getExpiryInfo(item.expiry_date);

  const handleMenu = () => {
    Alert.alert(item.product.name, undefined, [
      { text: "Editar", onPress: handleEdit },
      { text: "Eliminar", style: "destructive", onPress: confirmDelete },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleEdit = () => {
    navigation.navigate("Products", {
      pantryId, mode: "edit", itemId: item.id, item,
    });
  };

  const confirmDelete = () => {
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
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{item.product.name}</Text>
        <Pressable onPress={handleMenu} style={styles.headerBtn} hitSlop={8}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

        {/* Imagen */}
        <View style={styles.imageWrap}>
          {localImageUri ? (
            <Image source={{ uri: localImageUri }} style={styles.image} resizeMode="cover" />
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
          {item.product.brand ? (
            <Text style={styles.productBrand}>{item.product.brand}</Text>
          ) : null}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, shadows.sm]}>
          <InfoRow icon="package-variant-closed" label="Cantidad"   value={`${item.quantity} ${item.unit}`} />
          <InfoRow icon="map-marker-outline"     label="Ubicación"  value={LOCATION_DISPLAY[item.location] || item.location} />
          <InfoRow icon="calendar-outline"       label="Caducidad"  value={formatDate(item.expiry_date)} />
          {item.notes ? (
            <InfoRow icon="note-text-outline" label="Notas" value={item.notes} />
          ) : null}
          {item.added_by?.name ? (
            <InfoRow icon="account-outline" label="Añadido por" value={item.added_by.name} last />
          ) : (
            <InfoRow icon="package-variant-closed" label="" value="" last />
          )}
        </View>

        {/* Panel nutricional */}
        {nutritionalInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información nutricional</Text>
            <View style={[styles.infoCard, shadows.sm]}>
              {nutritionalInfo.nutriscore && (
                <View style={styles.nutriScoreRow}>
                  <Text style={styles.nutriScoreLabel}>Nutri-Score</Text>
                  {(["A", "B", "C", "D", "E"] as const).map((letter) => {
                    const active = letter === nutritionalInfo.nutriscore;
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
    </SafeAreaView>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  body: {
    padding: spacing.lg,
  },
  // ─── Image ───────────────────────────────────────────────────────────────────
  imageWrap: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    marginBottom: spacing.lg,
    height: 220,
    backgroundColor: colors.secondary,
    position: "relative",
  },
  image: {
    width: "100%",
    height: 220,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  expiryBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  expiryBadgeText: {
    ...typography.bodySm,
    fontWeight: "700",
  },
  // ─── Title ───────────────────────────────────────────────────────────────────
  titleSection: {
    marginBottom: spacing.lg,
  },
  productName: {
    ...typography.h2,
    color: colors.text,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  productBrand: {
    ...typography.body,
    color: colors.subtext,
  },
  // ─── Info card ───────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    ...typography.bodySm,
    color: colors.subtext,
    width: 90,
  },
  infoValue: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
    flex: 1,
  },
  // ─── Sección ─────────────────────────────────────────────────────────────────
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodySm,
    color: colors.subtext,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  // ─── Nutriscore ──────────────────────────────────────────────────────────────
  nutriScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nutriScoreLabel: {
    ...typography.bodySm,
    color: colors.subtext,
    fontWeight: "600",
    marginRight: spacing.xs,
    flex: 1,
  },
  nutriScoreLetter: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.border,
  },
  nutriLetterText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.subtext,
  },
  nutriLetterActive: {
    color: colors.white,
    fontWeight: "700",
  },
  nutriPer100: {
    ...typography.caption,
    color: colors.subtext,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nutriRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nutriLabel: {
    ...typography.bodySm,
    color: colors.text,
    flex: 1,
  },
  nutriValue: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "700",
  },
});
