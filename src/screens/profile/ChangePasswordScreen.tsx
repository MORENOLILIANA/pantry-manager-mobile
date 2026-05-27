import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { colors, spacing, borderRadius, typography } from "@/config/theme";
import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { changePassword } from "@/api/auth";

type Navigation = NativeStackNavigationProp<any>;

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordScreen() {
  const navigation = useNavigation<Navigation>();
  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const newPassword = watch("newPassword");
  const confirmPassword = watch("confirmPassword");
  const passwordsMatch = newPassword === confirmPassword;

  const onSubmit = async (data: FormData) => {
    if (!passwordsMatch) {
      Alert.alert("Error", "Las contraseñas nuevas no coinciden");
      return;
    }

    try {
      setLoading(true);
      await changePassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
        new_password_confirmation: data.confirmPassword,
      });

      Alert.alert("Éxito", "Contraseña actualizada correctamente", [
        {
          text: "OK",
          onPress: () => {
            reset();
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error("Error changing password:", error);
      const message =
        error.response?.data?.message ||
        "No se pudo cambiar la contraseña";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={colors.primary}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Cambiar contraseña</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Formulario */}
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={styles.description}>
            Introduce tu contraseña actual y la nueva contraseña que deseas usar.
          </Text>

          {/* Contraseña actual */}
          <Controller
            control={control}
            name="currentPassword"
            rules={{ required: "La contraseña actual es requerida" }}
            render={({ field: { value, onChange } }) => (
              <InputField
                label="Contraseña actual"
                value={value}
                onChangeText={onChange}
                placeholder="Introduce tu contraseña"
                secureTextEntry={!showCurrentPassword}
                icon="lock"
                rightIcon={
                  <Pressable
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={showCurrentPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <MaterialCommunityIcons
                      name={showCurrentPassword ? "eye" : "eye-off"}
                      size={20}
                      color={colors.subtext}
                    />
                  </Pressable>
                }
              />
            )}
          />

          {/* Nueva contraseña */}
          <Controller
            control={control}
            name="newPassword"
            rules={{
              required: "La nueva contraseña es requerida",
              minLength: { value: 8, message: "Mínimo 8 caracteres" },
            }}
            render={({ field: { value, onChange } }) => (
              <View>
                <InputField
                  label="Nueva contraseña"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Introduce tu nueva contraseña"
                  secureTextEntry={!showNewPassword}
                  icon="lock"
                  rightIcon={
                    <Pressable
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <MaterialCommunityIcons
                        name={showNewPassword ? "eye" : "eye-off"}
                        size={20}
                        color={colors.subtext}
                      />
                    </Pressable>
                  }
                  error={errors.newPassword?.message}
                />
                {!errors.newPassword && (
                  <Text style={styles.hint}>Mínimo 8 caracteres</Text>
                )}
              </View>
            )}
          />

          {/* Confirmar contraseña */}
          <Controller
            control={control}
            name="confirmPassword"
            rules={{ required: "Debe confirmar la contraseña" }}
            render={({ field: { value, onChange } }) => (
              <InputField
                label="Confirmar contraseña"
                value={value}
                onChangeText={onChange}
                placeholder="Confirma tu nueva contraseña"
                secureTextEntry={!showConfirmPassword}
                icon="lock"
                rightIcon={
                  <Pressable
                    onPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <MaterialCommunityIcons
                      name={showConfirmPassword ? "eye" : "eye-off"}
                      size={20}
                      color={colors.subtext}
                    />
                  </Pressable>
                }
              />
            )}
          />

          {!passwordsMatch && newPassword && confirmPassword && (
            <View style={styles.errorMessage}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={16}
                color={colors.error}
              />
              <Text style={styles.errorText}>
                Las contraseñas no coinciden
              </Text>
            </View>
          )}

          <View style={styles.spacer} />
        </ScrollView>

        {/* Botón */}
        <View style={styles.footer}>
          <PrimaryButton
            label="Guardar cambios"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading || !passwordsMatch}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  form: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.subtext,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  hint: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  errorMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: "#FADBD8",
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    fontWeight: "600",
  },
  spacer: {
    height: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
