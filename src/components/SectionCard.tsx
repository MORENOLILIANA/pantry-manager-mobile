import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  children?: React.ReactNode;
};

export function SectionCard({ title, children }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 1,
    borderColor: "#1f2937"
  },
  title: {
    color: "#f9fafb",
    fontSize: 18,
    fontWeight: "700"
  }
});