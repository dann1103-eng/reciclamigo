import { Placeholder } from "@/components/shell/placeholder";

// Track A reemplaza este componente (mismo nombre y props).
export function MyLots({ generatorId }: { generatorId: string }) {
  void generatorId;
  return <Placeholder title="Mis lotes" detail="Aquí verás tus lotes publicados, reservados y entregados." />;
}
