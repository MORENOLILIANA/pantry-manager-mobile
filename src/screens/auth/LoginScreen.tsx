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
  email: string;
  password: string;
};

export function LoginScreen() {
  const { control, handleSubmit, formState: { errors }, setError } = useForm<FormValues>({
    defaultValues: { email: "", password: "" }
  });
  const { signIn } = useAuth();
  const navigation = useNavigation<Navigation>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function onSubmit(values: FormValues) {
    try {
      setApiError(null);
      setLoading(true);
      await signIn(values.email, values.password);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } } };
      const status = axiosError?.response?.status;
      const serverErrors = axiosError?.response?.data?.errors;
      const serverMessage = axiosError?.response?.data?.message;

      if (serverErrors) {
        if (serverErrors.email) {
          setError("email", { message: "Este correo no está registrado. ¿Quieres crear una cuenta?" });
        }
        if (serverErrors.password) {
          setError("password", { message: "Contraseña incorrecta." });
        }
        if (!serverErrors.email && !serverErrors.password) {
          setApiError(Object.values(serverErrors)[0][0]);
        }
      } else if (status === 401 || status === 403) {
        setApiError("Email o contraseña incorrectos.");
      } else if (status === 404) {
        setError("email", { message: "Este correo no está registrado. ¿Quieres crear una cuenta?" });
      } else if (status === 422 && serverMessage) {
        setApiError(serverMessage);
      } else if (error instanceof Error) {
        setApiError(error.message);
      } else {
        setApiError("Revisa tus credenciales.");
      }
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

        {/* Subtítulo */}
        <View style={styles.subtitleSection}>
          <Text style={styles.subtitle}>Bienvenido de nuevo</Text>
        </View>

        {/* Campos */}
        <View style={styles.formSection}>
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
            rules={{ required: "La contraseña es requerida" }}
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

          {/* Error del API */}
          {apiError && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          )}

        </View>

        {/* Botón Iniciar Sesión */}
        <PrimaryButton
          label="Iniciar sesión"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.submitButton}
        />

        {/* Link Olvidé Contraseña */}
        <Pressable 
          onPress={() => navigation.navigate("ForgotPassword")}
          style={styles.forgotLink}
        >
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </Pressable>

        {/* Separador */}
        <View style={styles.separator}>
          <View style={styles.line} />
          <Text style={styles.separatorText}>o</Text>
          <View style={styles.line} />
        </View>

        {/* Link Crear Cuenta */}
        <Pressable 
          onPress={() => navigation.navigate("Register")}
          style={styles.registerLink}
        >
          <Text style={styles.registerText}>
            ¿No tienes cuenta? <Text style={styles.registerTextBold}>Crear cuenta</Text>
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
    paddingVertical: spacing.xl,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
    marginTop: spacing.lg,
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
  subtitleSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
  },
  formSection: {
    marginBottom: spacing.xxl,
    gap: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
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
  hint: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  submitButton: {
    marginBottom: spacing.lg,
  },
  forgotLink: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  forgotText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "600",
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xxl,
    gap: spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorText: {
    ...typography.bodySm,
    color: colors.subtext,
  },
  registerLink: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  registerText: {
    ...typography.bodySm,
    color: colors.text,
  },
  registerTextBold: {
    fontWeight: "700",
    color: colors.primary,
  },
  demoBox: {
    flexDirection: "row",
    backgroundColor: colors.info + "15",
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "flex-start",
    marginTop: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  demoContent: {
    flex: 1,
    gap: spacing.xs,
  },
  demoLabel: {
    ...typography.bodySm,
    color: colors.info,
    fontWeight: "700",
  },
  demoValue: {
    ...typography.bodySm,
    color: colors.info,
    fontFamily: "monospace",
  },
});