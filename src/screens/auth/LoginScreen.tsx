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
  email: string;
  password: string;
};

export function LoginScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Revisa tus credenciales.";
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

          {/* Demo Credentials Box */}
          <View style={styles.demoBox}>
            <MaterialCommunityIcons name="information" size={16} color={colors.info} />
            <View style={styles.demoContent}>
              <Text style={styles.demoLabel}>Credenciales de demo:</Text>
              <Text style={styles.demoValue}>Email: demo@test.com</Text>
              <Text style={styles.demoValue}>Contraseña: demo</Text>
            </View>
          </View>
        </View>

        {/* Botón Iniciar Sesión */}
        <PrimaryButton 
          title={loading ? "Entrando..." : "Iniciar sesión"} 
          onPress={handleSubmit(onSubmit)}
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
    paddingVertical: spacing.xl,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
    marginTop: spacing.lg,
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