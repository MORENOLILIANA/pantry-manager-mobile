import { StyleSheet, Text, View, Pressable, Image, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";

type Status = "normal" | "proximo" | "caducado";

const IMAGE_SIZE = 64;

const DAY_BG: Record<Status, string>    = { caducado: "#FADBD8", proximo: "#FFF3E0", normal: "#D5F4E6" };
const DAY_COLOR: Record<Status, string> = { caducado: "#E74C3C", proximo: "#F39C12", normal: "#27AE60" };

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

type Props = {
  name: string;
  brand?: string;
  category?: string;
  quantity: number;
  unit: string;
  location: string;
  expiryDate?: string;
  status?: Status;
  imageUrl?: string;
  addedBy?: string;
  onEdit?: () => void;
  onDelete?: () => void;
};

function getExpiryLabel(expiryDate: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const datePart = (expiryDate || "").split("T")[0];
  const parts = datePart.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return "Sin fecha";
  const expiry = new Date(parts[0], parts[1] - 1, parts[2]);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "Caducado";
  if (days === 0) return "Caduca hoy";
  if (days === 1) return "Mañana";
  return `${days} días`;
}

export function ProductCard({
  name,
  brand,
  category,
  quantity,
  unit,
  expiryDate,
  location,
  status,
  imageUrl,
  addedBy,
  onEdit,
  onDelete,
}: Props) {
  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    } catch {
      return date;
    }
  };

  const handleMenu = () => {
    const options: any[] = [];
    if (onEdit) options.push({ text: "Editar", onPress: onEdit });
    if (onDelete) options.push({ text: "Eliminar", style: "destructive", onPress: onDelete });
    options.push({ text: "Cancelar", style: "cancel" });
    Alert.alert(name, undefined, options);
  };

  return (
    <View style={[styles.card, shadows.sm]}>
      <View style={styles.mainRow}>
        {/* Imagen con días encima */}
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons
                name={getCategoryIcon(category) as any}
                size={28}
                color={colors.subtext}
              />
            </View>
          )}
          {status && expiryDate && (
            <View style={[styles.daysTag, { backgroundColor: DAY_BG[status] + "E6" }]}>
              <Text style={[styles.daysText, { color: DAY_COLOR[status] }]}>
                {getExpiryLabel(expiryDate)}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.titleArea}>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              {brand ? <Text style={styles.brand} numberOfLines={1}>{brand}</Text> : null}
            </View>

            {(onEdit || onDelete) && (
              <Pressable onPress={handleMenu} style={styles.menuBtn} hitSlop={8}>
                <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.subtext} />
              </Pressable>
            )}
          </View>

          <View style={styles.details}>
            <View style={styles.detailsPair}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="package-variant" size={13} color={colors.subtext} />
                <Text style={styles.detailText} numberOfLines={1}>{quantity} {unit}</Text>
              </View>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="map-marker" size={13} color={colors.subtext} />
                <Text style={styles.detailText} numberOfLines={1}>{location}</Text>
              </View>
            </View>
            <View style={styles.detailsPair}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="calendar" size={13} color={colors.subtext} />
                <Text style={styles.detailText} numberOfLines={1}>
                  {expiryDate ? formatDate(expiryDate) : "Sin fecha"}
                </Text>
              </View>
              {addedBy ? (
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="account-outline" size={13} color={colors.subtext} />
                  <Text style={styles.detailText} numberOfLines={1}>{addedBy}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  imageWrap: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
    flexShrink: 0,
  },
  daysTag: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  daysText: {
    fontFamily: undefined,
    fontWeight: "700",
    fontSize: 10,
    textAlign: "center",
  },
  productImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  imagePlaceholder: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  titleArea: {
    flex: 1,
    marginRight: spacing.xs,
    minWidth: 0,
  },
  name: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  brand: {
    ...typography.bodySm,
    color: colors.subtext,
    marginBottom: spacing.xs,
  },
  menuBtn: {
    padding: spacing.xs,
  },
  details: {
    gap: spacing.xs,
  },
  detailsPair: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  detailItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minWidth: 0,
  },
  detailText: {
    ...typography.bodySm,
    color: colors.subtext,
    flexShrink: 1,
  },
});
