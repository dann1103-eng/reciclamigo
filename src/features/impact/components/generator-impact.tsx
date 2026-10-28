import { getProfileImpact } from "@/lib/data/profile-impact";
import { formatUSD } from "@/lib/domain/format";
import { formatCo2, formatLb } from "@/lib/domain/units";
import { getSettings } from "@/lib/settings/load";
import { createClient } from "@/lib/supabase/server";

import { impactFigures } from "../figures";

function Figure({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-4">
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="tabular text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</dd>
      <dd className="text-sm text-muted-foreground">{detail}</dd>
    </div>
  );
}

/** Lo que el comercio ha logrado: libras desviadas, CO₂ evitado e ingresos de sus entregas confirmadas. */
export async function GeneratorImpact({ generatorId }: { generatorId: string }) {
  const supabase = await createClient();
  const [impact, settings] = await Promise.all([getProfileImpact(supabase, generatorId), getSettings()]);
  const figures = impactFigures(impact, settings.co2Factor);

  return (
    <section aria-labelledby="tu-impacto" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="tu-impacto" className="text-xl font-bold">
          Tu impacto
        </h2>
        <p className="tabular text-sm text-muted-foreground">
          {figures.deliveries === 0
            ? "Aparece con tu primera entrega confirmada"
            : `${figures.deliveries} ${figures.deliveries === 1 ? "entrega confirmada" : "entregas confirmadas"}`}
        </p>
      </div>
      <dl className="grid divide-y divide-border rounded-xl border border-border bg-card shadow-raised sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Figure label="Libras desviadas" value={formatLb(figures.lb)} detail="de plástico que volvió a la industria" />
        <Figure label="CO₂ evitado" value={formatCo2(figures.co2Kg)} detail="estimado a partir de tus libras" />
        <Figure label="Ingresos" value={formatUSD(figures.income)} detail="de tus ventas confirmadas" />
      </dl>
    </section>
  );
}
