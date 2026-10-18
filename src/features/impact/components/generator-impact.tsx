import { Placeholder } from "@/components/shell/placeholder";

// Track B reemplaza este componente (mismo nombre y props).
export function GeneratorImpact({ generatorId }: { generatorId: string }) {
  void generatorId;
  return <Placeholder title="Tu impacto" detail="Aquí van los kg desviados, el CO₂e evitado y tus ingresos." />;
}
