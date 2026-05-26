import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "@/config/theme";
import { createPantry } from "@/api/pantries";
import { PrimaryButton } from "@/components/PrimaryButton";

interface Props {
  visible: boolean;
  onDone: (createdPantryId?: string) => void;
  navigation: any;
}

export function OnboardingModal({ visible, onDone, navigation }: Props) {
  const [step, setStep] = useState(0);
  const [pantryName, setPantryName] = useState("Mi despensa");
  const [creating, setCreating] = useState(false);
  const [createdPantryId, setCreatedPantryId] = useState<string | null>(null);

  const handleCreatePantry = async () => {
    const name = pantryName.trim() || "Mi despensa";
    try {
      setCreating(true);
      const pantry = await createPantry({ name });
      setCreatedPantryId(pantry.id);
      setStep(2);
    } catch {
      Alert.alert("Error", "No se pudo crear la despensa. Inténtalo de nuevo.");
    } finally {
      setCreating(false);
    }
  };

  const handleScan = () => {
    onDone(createdPantryId ?? undefined);
    navigation.navigate("PantriesStack", {
      screen: "BarcodeScan",
      params: { pantryId: createdPantryId },
    });
  };

  const handleManual = () => {
    onDone(createdPantryId ?? undefined);
    navigation.navigate("PantriesStack", {
      screen: "Products",
      params: { pantryId: createdPantryId, mode: "add" },
    });
  };

  const handleSkip = () => {
    onDone(createdPantryId ?? undefined);
  };

  const dots = [0, 1, 2];

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Paso 0 — Bienvenida */}
        {step === 0 && (
          <View style={styles.slide}>
            <MaterialCommunityIcons name="leaf" size={72} color={colors.primary} style={styles.icon} />
            <Text style={styles.title}>¡Bienvenido a NutriCasa!</Text>
            <Text style={styles.subtitle}>
              Te guiaremos en 2 pasos para que empieces a gestionar tu despensa.
            </Text>
            <PrimaryButton title="Comenzar" onPress={() => setStep(1)} style={styles.btn} />
            <Pressable onPress={() => onDone()} style={styles.skipLink}>
              <Text style={styles.skipText}>Saltar configuración</Text>
            </Pressable>
          </View>
        )}

        {/* Paso 1 — Crear despensa */}
        {step === 1 && (
          <View style={styles.slide}>
            <MaterialCommunityIcons name="fridge-outline" size={72} color={colors.primary} style={styles.icon} />
            <Text style={styles.title}>Crea tu primera despensa</Text>
            <Text style={styles.subtitle}>
              Ponle un nombre a tu despensa. Podrás cambiarlo cuando quieras.
            </Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Nombre de la despensa</Text>
              <TextInput
                style={styles.input}
                value={pantryName}
                onChangeText={setPantryName}
                placeholder="Mi despensa"
                placeholderTextColor={colors.subtext}
                maxLength={40}
                autoFocus
                selectTextOnFocus
              />
            </View>
            <PrimaryButton
              title={creating ? "Creando..." : "Crear despensa"}
              onPress={handleCreatePantry}
              style={styles.btn}
            />
            <Pressable onPress={() => onDone()} style={styles.skipLink}>
              <Text style={styles.skipText}>Saltar por ahora</Text>
            </Pressable>
          </View>
        )}

        {/* Paso 2 — Añadir primer producto */}
        {step === 2 && (
          <View style={styles.slide}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check-circle" size={72} color="#2e7d32" />
            </View>
            <Text style={styles.title}>¡Despensa lista!</Text>
            <Text style={styles.subtitle}>
              Ahora añade tu primer producto. Puedes escanearlo o introducirlo a mano.
            </Text>
            <Pressable style={[styles.actionCard]} onPress={handleScan}>
              <MaterialCommunityIcons name="barcode-scan" size={32} color={colors.primary} />
              <View style={styles.actionCardText}>
                <Text style={styles.actionCardTitle}>Escanear código de barras</Text>
                <Text style={styles.actionCardSub}>Rápido y automático</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
            </Pressable>
            <Pressable style={[styles.actionCard, styles.actionCardSecondary]} onPress={handleManual}>
              <MaterialCommunityIcons name="plus-circle-outline" size={32} color={colors.subtext} />
              <View style={styles.actionCardText}>
                <Text style={[styles.actionCardTitle, { color: colors.text }]}>Añadir manualmente</Text>
                <Text style={styles.actionCardSub}>Rellena los datos tú mismo</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.subtext} />
            </Pressable>
            <Pressable onPress={handleSkip} style={styles.skipLink}>
              <Text style={styles.skipText}>Terminar sin añadir</Text>
            </Pressable>
          </View>
        )}

        {/* Indicador de pasos */}
        <View style={styles.dots}>
          {dots.map((d) => (
            <View key={d} style={[styles.dot, step === d && styles.dotActive]} />
          ))}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: "center",
  },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: 80,
    paddingBottom: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginBottom: spacing.xxl,
  },
  successIcon: {
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
    marginBottom: spacing.xxl,
    lineHeight: 24,
  },
  inputWrapper: {
    width: "100%",
    marginBottom: spacing.xxl,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.subtext,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  btn: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  skipLink: {
    paddingVertical: spacing.md,
  },
  skipText: {
    ...typography.bodySm,
    color: colors.subtext,
    textDecorationLine: "underline",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
  },
  actionCardSecondary: {
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  actionCardText: {
    flex: 1,
  },
  actionCardTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 2,
  },
  actionCardSub: {
    ...typography.bodySm,
    color: colors.subtext,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
});
