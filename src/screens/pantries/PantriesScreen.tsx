import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { FeatureItem } from "@/components/FeatureItem";

export function PantriesScreen() {
  return (
    <ScreenShell title="Despensas" subtitle="Listado base para conectarse con GET /pantries.">
      <SectionCard title="Estado inicial">
        <FeatureItem title="Aún sin datos" description="Conecta esta pantalla al endpoint de despensas." />
      </SectionCard>
    </ScreenShell>
  );
}