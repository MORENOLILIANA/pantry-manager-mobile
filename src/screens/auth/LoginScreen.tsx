import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "@/context/AuthContext";
import { ScreenShell } from "@/components/ScreenShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { AuthStackParamList } from "@/navigation/stacks/AuthStack";

type Navigation = NativeStackNavigationProp<AuthStackParamList>;

type FormValues = {
  email: string;
  password: string;
};

export function LoginScreen() {
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { email: "", password: "" }
  });
  const { signIn } = useAuth();
  const navigation = useNavigation<Navigation>();
  const [loading, setLoading] = useState(false);

  async function onSubmit(values: FormValues) {
    try {
      setLoading(true);
      await signIn(values.email, values.password);
    } catch (error) {
      Alert.alert("No se pudo iniciar sesión", error instanceof Error ? error.message : "Revisa tus credenciales.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell title="Acceso" subtitle="Entra con tu cuenta para ver despensas, listas y productos.">
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            placeholder="Correo electrónico"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor="#64748b"
            secureTextEntry
            style={styles.input}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      <View style={styles.actionsRow}>
        <Pressable onPress={() => navigation.navigate("ForgotPassword")} style={styles.linkButton}>
          <Text style={styles.linkText}>Olvidé la contraseña</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Register")} style={styles.linkButton}>
          <Text style={styles.linkText}>Crear cuenta</Text>
        </Pressable>
      </View>
      <PrimaryButton title={loading ? "Entrando..." : "Iniciar sesión"} onPress={handleSubmit(onSubmit)} />
      <Text style={styles.helper}>El token se guarda de forma segura para restaurar la sesión.</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#243244",
    paddingHorizontal: 16,
    color: "#f9fafb"
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  linkButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#243244",
    backgroundColor: "#0f172a"
  },
  linkText: {
    color: "#4ade80",
    fontSize: 13,
    fontWeight: "700"
  },
  helper: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 18
  }
});