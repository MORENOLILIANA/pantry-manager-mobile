import React, { useEffect, useRef, useState } from "react";
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
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Camera } from "expo-camera";
import { BarCodeScanner, BarCodeEvent } from "expo-barcode-scanner";
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

export function BarcodeScanScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();

  const { pantryId } = (route.params as any) || {};

  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const cameraRef = useRef<Camera>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout>();

  // Solicitar permisos al montar
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status.granted);
    })();
  }, []);

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

      // 1) Intentar obtener producto local
      try {
        const res = await apiClient.get(`/api/v1/products/barcode/${encodeURIComponent(barcode)}`);
        const product = res.data;

        const barcodeData: BarcodeData = {
          barcode: product.barcode || barcode,
          name: product.name,
          brand: product.brand,
          category: product.category,
        };

        navigation.navigate("Products", {
          pantryId,
          mode: "add",
          barcodeData,
        } as any);

        // keep scanned true to avoid double-handling until screen change
        setLoading(false);
        return;
      } catch (err: any) {
        // si es 404, seguimos con la llamada nutricional
        const status = err?.response?.status;
        if (status !== 404) throw err;
      }

      // 3) Producto no en DB local -> obtener datos nutricionales (backend consulta OpenFoodFacts)
      try {
        const nut = await apiClient.get(`/api/v1/products/barcode/${encodeURIComponent(barcode)}/nutritional`);
        const payload = nut.data;

        const barcodeData: BarcodeData = {
          barcode,
          name: payload.name || payload.product_name || "",
          brand: payload.brand || payload.brands || "",
          category: payload.category || payload.categories || "",
        };

        navigation.navigate("Products", {
          pantryId,
          mode: "add",
          barcodeData,
        } as any);

        setLoading(false);
        return;
      } catch (nutErr: any) {
        console.warn("Nutritional lookup failed:", nutErr?.message || nutErr);
      }

      // 4) Si todo falla mostrar Alert con opción de añadir manualmente (sin datos)
      Alert.alert(
        "Producto no encontrado",
        `Código: ${barcode}`,
        [
          {
            text: "Cancelar",
            onPress: () => {
              setScanned(false);
              setLoading(false);
            },
            style: "cancel",
          },
          {
            text: "Añadir manualmente",
            onPress: () => {
              // Volver a Products sin datos
              navigation.navigate("Products", {
                pantryId,
                mode: "add",
              } as any);
              setScanned(false);
              setLoading(false);
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Error scanning barcode:", error);
      Alert.alert("Producto no encontrado", "¿Deseas añadirlo manualmente?", [
        {
          text: "Cancelar",
          onPress: () => {
            setScanned(false);
            setLoading(false);
          },
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
      ]);
    }
  };

  const handleBarcodeScanned = (event: BarCodeEvent) => {
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

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
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
      <Camera
        ref={cameraRef}
        style={styles.camera}
        onBarCodeScanned={scanned ? undefined : handleBarcodeScanned}
        barCodeScannerSettings={{
          barCodeTypes: [
            "ean13",
            "ean8",
            "upca",
            "upce",
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
      </Camera>

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