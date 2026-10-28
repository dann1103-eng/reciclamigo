export type CollectorOption = { id: string; name: string; /** Entregas completadas con este comercio. */ deliveries: number };

/** Cuenta las entregas completadas de cada reciclador (filas de pickups con completed_at). */
export function countDeliveriesByCollector(rows: { collector_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { collector_id } of rows) counts.set(collector_id, (counts.get(collector_id) ?? 0) + 1);
  return counts;
}

const byName = (a: CollectorOption, b: CollectorOption) => a.name.localeCompare(b.name, "es");

/**
 * Recicladores para elegir como "de confianza": primero los que ya completaron entregas con el
 * comercio (los que más, antes) y después todos los demás por nombre.
 */
export function orderCollectors(
  profiles: { id: string; name: string }[],
  deliveries: Map<string, number>,
): { known: CollectorOption[]; others: CollectorOption[] } {
  const options = profiles.map((p): CollectorOption => ({ id: p.id, name: p.name, deliveries: deliveries.get(p.id) ?? 0 }));
  return {
    known: options.filter((o) => o.deliveries > 0).sort((a, b) => b.deliveries - a.deliveries || byName(a, b)),
    others: options.filter((o) => o.deliveries === 0).sort(byName),
  };
}

export function collectorOptionLabel(option: CollectorOption): string {
  if (option.deliveries === 0) return option.name;
  return `${option.name} · ${option.deliveries} ${option.deliveries === 1 ? "entrega" : "entregas"} contigo`;
}
