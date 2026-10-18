"use client";

import { PolymerChip } from "@/components/polymer/polymer-chip";
import { formatDistance, formatKg } from "@/lib/domain/format";
import type { PolymerCode } from "@/lib/domain/polymers";
import { cn } from "@/lib/utils";

import { formatPickupWindow } from "../format-window";
import type { NearbyLot, RadiusM } from "../types";

export function LotList({
  lots,
  radiusM,
  filtered,
  loading,
  onSelect,
  onWiden,
}: {
  lots: NearbyLot[];
  radiusM: RadiusM;
  filtered: boolean;
  loading: boolean;
  onSelect: (id: string) => void;
  onWiden: () => void;
}) {
  if (!loading && lots.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-input px-4 py-6">
        <p className="font-bold">No hay lotes a {radiusM / 1000} km</p>
        <p className="text-sm text-muted-foreground">
          {radiusM < 5000
            ? "Amplía el radio para ver más comercios."
            : filtered
              ? "Prueba con otros tipos de plástico."
              : "Vuelve más tarde: los comercios publican durante el día."}
        </p>
        {radiusM < 5000 ? (
          <button
            type="button"
            onClick={onWiden}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground outline-none hover:bg-brand-strong focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Ver a 5 km
          </button>
        ) : null}
      </div>
    );
  }

  const now = new Date();
  return (
    <ul aria-busy={loading} className={cn("flex flex-col gap-2 transition-opacity", loading && "opacity-60")}>
      {lots.map((lot) => (
        <li key={lot.id}>
          <button
            type="button"
            onClick={() => onSelect(lot.id)}
            className="flex w-full flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-3 text-left outline-none transition-colors duration-200 hover:border-brand focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <PolymerChip code={lot.polymer_code as PolymerCode} />
                <span className="tabular font-bold">{formatKg(Number(lot.estimated_kg))}</span>
              </span>
              <span className="tabular text-sm font-semibold text-brand">{formatDistance(lot.distance_m)}</span>
            </span>
            <span className="text-sm font-medium">{lot.generator_name}</span>
            <span className="text-sm text-muted-foreground">
              {formatPickupWindow(new Date(lot.pickup_from), new Date(lot.pickup_to), now)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
