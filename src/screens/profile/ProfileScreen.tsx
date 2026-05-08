import { useAuth } from "@/context/AuthContext";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { FeatureItem } from "@/components/FeatureItem";
import { PrimaryButton } from "@/components/PrimaryButton";

export function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <ScreenShell title="Perfil" subtitle="Datos del usuario y acciones de cuenta.">
      <SectionCard title="Usuario">
        <FeatureItem title={user?.name ?? "Sin nombre"} description={user?.email ?? "Sin correo"} meta={user?.role ?? "user"} />
      </SectionCard>
      <PrimaryButton title="Cerrar sesión" onPress={() => void signOut()} variant="secondary" />
    </ScreenShell>
  );
}