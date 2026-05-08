import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { FeatureItem } from "@/components/FeatureItem";

export function ShoppingListsScreen() {
  return (
    <ScreenShell title="Listas de compra" subtitle="Base para consumir GET /shopping-lists.">
      <SectionCard title="Estado inicial">
        <FeatureItem title="Aún sin datos" description="Aquí podrás crear, editar y completar listas." />
      </SectionCard>
    </ScreenShell>
  );
}