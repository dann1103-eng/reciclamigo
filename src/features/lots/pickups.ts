import type { PolymerCode } from "@/lib/domain/polymers";
import type { LotStatus, Modality } from "@/lib/domain/types";

export type MyPickup = {
  id: string;
  lotId: string;
  polymerCode: PolymerCode;
  estimatedLb: number;
  /** Precio de referencia del lote (USD por libra); el comercio puede proponer otro al registrar la entrega. */
  pricePerLb: number;
  modality: Modality;
  status: LotStatus;
  pickupFrom: string;
  pickupTo: string;
  generatorId: string;
  generatorName: string;
  generatorWhatsapp: string | null;
  /** Lo que el comercio registró como entrega, a la espera de que el reciclador acepte o corrija. */
  proposedLb: number | null;
  proposedPricePerLb: number | null;
  confirmedLb: number | null;
  totalAmount: number | null;
  voucherCode: string | null;
  completedAt: string | null;
  myRatingGiven: boolean;
  myRating: number | null;
};

const THIRTY_DAYS_MS = 30 * 86_400_000;

/** Retiros del reciclador: por recoger, listos para confirmar y completados de los últimos 30 días. */
export function groupMyPickups(pickups: MyPickup[], now: Date = new Date()) {
  const byWindow = (a: MyPickup, b: MyPickup) => a.pickupFrom.localeCompare(b.pickupFrom);
  return {
    toCollect: pickups.filter((p) => p.status === "reservado").sort(byWindow),
    toConfirm: pickups.filter((p) => p.status === "entregado").sort(byWindow),
    completed: pickups
      .filter((p) => p.status === "completado" && p.completedAt && now.getTime() - new Date(p.completedAt).getTime() <= THIRTY_DAYS_MS)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
  };
}
