import { StyleSheet, Text, View, Pressable, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import { StatusBadge } from "@/components/StatusBadge";

type Status = "normal" | "proximo" | "caducado";

const IMAGE_SIZE = 64;

type Props = {
  name: string;
  brand?: string;
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

export function ProductCard({
  name,
  brand,
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

  return (
    <View style={[styles.card, shadows.sm]}>
      <View style={styles.mainRow}>
        {/* Thumbnail */}
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons
                name="package-variant"
                size={28}
                color={colors.subtext}
              />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.titleArea}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              {brand ? (
                <Text style={styles.brand} numberOfLines={1}>
                  {brand}
                </Text>
              ) : null}
              {status ? <StatusBadge status={status} /> : null}
            </View>
            <View style={styles.actions}>
              {onEdit && (
                <Pressable onPress={onEdit} style={styles.actionButton} hitSlop={6}>
                  <MaterialCommunityIcons
                    name="pencil"
                    size={18}
                    color={colors.primary}
                  />
                </Pressable>
              )}
              {onDelete && (
                <Pressable onPress={onDelete} style={styles.actionButton} hitSlop={6}>
                  <MaterialCommunityIcons
                    name="trash-can"
                    size={18}
                    color={colors.error}
                  />
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="package-variant"
                size={13}
                color={colors.subtext}
              />
              <Text style={styles.detailText}>
                {quantity} {unit}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="calendar"
                size={13}
                color={colors.subtext}
              />
              <Text style={styles.detailText}>
                {expiryDate ? formatDate(expiryDate) : "Sin fecha"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={13}
                color={colors.subtext}
              />
              <Text style={styles.detailText}>{location}</Text>
            </View>
            {addedBy ? (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={13}
                  color={colors.subtext}
                />
                <Text style={styles.detailText}>{addedBy}</Text>
              </View>
            ) : null}
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
    marginBottom: spacing.md,
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
    alignSelf: "center",
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
    marginRight: spacing.sm,
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
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  details: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  detailText: {
    ...typography.bodySm,
    color: colors.subtext,
  },
});
