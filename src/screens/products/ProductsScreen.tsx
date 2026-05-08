import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { FeatureItem } from "@/components/FeatureItem";

export function ProductsScreen() {
  return (
    <ScreenShell title="Productos" subtitle="Buscador, detalle y resultados por código de barras.">
      <SectionCard title="Búsqueda">
        <FeatureItem title="Sin resultados" description="Conecta esta vista con /products/search y /products/barcode/{barcode}." />
      </SectionCard>
    </ScreenShell>
  );
}