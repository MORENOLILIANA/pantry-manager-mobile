import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, TextInput } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { PrimaryButton } from "@/components/PrimaryButton";

type FormValues = {
  email: string;
};

export function ForgotPasswordScreen() {
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { email: "" }
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(values: FormValues) {
    try {
      setLoading(true);
      Alert.alert("Recuperación pendiente", `Aquí puedes conectar el envío de recuperación para ${values.email}.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell title="Recuperar contraseña" subtitle="Escribe tu correo para iniciar el flujo de recuperación.">
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
      <PrimaryButton title={loading ? "Enviando..." : "Enviar enlace"} onPress={handleSubmit(onSubmit)} />
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