import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, StyleSheet, Text, View, SafeAreaView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
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

  async function onSubmit(values: FormValues) {
    try {
      setApiError(null);
      setNotFound(false);
      setLoading(true);
      const result = await forgotPassword(values.email.trim());
      if (result.exists) {
        setSent(true);
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

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => navigation.navigate("Login")} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
          </Pressable>
          <View style={styles.successSection}>
            <MaterialCommunityIcons name="check-circle" size={80} color={colors.success} style={styles.successIcon} />
            <Text style={styles.successTitle}>Correo enviado</Text>
            <Text style={styles.successSubtitle}>Hemos enviado instrucciones a tu correo para recuperar tu contraseña.</Text>
            <Text style={styles.successText}>Revisa tu bandeja de entrada y sigue los pasos.</Text>
          </View>
          <PrimaryButton title="Volver al login" onPress={() => navigation.navigate("Login")} style={styles.submitButton} />
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
          <Controller control={control} name="email" rules={{ required: "El email es requerido", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Email inválido" } }} render={({ field: { onChange, onBlur, value } }) => (<InputField label="Email" placeholder="tu@email.com" icon="email" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" error={errors.email?.message} />)} />
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
        <PrimaryButton title={loading ? "Enviando..." : "Enviar instrucciones"} onPress={handleSubmit(onSubmit)} style={styles.submitButton} />
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
  successSubtitle: { ...typography.body, color: colors.text, textAlign: "center", marginBottom: spacing.md },
  successText: { ...typography.bodySm, color: colors.subtext, textAlign: "center" },
});
