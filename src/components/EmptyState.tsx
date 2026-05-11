import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "@/config/theme";
import { PrimaryButton } from "@/components/PrimaryButton";

type Props = {
  icon?: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  onButtonPress?: () => void;
};

export function EmptyState({ icon = "inbox", title, subtitle, buttonText, onButtonPress }: Props) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={64} color={colors.primary} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {buttonText && onButtonPress && (
        <PrimaryButton title={buttonText} onPress={onButtonPress} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  icon: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
  },
  button: {
    marginTop: spacing.md,
  },
});
