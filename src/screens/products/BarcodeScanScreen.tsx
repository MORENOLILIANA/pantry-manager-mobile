import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
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

  const { pantryId } = (route.params as any) || {};

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setLoading(false);
    }, [])
  );

  const handleBarcodeLike = async (barcode: string) => {
    if (scanned || loading) return;

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
          navigation.navigate("Products", {
            pantryId,
            mode: "add",
            barcodeData: {
              barcode: product.barcode || barcode,
              name: product.name,
              brand: product.brand,
              category: product.category,
            },
          } as any);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        if (err?.response?.status !== 404) throw err;
      }

      // 2) Endpoint nutricional del backend (si el backend consulta OpenFoodFacts por su lado)
      try {
        const nut = await apiClient.get(`/products/barcode/${encodeURIComponent(barcode)}/nutritional`);
        const payload = nut.data?.data ?? nut.data;
        const name = payload?.name || payload?.product_name || "";
        if (name) {
          navigation.navigate("Products", {
            pantryId,
            mode: "add",
            barcodeData: {
              barcode,
              name,
              brand: payload.brand || payload.brands || "",
              category: payload.category || payload.categories || "",
            },
          } as any);
          setLoading(false);
          return;
        }
      } catch {
        // sigue al siguiente paso
      }

      // 3) Open Food Facts directamente desde la app (3M+ productos mundiales)
      const offProduct = await lookupOpenFoodFacts(barcode);
      if (offProduct) {
        navigation.navigate("Products", {
          pantryId,
          mode: "add",
          barcodeData: offProduct,
        } as any);
        setLoading(false);
        return;
      }

      // 4) Producto desconocido → el usuario rellena manualmente
      Alert.alert(
        "Producto no encontrado",
        "No se encontró este código en ninguna base de datos. Puedes rellenar los datos manualmente.",
        [
          {
            text: "Cancelar",
            onPress: () => { setScanned(false); setLoading(false); },
            style: "cancel",
          },
          {
            text: "Añadir manualmente",
            onPress: () => {
              navigation.navigate("Products", { pantryId, mode: "add" } as any);
              setScanned(false);
              setLoading(false);
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Error scanning barcode:", error);
      setScanned(false);
      setLoading(false);
      Alert.alert("Error", "No se pudo leer el código. Inténtalo de nuevo.");
    }
  };

  const handleBarcodeScanned = (event: BarcodeScanningResult) => {
    const barcode = event.data;
    handleBarcodeLike(barcode);
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

            {/* Recuadro central verde */}
            <View style={styles.scanBox} />

            {/* Lado derecho oscuro */}
            <View style={styles.darkenedArea} />
          </View>

          {/* Área inferior oscura */}
          <View style={styles.darkenedArea} />

          {/* Texto debajo del recuadro */}
          <View style={styles.textContainer}>
            <Text style={styles.instructionText}>
              Apunta al código de barras
            </Text>
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
    borderWidth: 3,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    backgroundColor: "transparent",
  },
  textContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  instructionText: {
    ...typography.body,
    color: colors.white,
    fontWeight: "600",
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