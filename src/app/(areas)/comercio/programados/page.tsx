import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getPlanStatus } from "@/features/plans/load";
import { ScheduledPanel } from "@/features/scheduled/components/scheduled-panel";
import { toScheduledView, type ScheduledView } from "@/features/scheduled/format";
import { fetchCollectorOptions, fetchScheduled } from "@/features/scheduled/queries";
import { requireRole } from "@/lib/auth";
import { formatUSD } from "@/lib/domain/format";
import { getSettings } from "@/lib/settings/load";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Retiros programados" };

const HOW_IT_WORKS = "El sistema crea el lote solo y avisa primero a tu reciclador de confianza.";

export default async function ProgramadosPage() {
  const profile = await requireRole("generador");
  const [plan, settings] = await Promise.all([getPlanStatus(), getSettings()]);
  const supabase = await createClient();
  const now = new Date();

  if (!plan.active) {
    // Si tuvo el plan antes, sus retiros siguen guardados pero no crean lotes hasta que lo reactive.
    let saved: ScheduledView[] = [];
    try {
      saved = (await fetchScheduled(supabase, profile.id)).map((p) => toScheduledView(p, now));
    } catch {
      // Es solo una ayuda: sin la lista, la pantalla explica igual.
    }
    return (
      <>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Retiros programados</h1>
          <p className="max-w-prose text-muted-foreground">
            Si tu negocio genera plástico todas las semanas, no tienes que publicar el lote cada vez. Fijas un día y una hora con un
            reciclador de confianza. {HOW_IT_WORKS}
          </p>
        </div>
        <section className="flex max-w-2xl flex-col gap-4 rounded-xl border border-border bg-card px-5 py-5">
          <p>Por ejemplo: cada lunes de 9:00 a 11:00, 120 lb de PET, con tu reciclador de confianza.</p>
          <p className="text-sm text-muted-foreground">Vender tus lotes siempre es gratis. El plan es para quien necesita documentar lo que recicla.</p>
          <div className="flex flex-col items-start gap-2 rounded-lg bg-paper-2 px-4 py-3">
            <p className="tabular text-sm">
              Los retiros programados son parte del Plan Trazabilidad: <strong className="text-base">{formatUSD(settings.planPriceUsd)} al mes</strong>.
            </p>
            <Link href="/comercio/plan" className={buttonVariants({ size: "lg", className: "h-11 px-4" })}>
              Ver el Plan Trazabilidad
            </Link>
          </div>
        </section>
        {saved.length ? (
          <section className="flex max-w-2xl flex-col gap-3" aria-labelledby="guardados">
            <h2 id="guardados" className="text-xl font-bold">
              Tus retiros guardados
            </h2>
            <p className="text-sm text-muted-foreground">No se crean lotes mientras no tengas el plan activo.</p>
            <ul className="flex flex-col gap-2">
              {saved.map((p) => (
                <li key={p.id} className="tabular rounded-xl border border-border bg-card px-4 py-3 text-sm">
                  {p.description}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </>
    );
  }

  let pickups: ScheduledView[] = [];
  let collectors: Awaited<ReturnType<typeof fetchCollectorOptions>> = { known: [], others: [] };
  let loadError: string | null = null;
  try {
    const [list, options] = await Promise.all([fetchScheduled(supabase, profile.id), fetchCollectorOptions(supabase)]);
    pickups = list.map((p) => toScheduledView(p, now));
    collectors = options;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudieron cargar tus retiros programados.";
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Retiros programados</h1>
        <p className="max-w-prose text-muted-foreground">
          Fija un día y una hora cada semana con un reciclador de confianza. {HOW_IT_WORKS} Si no lo reserva, los demás recicladores cercanos
          se enteran un poco después.
        </p>
      </div>
      {loadError ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {loadError}
        </p>
      ) : (
        <ScheduledPanel pickups={pickups} collectors={collectors} />
      )}
    </>
  );
}
