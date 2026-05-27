import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, StyleSheet, Text, View, SafeAreaView, Pressable, KeyboardAvoidingView, Platform, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { InputField } from "@/components/InputField";
import type { AuthStackParamList } from "@/navigation/stacks/AuthStack";
import { colors, spacing, typography } from "@/config/theme";

type Navigation = NativeStackNavigationProp<AuthStackParamList>;

type FormValues = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export function RegisterScreen() {
  const { control, handleSubmit, formState: { errors }, watch } = useForm<FormValues>({
    defaultValues: { name: "", email: "", password: "", passwordConfirmation: "" },
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const { signUp } = useAuth();
  const navigation = useNavigation<Navigation>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const passwordValue = watch("password");

  async function onSubmit(values: FormValues) {
    if (values.password !== values.passwordConfirmation) {
      setApiError("Las contraseñas no coinciden.");
      return;
    }
    try {
      setApiError(null);
      setSuccessMessage(null);
      setLoading(true);
      const { needsLogin } = await signUp(values.name, values.email, values.password, values.passwordConfirmation);
      if (needsLogin) {
        setSuccessMessage("¡Cuenta creada! Inicia sesión para continuar.");
        setTimeout(() => navigation.navigate("Login"), 1500);
      }
    } catch (error: unknown) {
      let message = "Revisa los datos del formulario.";
      const axiosError = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (axiosError?.response?.data?.errors) {
        const firstKey = Object.keys(axiosError.response.data.errors)[0];
        message = axiosError.response.data.errors[firstKey][0];
      } else if (axiosError?.response?.data?.message) {
        message = axiosError.response.data.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      setApiError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Image source={require("../../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.logoText}>La Despensa</Text>
        </View>

        {/* Título */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Únete para gestionar tu despensa</Text>
        </View>

        {/* Campos */}
        <View style={styles.formSection}>
          <Controller
            control={control}
            name="name"
            rules={{ required: "El nombre es requerido", minLength: { value: 2, message: "Nombre muy corto" } }}
            render={({ field: { onChange, onBlur, value } }) => (
              <InputField
                label="Nombre completo"
                placeholder="Tu nombre"
                icon="account"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            rules={{
              required: "El email es obligatorio.",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Introduce un email válido (ej: nombre@dominio.com)."
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <InputField
                label="Email"
                placeholder="tu@email.com"
                icon="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                error={errors.email?.message}
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{
              required: "La contraseña es requerida",
              minLength: { value: 8, message: "Mínimo 8 caracteres" }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <InputField
                  label="Contraseña"
                  placeholder="••••••••"
                  icon="lock"
                  rightIcon={
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <MaterialCommunityIcons
                        name={showPassword ? "eye" : "eye-off"}
                        size={20}
                        color={colors.subtext}
                      />
                    </Pressable>
                  }
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  error={errors.password?.message}
                  style={styles.input}
                />
                {!errors.password && (
                  <Text style={styles.hint}>Mínimo 8 caracteres</Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="passwordConfirmation"
            rules={{
              required: "Confirma tu contraseña.",
              validate: (value) => value === passwordValue || "Las contraseñas no coinciden."
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <InputField
                  label="Confirmar contraseña"
                  placeholder="••••••••"
                  icon="lock-check"
                  rightIcon={
                    <Pressable
                      onPress={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={showPasswordConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <MaterialCommunityIcons
                        name={showPasswordConfirm ? "eye" : "eye-off"}
                        size={20}
                        color={colors.subtext}
                      />
                    </Pressable>
                  }
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPasswordConfirm}
                  error={errors.passwordConfirmation?.message}
                  style={styles.input}
                />
              </View>
            )}
          />

          {successMessage && (
            <View style={[styles.errorBox, { backgroundColor: "#e6f4ea" }]}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#2e7d32" />
              <Text style={[styles.errorText, { color: "#2e7d32" }]}>{successMessage}</Text>
            </View>
          )}
          {apiError && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          )}
        </View>

        {/* Botón Crear Cuenta */}
        <PrimaryButton
          label="Crear cuenta"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.submitButton}
        />

        {/* Link Iniciar Sesión */}
        <Pressable 
          onPress={() => navigation.navigate("Login")}
          style={styles.loginLink}
        >
          <Text style={styles.loginText}>
            ¿Ya tienes cuenta? <Text style={styles.loginTextBold}>Iniciar sesión</Text>
          </Text>
        </Pressable>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  logo: {
    width: 90,
    height: 90,
  },
  logoText: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
  },
  formSection: {
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  hint: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  errorBox: {
    flexDirection: "row",
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    flex: 1,
  },
  submitButton: {
    marginBottom: spacing.lg,
  },
  loginLink: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  loginText: {
    ...typography.bodySm,
    color: colors.text,
  },
  loginTextBold: {
    fontWeight: "700",
    color: colors.primary,
  },
});