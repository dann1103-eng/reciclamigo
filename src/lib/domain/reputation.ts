// La reputación vive en la base (vista profile_impact): crece SOLO con entregas confirmadas
// y buenas calificaciones. Aquí solo se nombra y se muestra. Una mejor reputación da
// prioridad en los avisos, así al reciclador le conviene confirmar cada entrega en la app.

export type ReputationTier = "nuevo" | "en_marcha" | "confiable" | "destacado";

export const REPUTATION_LABEL: Record<ReputationTier, string> = {
  nuevo: "Nuevo",
  en_marcha: "En marcha",
  confiable: "Confiable",
  destacado: "Destacado",
};

export function isPrioritized(tier: ReputationTier): boolean {
  return tier === "confiable" || tier === "destacado";
}

const oneDecimal = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 1 });

export function reputationLine(p: {
  tier: ReputationTier;
  completedCount: number;
  ratingAvg: number | null;
  ratingCount: number;
}): string {
  const deliveries =
    p.completedCount === 0
      ? "Sin entregas confirmadas"
      : `${p.completedCount} ${p.completedCount === 1 ? "entrega confirmada" : "entregas confirmadas"}`;
  const rating =
    p.ratingAvg === null || p.ratingCount === 0
      ? "Sin calificaciones todavía"
      : `${oneDecimal.format(p.ratingAvg)} ★ (${p.ratingCount})`;
  return [REPUTATION_LABEL[p.tier], deliveries, rating].join(" · ");
}
