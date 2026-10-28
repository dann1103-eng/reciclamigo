import { PolymerChip } from "@/components/polymer/polymer-chip";
import { formatDistance, formatPricePerLb, formatUSD } from "@/lib/domain/format";
import { suggestedTotal } from "@/lib/domain/pricing";
import { co2AvoidedKg, formatCo2, formatLb } from "@/lib/domain/units";
import { cn } from "@/lib/utils";

// Una entrega de ejemplo, calculada con las mismas reglas que usa la app.
const LB = 100;
const PRICE_PER_LB = 0.09;
const DISTANCE_M = 1800;

/** Boleta de báscula: cómo queda registrado un retiro. */
/** `co2Factor` viene de la configuración; sin él (por ejemplo, si la base no responde) no se muestra el CO₂. */
export function WeighTicket({ className, co2Factor }: { className?: string; co2Factor?: number }) {
  const rows: [string, React.ReactNode][] = [
    ["Comercio", "Comedor La Ceiba"],
    ["Material", <PolymerChip key="chip" code="PET" />],
    ["Peso confirmado", formatLb(LB)],
    ["Retiró", `Don José, a ${formatDistance(DISTANCE_M)}`],
    ["Precio", formatPricePerLb(PRICE_PER_LB)],
    ["Pago", `${formatUSD(suggestedTotal(LB, PRICE_PER_LB, "venta"))} en efectivo`],
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
        <span className="block font-bold tracking-[0.06em] uppercase">Comprobante de entrega</span>
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
      {co2Factor !== undefined ? (
        <p className="tabular rounded-md bg-accent-warm-soft px-3 py-2 font-semibold text-accent-warm-ink">
          {formatCo2(co2AvoidedKg(LB, co2Factor))} de CO₂ evitado
        </p>
      ) : null}
    </figure>
  );
}
