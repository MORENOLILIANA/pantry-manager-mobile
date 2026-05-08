import { useState } from "react";
import { Alert, StyleSheet, TextInput } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { FeatureItem } from "@/components/FeatureItem";
import { PrimaryButton } from "@/components/PrimaryButton";

export function BarcodeScanScreen() {
  const [barcode, setBarcode] = useState("");

  function handleLookup() {
    if (!barcode.trim()) {
      Alert.alert("Introduce un código", "Escribe un código de barras para probar la búsqueda manual.");
      return;
    }

    Alert.alert("Búsqueda manual", `Aquí podrías llamar a /products/barcode/${barcode.trim()}`);
  }

  return (
    <ScreenShell title="Escáner" subtitle="Pantalla preparada para integrar la cámara y leer códigos de barras.">
      <SectionCard title="Pendiente de cámara">
        <FeatureItem title="Permisos" description="Integra expo-camera o el scanner nativo en el siguiente paso." />
        <TextInput
          placeholder="Escribe o pega un código de barras"
          placeholderTextColor="#64748b"
          value={barcode}
          onChangeText={setBarcode}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="numeric"
        />
        <PrimaryButton title="Buscar código" onPress={handleLookup} />
      </SectionCard>
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