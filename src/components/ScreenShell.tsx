import { LinearGradient } from "expo-linear-gradient";
import { PropsWithChildren } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function ScreenShell({ title, subtitle, children }: Props) {
  return (
    <LinearGradient colors={["#0b1220", "#111827", "#0f172a"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.content}>{children}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  safeArea: {
    flex: 1,
    padding: 20
  },
  header: {
    gap: 8,
    marginBottom: 20
  },
  title: {
    color: "#f9fafb",
    fontSize: 32,
    fontWeight: "800"
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 15,
    lineHeight: 22
  },
  content: {
    flex: 1,
    gap: 16
  }
});