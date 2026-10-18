import type { PolymerCode } from "@/lib/domain/polymers";
import type { LotStatus, Modality } from "@/lib/domain/types";

export type MyPickup = {
  id: string;
  lotId: string;
  polymerCode: PolymerCode;
  estimatedKg: number;
  pricePerKg: number;
  modality: Modality;
  status: LotStatus;
  pickupFrom: string;
  pickupTo: string;
  generatorId: string;
  generatorName: string;
  generatorWhatsapp: string | null;
  confirmedKg: number | null;
  totalAmount: number | null;
  certificateCode: string | null;
  completedAt: string | null;
  myRatingGiven: boolean;
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
