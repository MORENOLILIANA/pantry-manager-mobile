import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/stacks/AuthStack";

type Navigation = NativeStackNavigationProp<AuthStackParamList>;

export function SplashScreen() {
  const navigation = useNavigation<Navigation>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Login");
    }, 450);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Pantry Manager</Text>
      <Text style={styles.caption}>Preparando tu sesión...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1220",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  brand: {
    color: "#f9fafb",
    fontSize: 28,
    fontWeight: "800"
  },
  caption: {
    color: "#9ca3af",
    fontSize: 15
  }
});