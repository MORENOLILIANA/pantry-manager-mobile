import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ScrollView, StyleSheet, Text, View, SafeAreaView,
  Pressable, KeyboardAvoidingView, Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PrimaryButton } from "@/components/PrimaryButton";
import { InputField } from "@/components/InputField";
import type { AuthStackParamList } from "@/navigation/stacks/AuthStack";
import { colors, spacing, typography } from "@/config/theme";
import { resetPassword } from "@/api/auth";

type Navigation = NativeStackNavigationProp<AuthStackParamList>;
type Route = RouteProp<AuthStackParamList, "ResetPassword">;

type FormValues = {
  token: string;
  password: string;
  passwordConfirmation: string;
};

export function ResetPasswordScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const params = route.params ?? { token: "", email: "" };
  const hasDeepLinkToken = !!params.token;

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: { token: params.token ?? "", password: "", passwordConfirmation: "" },
    mode: "onBlur",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const passwordValue = watch("password");

  async function onSubmit(values: FormValues) {
    try {
      setApiError(null);
      setLoading(true);
      await resetPassword({
        email: params.email,
        token: values.token.trim(),
        password: values.password,
        password_confirmation: values.passwordConfirmation,
      });
      setDone(true);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ??
        error?.response?.data?.errors?.token?.[0] ??
        "No se pudo cambiar la contraseña. El enlace puede haber expirado.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.successSection}>
            <MaterialCommunityIcons name="check-circle" size={80} color={colors.success} style={styles.icon} />
            <Text style={styles.title}>¡Contraseña cambiada!</Text>
            <Text style={styles.subtitle}>
              Ya puedes iniciar sesión con tu nueva contraseña.
            </Text>
          </View>
          <PrimaryButton
            label="Ir al login"
            onPress={() => navigation.navigate("Login")}
            style={styles.btn}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => navigation.navigate("Login")} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
          </Pressable>

          <View style={styles.iconSection}>
            <MaterialCommunityIcons name="lock-reset" size={72} color={colors.primary} />
          </View>

          <View style={styles.textSection}>
            <Text style={styles.title}>Nueva contraseña</Text>
            <Text style={styles.subtitle}>
              Cuenta: <Text style={styles.emailText}>{params.email}</Text>
            </Text>
          </View>

          <View style={styles.formSection}>
            {/* Token manual — solo si no llegó por deep link */}
            {!hasDeepLinkToken && (
              <Controller
                control={control}
                name="token"
                rules={{ required: "Introduce el código del correo" }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <InputField
                    label="Código del correo"
                    placeholder="Pega aquí el token del correo"
                    icon="key-outline"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.token?.message}
                    autoCapitalize="none"
                  />
                )}
              />
            )}

            <Controller
              control={control}
              name="password"
              rules={{
                required: "La contraseña es requerida",
                minLength: { value: 8, message: "Mínimo 8 caracteres" },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <InputField
                    label="Nueva contraseña"
                    placeholder="••••••••"
                    icon="lock"
                    rightIcon={
                      <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
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
                required: "Confirma tu contraseña",
                validate: (v) => v === passwordValue || "Las contraseñas no coinciden",
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <InputField
                  label="Confirmar contraseña"
                  placeholder="••••••••"
                  icon="lock-check"
                  rightIcon={
                    <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={10}>
                      <MaterialCommunityIcons
                        name={showConfirm ? "eye" : "eye-off"}
                        size={20}
                        color={colors.subtext}
                      />
                    </Pressable>
                  }
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showConfirm}
                  error={errors.passwordConfirmation?.message}
                />
              )}
            />

            {apiError && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{apiError}</Text>
              </View>
            )}
          </View>

          <PrimaryButton
            label="Guardar contraseña"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.btn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  backButton: { marginBottom: spacing.lg, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  iconSection: { alignItems: "center", marginBottom: spacing.xxl },
  icon: { marginBottom: spacing.xl },
  textSection: { alignItems: "center", marginBottom: spacing.xxl },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm, textAlign: "center" },
  subtitle: { ...typography.body, color: colors.subtext, textAlign: "center" },
  emailText: { color: colors.text, fontWeight: "700" },
  formSection: { marginBottom: spacing.xxl, gap: spacing.lg },
  errorBox: {
    flexDirection: "row",
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  hint: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  errorText: { ...typography.bodySm, color: colors.error, flex: 1 },
  btn: { marginBottom: spacing.lg },
  successSection: { alignItems: "center", marginVertical: spacing.xxl },
});
