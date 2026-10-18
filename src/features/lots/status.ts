import { formatKg } from "@/lib/domain/format";
import type { PolymerCode } from "@/lib/domain/polymers";
import type { LotStatus } from "@/lib/domain/types";

import { formatPickupWindow } from "./format-window";

export type MyLot = {
  id: string;
  polymerCode: PolymerCode;
  estimatedKg: number;
  status: LotStatus;
  pickupFrom: string;
  pickupTo: string;
  createdAt: string;
  pickup: null | {
    id: string;
    collectorId: string;
    collectorName: string;
    collectorWhatsapp: string | null;
    confirmedKg: number | null;
    totalAmount: number | null;
    certificateCode: string | null;
    completedAt: string | null;
    myRatingGiven: boolean;
  };
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Estado del lote en palabras del comercio. */
export function myLotStatusLabel(lot: MyLot, now: Date = new Date()): string {
  switch (lot.status) {
    case "publicado":
      return "Esperando reciclador";
    case "reservado": {
      const window = lowerFirst(formatPickupWindow(new Date(lot.pickupFrom), new Date(lot.pickupTo), now));
      return `${lot.pickup?.collectorName ?? "Un reciclador"} reservó tu lote: pasa ${window}`;
    }
    case "entregado":
      return "Entregado, esperando la confirmación de kg";
    case "completado":
      return `${formatKg(lot.pickup?.confirmedKg ?? lot.estimatedKg)} confirmados`;
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
