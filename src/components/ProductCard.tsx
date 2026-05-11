import { StyleSheet, Text, View, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import { StatusBadge } from "@/components/StatusBadge";

type Status = "normal" | "proximo" | "caducado";

type Props = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  location: string;
  status: Status;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function ProductCard({ id, name, quantity, unit, expiryDate, location, status, onEdit, onDelete }: Props) {
  const formatDate = (date: string) => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
    } catch {
      return date;
    }
  };

  return (
    <View style={[styles.card, shadows.sm]}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.name}>{name}</Text>
          <StatusBadge status={status} />
        </View>
        <View style={styles.actions}>
          {onEdit && (
            <Pressable onPress={onEdit} style={styles.actionButton}>
              <MaterialCommunityIcons name="pencil" size={18} color={colors.primary} />
            </Pressable>
          )}
          {onDelete && (
            <Pressable onPress={onDelete} style={styles.actionButton}>
              <MaterialCommunityIcons name="trash-can" size={18} color={colors.error} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="package-variant" size={16} color={colors.subtext} />
          <Text style={styles.detailText}>
            {quantity} {unit}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar" size={16} color={colors.subtext} />
          <Text style={styles.detailText}>{formatDate(expiryDate)}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.subtext} />
          <Text style={styles.detailText}>{location}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  titleSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButton: {
    padding: spacing.xs,
  },
  details: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  detailText: {
    ...typography.bodySm,
    color: colors.subtext,
  },
});
