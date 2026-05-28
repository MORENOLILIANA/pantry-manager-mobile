import { useState, useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { AppState, ScrollView, StyleSheet, Text, View, SafeAreaView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { AuthStackParamList } from "@/navigation/stacks/AuthStack";
import { PrimaryButton } from "@/components/PrimaryButton";
import { InputField } from "@/components/InputField";
import { colors, spacing, typography } from "@/config/theme";
import { forgotPassword } from "@/api/auth";

type ForgotPasswordNavigationType = NativeStackNavigationProp<AuthStackParamList>;

type FormValues = {
  email: string;
};

export function ForgotPasswordScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { email: "" }
  });
  const navigation = useNavigation<ForgotPasswordNavigationType>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownEndRef = useRef<number>(0);
  const lastEmailRef = useRef<string>("");

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  // Recalcula el tiempo restante cuando la app vuelve al primer plano
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" || cooldownEndRef.current === 0) return;
      const remaining = Math.ceil((cooldownEndRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = null;
        cooldownEndRef.current = 0;
        setResendCooldown(0);
      } else {
        setResendCooldown(remaining);
      }
    });
    return () => sub.remove();
  }, []);

  function startCooldown() {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownEndRef.current = Date.now() + 60 * 1000;
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      const remaining = Math.ceil((cooldownEndRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(cooldownRef.current!);
        cooldownRef.current = null;
        cooldownEndRef.current = 0;
        setResendCooldown(0);
      } else {
        setResendCooldown(remaining);
      }
    }, 1000);
  }

  async function onSubmit(values: FormValues) {
    try {
      setApiError(null);
      setNotFound(false);
      setLoading(true);
      lastEmailRef.current = values.email.trim();
      const result = await forgotPassword(lastEmailRef.current);
      if (result.exists) {
        setSent(true);
        startCooldown();
      } else {
        setNotFound(true);
        setApiError(result.message);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? "No se pudo enviar el email. Inténtalo de nuevo.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || !lastEmailRef.current) return;
    try {
      setLoading(true);
      await forgotPassword(lastEmailRef.current);
      startCooldown();
    } catch {
      // silencioso — el usuario ya ve la pantalla de éxito
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => navigation.navigate("Login")} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
          </Pressable>
          <View style={styles.successSection}>
            <MaterialCommunityIcons name="email-check-outline" size={80} color={colors.success} style={styles.successIcon} />
            <Text style={styles.successTitle}>Correo enviado</Text>
            <Text style={styles.successSubtitle}>
              Hemos enviado las instrucciones a{"\n"}
              <Text style={styles.successEmail}>{lastEmailRef.current}</Text>
            </Text>
          </View>

          <View style={styles.spamBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.subtext} />
            <Text style={styles.spamText}>
              ¿No lo ves? Revisa la carpeta de <Text style={styles.spamBold}>spam o correo no deseado</Text>.
              El correo puede tardar unos minutos.
            </Text>
          </View>

          <PrimaryButton
            title="Tengo el código, cambiar contraseña"
            onPress={() => navigation.navigate("ResetPassword", { token: "", email: lastEmailRef.current })}
            style={styles.submitButton}
          />

          <Pressable onPress={() => navigation.navigate("Login")} style={styles.resendLink}>
            <Text style={styles.resendText}>Volver al login</Text>
          </Pressable>

          <Pressable
            onPress={handleResend}
            disabled={resendCooldown > 0 || loading}
            style={styles.resendLink}
          >
            <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
              {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : "No me ha llegado, reenviar"}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.iconSection}>
          <MaterialCommunityIcons name="email" size={80} color={colors.primary} />
        </View>
        <View style={styles.textSection}>
          <Text style={styles.title}>Recuperar contraseña</Text>
          <Text style={styles.subtitle}>Ingresa tu email y te enviaremos instrucciones para recuperar tu contraseña.</Text>
        </View>
        <View style={styles.formSection}>
          <Controller control={control} name="email" rules={{ required: "El email es requerido", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Email inválido" } }} render={({ field: { onChange, onBlur, value } }) => (<InputField label="Email" placeholder="tu@email.com" icon="email" value={value} onChangeText={(text) => { onChange(text); if (notFound) { setNotFound(false); setApiError(null); } }} onBlur={onBlur} keyboardType="email-address" error={errors.email?.message} />)} />
          {apiError && (
            <View style={[styles.errorBox, notFound && styles.notFoundBox]}>
              <MaterialCommunityIcons
                name={notFound ? "account-off" : "alert-circle"}
                size={18}
                color={notFound ? colors.subtext : colors.error}
              />
              <Text style={[styles.errorText, notFound && styles.notFoundText]}>{apiError}</Text>
            </View>
          )}
        </View>
        {!notFound && (
          <PrimaryButton title={loading ? "Enviando..." : "Enviar instrucciones"} onPress={handleSubmit(onSubmit)} style={styles.submitButton} />
        )}
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
  textSection: { alignItems: "center", marginBottom: spacing.xxl },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  subtitle: { ...typography.body, color: colors.subtext, textAlign: "center" },
  formSection: { marginBottom: spacing.xxl },
  errorBox: { flexDirection: "row", backgroundColor: colors.errorLight, borderRadius: 8, padding: spacing.md, gap: spacing.sm, alignItems: "center", marginTop: spacing.md },
  errorText: { ...typography.bodySm, color: colors.error, flex: 1 },
  notFoundBox: { backgroundColor: "#F5F5F5" },
  notFoundText: { color: colors.subtext },
  submitButton: { marginBottom: spacing.lg },
  successSection: { alignItems: "center", marginVertical: spacing.xxl },
  successIcon: { marginBottom: spacing.xl },
  successTitle: { ...typography.h2, color: colors.success, marginBottom: spacing.md },
  successSubtitle: { ...typography.body, color: colors.subtext, textAlign: "center", marginBottom: spacing.sm },
  successEmail: { ...typography.body, color: colors.text, fontWeight: "700" },
  spamBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.xxl,
  },
  spamText: { ...typography.bodySm, color: colors.subtext, flex: 1, lineHeight: 20 },
  spamBold: { fontWeight: "700", color: colors.text },
  resendLink: { alignItems: "center", paddingVertical: spacing.md },
  resendText: { ...typography.bodySm, color: colors.primary, fontWeight: "600" },
  resendTextDisabled: { color: colors.subtext },
});
