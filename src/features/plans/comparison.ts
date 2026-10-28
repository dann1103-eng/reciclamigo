import { formatUSD } from "@/lib/domain/format";
import type { AppSettings } from "@/lib/domain/settings";

export type PlanComparisonRow = { feature: string; free: string; paid: string };

/**
 * Gratis contra Plan Trazabilidad: las 12 funciones de la sección 3 del documento de cambios.
 * El límite de lotes y los días de historial salen de la configuración, no del código.
 */
export function planComparisonRows(settings: Pick<AppSettings, "freeLotsPerMonth" | "freeHistoryDays">): PlanComparisonRow[] {
  return [
    { feature: "Lotes publicados al mes", free: `Hasta ${settings.freeLotsPerMonth}`, paid: "Ilimitados" },
    { feature: "Mapa de lotes, reserva y enlace a WhatsApp", free: "Sí", paid: "Sí" },
    { feature: "Comprobante de cada venta", free: "Sí", paid: "Sí" },
    { feature: "Republicación automática si el valorizador no llega", free: "Sí", paid: "Sí" },
    { feature: "Repetir lote con un toque", free: "Sí", paid: "Sí" },
    { feature: "Precio de referencia por material", free: "Sí", paid: "Sí" },
    { feature: "ReciclaPuntos por entregas confirmadas", free: "Sí", paid: "Sí" },
    {
      feature: 'Insignia "Comercio Circular"',
      free: "Básica, en su perfil",
      paid: "Con QR y página pública de libras recicladas",
    },
    {
      feature: "Historial",
      free: `Últimos ${settings.freeHistoryDays} días`,
      paid: "Completo y exportable (CSV y PDF)",
    },
    { feature: "Reporte mensual de trazabilidad", free: "No", paid: "Sí" },
    { feature: "Retiros programados con el mismo valorizador", free: "No", paid: "Sí" },
    { feature: "Prioridad en avisos (antes y en mayor radio)", free: "No", paid: "Sí" },
  ];
}

/** "$14.99/mes" */
export function planPriceLabel(priceUsd: number): string {
  return `${formatUSD(priceUsd)}/mes`;
}
