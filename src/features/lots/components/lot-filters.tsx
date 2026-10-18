"use client";

import { PolymerChip } from "@/components/polymer/polymer-chip";
import { POLYMER_CODES, type PolymerCode } from "@/lib/domain/polymers";
import { cn } from "@/lib/utils";

import { RADIUS_OPTIONS, type RadiusM } from "../types";

export function LotFilters({
  radiusM,
  polymers,
  onRadius,
  onTogglePolymer,
}: {
  radiusM: RadiusM;
  polymers: PolymerCode[];
  onRadius: (r: RadiusM) => void;
  onTogglePolymer: (code: PolymerCode) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Radio de búsqueda" className="inline-flex w-fit rounded-xl bg-paper-2 p-1">
        {RADIUS_OPTIONS.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={radiusM === r}
            onClick={() => onRadius(r)}
            className={cn(
              "tabular h-9 rounded-lg px-4 text-sm font-semibold outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50",
              radiusM === r ? "bg-card text-foreground shadow-raised" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r / 1000} km
          </button>
        ))}
      </div>
      <div role="group" aria-label="Tipo de plástico" className="flex flex-wrap gap-2">
        {POLYMER_CODES.map((code) => {
          const on = polymers.includes(code);
          return (
            <button
              key={code}
              type="button"
              aria-pressed={on}
              onClick={() => onTogglePolymer(code)}
              className={cn(
                "rounded-full outline-none transition-opacity duration-200 focus-visible:ring-3 focus-visible:ring-ring/50",
                polymers.length > 0 && !on && "opacity-45 hover:opacity-80",
                on && "ring-2 ring-brand ring-offset-1 ring-offset-background",
              )}
            >
              <PolymerChip code={code} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
