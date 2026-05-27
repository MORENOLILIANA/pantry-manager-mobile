import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Animated,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Vibration, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "@/config/theme";
import type { PantriesStackParamList } from "@/navigation/stacks/AppStack";
import { apiClient } from "@/api/client";
import { getPantries } from "@/api/pantries";

type Navigation = NativeStackNavigationProp<PantriesStackParamList>;
type Route = RouteProp<PantriesStackParamList, "BarcodeScan">;

interface BarcodeData {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
}

async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeData | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_es,brands,categories,categories_tags`
    );
    const json = await res.json();
    if (json?.status !== 1 || !json?.product) return null;

    const p = json.product;
    const name: string =
      p.product_name_es?.trim() ||
      p.product_name?.trim() ||
      "";
    if (!name) return null;

    // Categoría: usar la primera etiqueta legible (quitar prefijo "en:" o "es:")
    const rawCategory: string =
      p.categories?.split(",")[0]?.trim() ||
      p.categories_tags?.[0]?.replace(/^[a-z]{2}:/, "") ||
      "";

    return {
      barcode,
      name,
      brand: p.brands?.split(",")[0]?.trim() || "",
      category: rawCategory,
    };
  } catch {
    return null;
  }
}

export function BarcodeScanScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();

  const { pantryId: routePantryId } = (route.params as any) || {};

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanState, setScanState] = useState<"idle" | "detected">("idle");
  const isProcessing = useRef(false);
  const candidateRef = useRef<string | null>(null);
  const stabilizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  // Animación de pulso del recuadro al detectar
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (scanState === "detected") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 300, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [scanState]);

  const STABILIZE_MS = 700;

  const resetScanState = useCallback(() => {
    if (stabilizeTimerRef.current) clearTimeout(stabilizeTimerRef.current);
    candidateRef.current = null;
    isProcessing.current = false;
    setScanned(false);
    setLoading(false);
    setScanState("idle");
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetScanState();
      return () => {
        if (stabilizeTimerRef.current) clearTimeout(stabilizeTimerRef.current);
      };
    }, [resetScanState])
  );

  // Navega a Products o a ShoppingLists según el modo
  const goToProducts = async (params: Record<string, any>) => {
    const shoppingListMode = (route.params as any)?.shoppingListMode;

    if (shoppingListMode) {
      (navigation as any).navigate("ShoppingListStack", {
        screen: "ShoppingLists",
        params: {
          scannedProduct: {
            name: params.barcodeData?.name || "",
            brand: params.barcodeData?.brand || "",
          },
        },
      });
      setLoading(false);
      return;
    }

    // Siempre busca la despensa en el momento del escaneo para evitar datos obsoletos
    let pantryId: string | undefined = routePantryId;
    if (!pantryId) {
      try {
        const pantries = await getPantries();
        pantryId = pantries?.[0]?.id;
      } catch {}
    }

    if (!pantryId) {
      Alert.alert("Sin despensa", "Crea primero una despensa desde la sección Mi Despensa.");
      isProcessing.current = false;
      setScanned(false);
      setLoading(false);
      return;
    }

    (navigation as any).navigate("PantriesStack", {
      screen: "Products",
      params: { pantryId, ...params },
    });
    setLoading(false);
  };

  const handleBarcodeLike = async (barcode: string) => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    setScanned(true);
    setLoading(true);

    try {
      // simple vibration feedback; avoids expo-haptics web bundling issues
      try {
        if (Platform.OS !== "web") Vibration.vibrate(50);
      } catch (e) {
        /* ignore */
      }

      // 1) Base de datos local del backend
      try {
        const res = await apiClient.get(`/products/barcode/${encodeURIComponent(barcode)}`);
        const product = res.data?.data ?? res.data;
        if (product?.name) {
          goToProducts({ mode: "add", barcodeData: { barcode: product.barcode || barcode, name: product.name, brand: product.brand, category: product.category } });
          return;
        }
      } catch (err: any) {
        // Solo relanzar si es un error de red (sin respuesta del servidor)
        // Cualquier respuesta HTTP (404, 500, etc.) = no encontrado → continuar
        if (!err?.response) throw err;
      }

      // 2) Endpoint nutricional del backend (si el backend consulta OpenFoodFacts por su lado)
      try {
        const nut = await apiClient.get(`/products/barcode/${encodeURIComponent(barcode)}/nutritional`);
        const payload = nut.data?.data ?? nut.data;
        const name = payload?.name || payload?.product_name || "";
        if (name) {
          goToProducts({ mode: "add", barcodeData: { barcode, name, brand: payload.brand || payload.brands || "", category: payload.category || payload.categories || "" } });
          return;
        }
      } catch {
        // sigue al siguiente paso
      }

      // 3) Open Food Facts directamente desde la app (3M+ productos mundiales)
      const offProduct = await lookupOpenFoodFacts(barcode);
      if (offProduct) {
        goToProducts({ mode: "add", barcodeData: offProduct });
        return;
      }

      // 4) Producto desconocido → el usuario rellena manualmente
      const shoppingListMode = (route.params as any)?.shoppingListMode;
      Alert.alert(
        "Producto no encontrado",
        shoppingListMode
          ? "No se encontró este código. Escribe el nombre del producto en la lista."
          : "No se encontró este código en ninguna base de datos. Puedes rellenar los datos manualmente.",
        [
          {
            text: "Cancelar",
            onPress: resetScanState,
            style: "cancel",
          },
          {
            text: shoppingListMode ? "Escribir nombre" : "Añadir manualmente",
            onPress: () => {
              goToProducts({ mode: "add", barcodeData: { barcode, name: "", brand: "", category: "" } });
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Error scanning barcode:", error);
      resetScanState();
      Alert.alert("Error", "No se pudo leer el código. Inténtalo de nuevo.");
    }
  };

  const handleBarcodeScanned = (event: BarcodeScanningResult) => {
    if (isProcessing.current || scanned) return;
    const barcode = event.data;

    // Si ya estamos esperando para este mismo código, no resetear el timer
    if (candidateRef.current === barcode) return;

    // Código nuevo o distinto → reiniciar el temporizador de estabilización
    if (stabilizeTimerRef.current) clearTimeout(stabilizeTimerRef.current);
    candidateRef.current = barcode;
    setScanState("detected");

    stabilizeTimerRef.current = setTimeout(() => {
      if (candidateRef.current === barcode && !isProcessing.current) {
        setScanState("idle");
        handleBarcodeLike(barcode);
      }
    }, STABILIZE_MS);
  };

  const handleManualInput = async () => {
    if (!manualBarcode.trim()) {
      Alert.alert("Error", "Por favor introduce un código de barras");
      return;
    }

    setManualInputVisible(false);
    await handleBarcodeLike(manualBarcode);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="camera-off"
            size={80}
            color={colors.primary}
            style={styles.icon}
          />
          <Text style={styles.title}>Permisos requeridos</Text>
          <Text style={styles.subtitle}>
            Se necesita acceso a la cámara para escanear códigos de barras
          </Text>
          <Pressable
            style={styles.permissionButton}
            onPress={() => requestPermission()}
          >
            <Text style={styles.permissionButtonText}>Abrir ajustes</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code128",
            "code39",
            "qr",
          ],
        }}
      >
        {/* Overlay oscuro semitransparente */}
        <View style={styles.overlay}>
          {/* Área superior oscura */}
          <View style={styles.darkenedArea} />

          {/* Centro con recuadro */}
          <View style={styles.centerArea}>
            {/* Lado izquierdo oscuro */}
            <View style={styles.darkenedArea} />

            {/* Recuadro central con esquinas */}
            <Animated.View style={[styles.scanBox, { transform: [{ scale: pulseAnim }] }]}>
              {/* Esquinas del visor */}
              {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                <View
                  key={pos}
                  style={[
                    styles.corner,
                    styles[`corner_${pos}`],
                    { borderColor: scanState === "detected" ? "#F39C12" : colors.primary },
                  ]}
                />
              ))}
            </Animated.View>

            {/* Lado derecho oscuro */}
            <View style={styles.darkenedArea} />
          </View>

          {/* Área inferior oscura */}
          <View style={styles.darkenedArea} />

          {/* Texto debajo del recuadro */}
          <View style={styles.textContainer}>
            <Text style={styles.instructionText}>
              {scanState === "detected" ? "Mantenlo quieto..." : "Apunta al código de barras"}
            </Text>
            {scanState === "detected" && (
              <Text style={styles.instructionSub}>Escaneando en un momento</Text>
            )}
          </View>

          {/* Loading overlay */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
            </View>
          )}
        </View>
      </CameraView>

      {/* Botón cerrar arriba izquierda */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.closeButton}
      >
        <MaterialCommunityIcons name="close" size={28} color={colors.white} />
      </Pressable>

      {/* Botón introducir manualmente abajo */}
      <Pressable
        onPress={() => setManualInputVisible(true)}
        style={styles.manualButton}
      >
        <MaterialCommunityIcons
          name="keyboard"
          size={20}
          color={colors.primary}
        />
        <Text style={styles.manualButtonText}>
          Introducir código manualmente
        </Text>
      </Pressable>

      {/* Modal para entrada manual */}
      {manualInputVisible && (
        <View style={styles.manualInputModal}>
          <View style={styles.manualInputContainer}>
            <Text style={styles.manualInputTitle}>
              Introducir código de barras
            </Text>

            <TextInput
              style={styles.manualInputField}
              placeholder="Código de barras"
              value={manualBarcode}
              onChangeText={setManualBarcode}
              keyboardType="numeric"
              autoFocus
              maxLength={20}
            />

            <View style={styles.manualInputButtons}>
              <Pressable
                onPress={() => {
                  setManualInputVisible(false);
                  setManualBarcode("");
                  setScanned(false);
                }}
                style={[styles.manualInputButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={handleManualInput}
                style={[styles.manualInputButton, styles.submitButton]}
              >
                <Text style={styles.submitButtonText}>Buscar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.text,
  },
  camera: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  darkenedArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  centerArea: {
    flexDirection: "row",
    height: 250,
    justifyContent: "center",
    alignItems: "center",
  },
  scanBox: {
    width: 250,
    height: 250,
    backgroundColor: "transparent",
    position: "relative",
  },
  // Esquinas del visor (4 rincones)
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
  },
  corner_tl: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: borderRadius.sm,
  },
  corner_tr: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: borderRadius.sm,
  },
  corner_bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: borderRadius.sm,
  },
  corner_br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: borderRadius.sm,
  },
  textContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    gap: spacing.xs,
  },
  instructionText: {
    ...typography.body,
    color: colors.white,
    fontWeight: "600",
  },
  instructionSub: {
    ...typography.bodySm,
    color: "#F39C12",
    fontWeight: "500",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  manualButton: {
    position: "absolute",
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  manualButtonText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "600",
  },
  manualInputModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  manualInputContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    width: "100%",
  },
  manualInputTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  manualInputField: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  manualInputButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  manualInputButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E5E5E5",
  },
  cancelButtonText: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    ...typography.bodySm,
    color: colors.white,
    fontWeight: "600",
  },
  icon: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  permissionButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  permissionButtonText: {
    ...typography.bodySm,
    color: colors.white,
    fontWeight: "600",
  },
});