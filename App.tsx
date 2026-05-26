import "react-native-gesture-handler";

import { NavigationContainer, DefaultTheme, type LinkingOptions } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RootNavigator } from "@/navigation/RootNavigator";
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from "react-native";
import { colors } from "@/config/theme";

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["nutricasa://"],
  config: {
    screens: {
      Auth: {
        screens: {
          ResetPassword: {
            path: "reset-password",
            parse: {
              token: (t: string) => t,
              email: (e: string) => decodeURIComponent(e),
            },
          },
        },
      },
    },
  },
};

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.white,
    card: colors.secondary,
    text: colors.text,
    border: colors.border,
    primary: colors.primary
  }
};

function AppContent() {
  const { isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.bootContainer}>
        <View style={styles.bootCard}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return <RootNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={theme} linking={linking}>
        <StatusBar style="dark" />
        <AppContent />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center"
  },
  bootCard: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary
  }
});