import "react-native-gesture-handler";

import { NavigationContainer, DefaultTheme, useNavigationContainerRef, type LinkingOptions } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RootNavigator } from "@/navigation/RootNavigator";
import { useCallback, useEffect, useRef } from "react";
import { ActivityIndicator, Alert, Linking, SafeAreaView, StyleSheet, View } from "react-native";
import { colors } from "@/config/theme";
import { joinSharedPantry } from "@/api/pantries";

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

function AppContent({ navigationRef }: { navigationRef: any }) {
  const { isBootstrapping, user } = useAuth();
  const pendingResetRef = useRef<{ token: string; email: string } | null>(null);
  const pendingJoinRef = useRef<string | null>(null);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const showJoinDialog = useCallback((token: string) => {
    Alert.alert(
      "Unirse a despensa",
      "Has recibido una invitación para unirte a una despensa compartida. ¿Quieres aceptarla?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Unirse",
          onPress: async () => {
            try {
              await joinSharedPantry(token);
              Alert.alert("¡Listo!", "Te has unido a la despensa correctamente.", [
                {
                  text: "Ver despensa",
                  onPress: () => {
                    if (navigationRef.isReady()) {
                      (navigationRef as any).navigate("App", {
                        screen: "PantriesStack",
                        params: { screen: "Pantries" },
                      });
                    }
                  },
                },
              ]);
            } catch {
              Alert.alert("Error", "No se pudo unir a la despensa. El enlace puede haber caducado.");
            }
          },
        },
      ]
    );
  }, [navigationRef]);

  // Captura el deep link inicial ANTES de que el navigator tenga pantallas registradas
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      if (url.includes("reset-password")) {
        const qIdx = url.indexOf("?");
        if (qIdx === -1) return;
        const params: Record<string, string> = {};
        url.slice(qIdx + 1).split("&").forEach((p) => {
          const eqIdx = p.indexOf("=");
          if (eqIdx > 0) params[p.slice(0, eqIdx)] = decodeURIComponent(p.slice(eqIdx + 1));
        });
        if (params.token) {
          pendingResetRef.current = { token: params.token, email: params.email ?? "" };
        }
      } else if (url.includes("pantry/shared/")) {
        const match = url.match(/pantry\/shared\/([^?&/\s]+)/);
        if (match?.[1]) pendingJoinRef.current = match[1];
      }
    });
  }, []);

  // Escucha deep links cuando la app ya está en ejecución
  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      if (!url.includes("pantry/shared/")) return;
      const match = url.match(/pantry\/shared\/([^?&/\s]+)/);
      if (!match?.[1]) return;
      const token = match[1];
      if (userRef.current) {
        showJoinDialog(token);
      } else {
        pendingJoinRef.current = token;
      }
    });
    return () => sub.remove();
  }, [showJoinDialog]);

  // Navega a ResetPassword tras el bootstrapping, solo si el usuario no está logueado
  useEffect(() => {
    if (!isBootstrapping && !user && pendingResetRef.current) {
      const pending = pendingResetRef.current;
      pendingResetRef.current = null;
      setTimeout(() => {
        if (navigationRef.isReady()) {
          navigationRef.navigate("Auth", {
            screen: "ResetPassword",
            params: { token: pending.token, email: pending.email },
          });
        }
      }, 50);
    }
  }, [isBootstrapping, user]);

  // Une al usuario a la despensa pendiente tras el bootstrapping
  useEffect(() => {
    if (!isBootstrapping && user && pendingJoinRef.current) {
      const token = pendingJoinRef.current;
      pendingJoinRef.current = null;
      showJoinDialog(token);
    }
  }, [isBootstrapping, user, showJoinDialog]);

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
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef} theme={theme} linking={linking}>
        <StatusBar style="dark" />
        <AppContent navigationRef={navigationRef} />
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
