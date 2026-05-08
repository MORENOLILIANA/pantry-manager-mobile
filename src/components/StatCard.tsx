import { StyleSheet, Text, View } from "react-native";

type Props = {
  label: string;
  value: string;
};

export function StatCard({ label, value }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 96,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    borderWidth: 1,
    borderColor: "#1f2937"
  },
  label: {
    color: "#9ca3af",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  value: {
    marginTop: 12,
    color: "#f9fafb",
    fontSize: 28,
    fontWeight: "800"
  }
});