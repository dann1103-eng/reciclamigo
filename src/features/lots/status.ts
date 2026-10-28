import type { PolymerCode } from "@/lib/domain/polymers";
import type { LotStatus, Modality } from "@/lib/domain/types";
import { formatLb } from "@/lib/domain/units";

import { formatPickupWindow } from "./format-window";

export type MyLot = {
  id: string;
  polymerCode: PolymerCode;
  estimatedLb: number;
  /** Precio de referencia del lote (USD por libra). */
  pricePerLb: number;
  modality: Modality;
  status: LotStatus;
  pickupFrom: string;
  pickupTo: string;
  createdAt: string;
  pickup: null | {
    id: string;
    collectorId: string;
    collectorName: string;
    collectorWhatsapp: string | null;
    proposedLb: number | null;
    proposedPricePerLb: number | null;
    confirmedLb: number | null;
    totalAmount: number | null;
    voucherCode: string | null;
    completedAt: string | null;
    myRatingGiven: boolean;
    myRating: number | null;
  };
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Estado del lote en palabras del comercio. */
export function myLotStatusLabel(lot: MyLot, now: Date = new Date()): string {
  const collector = lot.pickup?.collectorName ?? "El reciclador";
  switch (lot.status) {
    case "publicado":
      return "Esperando reciclador";
    case "reservado": {
      const window = lowerFirst(formatPickupWindow(new Date(lot.pickupFrom), new Date(lot.pickupTo), now));
      return `${lot.pickup?.collectorName ?? "Un reciclador"} reservó tu lote: pasa ${window}`;
    }
    case "entregado":
      return lot.pickup?.proposedLb
        ? `Registraste ${formatLb(lot.pickup.proposedLb, 2)}. Esperando que ${collector} acepte o corrija`
        : `Entregado, esperando que ${collector} confirme las libras`;
    case "completado":
      return `${formatLb(lot.pickup?.confirmedLb ?? lot.estimatedLb, 2)} confirmadas`;
    case "cancelado":
      return "Cancelado";
  }
}

// Primero lo que pide acción del comercio.
const ORDER: Record<LotStatus, number> = { reservado: 0, entregado: 1, publicado: 2, completado: 3, cancelado: 4 };

export function sortMyLots(lots: MyLot[]): MyLot[] {
  return [...lots].sort(
    (a, b) =>
      ORDER[a.status] - ORDER[b.status] ||
      (b.pickup?.completedAt ?? b.createdAt).localeCompare(a.pickup?.completedAt ?? a.createdAt),
  );
}
