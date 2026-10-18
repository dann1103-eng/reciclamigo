import { PolymerChip } from "@/components/polymer/polymer-chip";
import { formatDistance, formatKg, formatUSD } from "@/lib/domain/format";
import { co2eAvoidedKg } from "@/lib/domain/impact";
import { suggestedTotal } from "@/lib/domain/pricing";
import { cn } from "@/lib/utils";

// Un retiro de ejemplo, calculado con las mismas reglas que usa la app.
const KG = 40;
const PRICE_PER_KG = 0.2;
const DISTANCE_M = 1800;

/** Boleta de báscula: cómo queda registrado un retiro. */
export function WeighTicket({ className }: { className?: string }) {
  const rows: [string, React.ReactNode][] = [
    ["Comercio", "Comedor La Ceiba"],
    ["Material", <PolymerChip key="chip" code="PET" />],
    ["Peso confirmado", formatKg(KG)],
    ["Retiró", `Don José, a ${formatDistance(DISTANCE_M)}`],
    ["Pago", `${formatUSD(suggestedTotal(KG, PRICE_PER_KG, "venta"))} en efectivo`],
  ];

  return (
    <figure
      className={cn(
        "w-[min(18rem,100%)] bg-card px-5 pt-5 pb-3 text-sm shadow-float",
        "[mask-image:radial-gradient(circle_at_8px_0,transparent_5px,black_5.5px)] [mask-size:16px_100%] [mask-repeat:repeat-x]",
        className,
      )}
    >
      <figcaption className="border-b border-dashed border-border pb-3">
        <span className="block font-bold tracking-[0.06em] uppercase">Boleta de retiro</span>
        <span className="tabular text-xs text-muted-foreground">RCA-2026-0A1B2C</span>
      </figcaption>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 py-3">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular text-right font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="tabular rounded-md bg-accent-warm-soft px-3 py-2 font-semibold text-accent-warm-ink">
        {formatKg(co2eAvoidedKg(KG))} de CO₂e evitados
      </p>
    </figure>
  );
}
