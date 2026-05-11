import { StyleSheet, Text, Pressable } from "react-native";
import { colors, spacing, borderRadius, typography } from "@/config/theme";

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function CategoryChip({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
    >
      <Text style={[styles.text, selected ? styles.textSelected : styles.textUnselected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipUnselected: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    ...typography.bodySm,
    fontWeight: "600",
  },
  textSelected: {
    color: colors.white,
  },
  textUnselected: {
    color: colors.text,
  },
});
