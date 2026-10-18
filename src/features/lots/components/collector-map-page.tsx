import { Placeholder } from "@/components/shell/placeholder";

// Track A reemplaza este componente (mismo nombre y props).
export function CollectorMapPage({ collectorId }: { collectorId: string }) {
  void collectorId;
  return <Placeholder title="Lotes cerca de ti" detail="Aquí va el mapa con los lotes publicados a 1, 3 y 5 km." />;
}
