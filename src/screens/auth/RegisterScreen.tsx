import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, StyleSheet, Text, View, SafeAreaView, Pressable } from "react-native";
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
    defaultValues: { name: "", email: "", password: "", passwordConfirmation: "" }
  });
  const { signUp } = useAuth();
  const navigation = useNavigation<Navigation>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const passwordValue = watch("password");

  async function onSubmit(values: FormValues) {
    if (values.password !== values.passwordConfirmation) {
      setApiError("Las contraseñas no coinciden.");
      return;
    }
    try {
      setApiError(null);
      setLoading(true);
      await signUp(values.name, values.email, values.password, values.passwordConfirmation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Revisa los datos del formulario.";
      setApiError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <MaterialCommunityIcons name="leaf" size={48} color={colors.primary} />
          <Text style={styles.logoText}>NutriCasa</Text>
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
              required: "El email es requerido",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Email inválido"
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
              minLength: { value: 6, message: "Mínimo 6 caracteres" }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <InputField
                  label="Contraseña"
                  placeholder="••••••••"
                  icon="lock"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  error={errors.password?.message}
                  style={styles.input}
                />
                <Pressable 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.showPasswordButton}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </Text>
                </Pressable>
              </View>
            )}
          />

          <Controller
            control={control}
            name="passwordConfirmation"
            rules={{
              required: "Confirma tu contraseña",
              validate: (value) => value === passwordValue || "Las contraseñas no coinciden"
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <InputField
                  label="Confirmar contraseña"
                  placeholder="••••••••"
                  icon="lock-check"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPasswordConfirm}
                  error={errors.passwordConfirmation?.message}
                  style={styles.input}
                />
                <Pressable 
                  onPress={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  style={styles.showPasswordButton}
                >
                  <Text style={styles.showPasswordText}>
                    {showPasswordConfirm ? "Ocultar" : "Mostrar"}
                  </Text>
                </Pressable>
              </View>
            )}
          />

          {/* Error del API */}
          {apiError && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          )}
        </View>

        {/* Botón Crear Cuenta */}
        <PrimaryButton 
          title={loading ? "Creando..." : "Crear cuenta"} 
          onPress={handleSubmit(onSubmit)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
  showPasswordButton: {
    position: "absolute",
    right: spacing.md,
    top: spacing.md + 10,
    paddingHorizontal: spacing.sm,
  },
  showPasswordText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "600",
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