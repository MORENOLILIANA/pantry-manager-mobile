import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, TextInput } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { ScreenShell } from "@/components/ScreenShell";
import { PrimaryButton } from "@/components/PrimaryButton";

type FormValues = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export function RegisterScreen() {
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { name: "", email: "", password: "", passwordConfirmation: "" }
  });
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);

  async function onSubmit(values: FormValues) {
    try {
      setLoading(true);
      await signUp(values.name, values.email, values.password, values.passwordConfirmation);
    } catch (error) {
      Alert.alert("No se pudo registrar", error instanceof Error ? error.message : "Revisa los datos del formulario.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell title="Registro" subtitle="Crea una cuenta para empezar a gestionar tus despensas.">
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput placeholder="Nombre" placeholderTextColor="#64748b" style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput placeholder="Correo electrónico" placeholderTextColor="#64748b" autoCapitalize="none" keyboardType="email-address" style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput placeholder="Contraseña" placeholderTextColor="#64748b" secureTextEntry style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} />
        )}
      />
      <Controller
        control={control}
        name="passwordConfirmation"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput placeholder="Confirmar contraseña" placeholderTextColor="#64748b" secureTextEntry style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} />
        )}
      />
      <PrimaryButton title={loading ? "Creando cuenta..." : "Crear cuenta"} onPress={handleSubmit(onSubmit)} />
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
  }
});