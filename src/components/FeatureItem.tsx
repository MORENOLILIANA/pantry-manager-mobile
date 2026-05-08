import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  description?: string;
  meta?: string;
};

export function FeatureItem({ title, description, meta }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  texts: {
    flex: 1,
    gap: 4
  },
  title: {
    color: "#f9fafb",
    fontSize: 15,
    fontWeight: "600"
  },
  description: {
    color: "#9ca3af",
    fontSize: 13,
    lineHeight: 18
  },
  meta: {
    color: "#4ade80",
    fontSize: 12,
    fontWeight: "700"
  }
});