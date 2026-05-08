import { StyleSheet, View } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { StatCard } from "@/components/StatCard";
import { SectionCard } from "@/components/SectionCard";
import { FeatureItem } from "@/components/FeatureItem";

export function DashboardScreen() {
  return (
    <ScreenShell title="Dashboard" subtitle="Resumen rápido de despensas, listas y alertas.">
      <View style={styles.statsRow}>
        <StatCard label="Despensas" value="0" />
        <StatCard label="Listas" value="0" />
      </View>
      <SectionCard title="Accesos rápidos">
        <FeatureItem title="Buscar productos" description="Nombre, código de barras o sugerencias." meta="Ir" />
        <FeatureItem title="Escanear código" description="Abre la cámara para buscar o registrar." meta="Ir" />
        <FeatureItem title="Recursos compartidos" description="Unirse con token público." meta="Ir" />
      </SectionCard>
      <SectionCard title="Alertas">
        <FeatureItem title="Sin datos todavía" description="Cuando el backend responda, aquí verás vencimientos y stock bajo." />
      </SectionCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: 12
  }
});