import { Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { getPlanStatus } from "@/features/plans/load";
import { getProfileImpact } from "@/lib/data/profile-impact";
import { createClient } from "@/lib/supabase/server";

import { circularQrDataUrl } from "../qr";
import { circularCardState, formatLongDate } from "../state";
import { circularQrDownloadPath, circularUrl } from "../url";

import { CircularSeal } from "./circular-seal";

function Shell({ earned, children }: { earned: boolean; children: ReactNode }) {
  return (
    <section
      aria-labelledby="comercio-circular"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card px-5 py-5 shadow-raised"
    >
      <div className="flex items-center gap-4">
        <CircularSeal earned={earned} />
        <h2 id="comercio-circular" className="text-xl font-bold">
          Comercio Circular
        </h2>
      </div>
      {children}
    </section>
  );
}

const PLAN_LINK = "inline-flex h-11 w-fit items-center rounded-lg border border-border px-4 text-sm font-semibold outline-none hover:bg-paper-2 focus-visible:ring-3 focus-visible:ring-ring/50";

/** Insignia "Comercio Circular" del comercio, en su pantalla. Tres estados según sus entregas y su plan. */
export async function CircularCard({ generatorId }: { generatorId: string }) {
  const supabase = await createClient();
  const [profile, impact, plan] = await Promise.all([
    supabase.from("profiles").select("slug").eq("id", generatorId).maybeSingle(),
    getProfileImpact(supabase, generatorId),
    getPlanStatus(),
  ]);
  if (profile.error) throw new Error(profile.error.message);

  const slug = profile.data?.slug ?? null;
  const state = circularCardState({ deliveries: Number(impact?.completed_count ?? 0), plan });

  if (state.kind === "sin-entregas") {
    return (
      <Shell earned={false}>
        <p className="text-sm text-muted-foreground">Tu insignia aparece con tu primera entrega confirmada.</p>
      </Shell>
    );
  }

  if (state.kind === "basica") {
    return (
      <Shell earned>
        <p className="text-sm">Ya tienes la insignia &ldquo;Comercio Circular&rdquo; en tu perfil.</p>
        {state.planExpiredAt ? (
          <p role="status" className="rounded-lg bg-accent-warm-soft px-3 py-2 text-sm font-semibold text-accent-warm-ink">
            Tu plan venció el {formatLongDate(state.planExpiredAt)}. Tu página pública con QR está pausada hasta que lo renueves.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">Con el plan: página pública con QR y libras recicladas.</p>
        <Link href="/comercio/plan" className={PLAN_LINK}>
          {state.planExpiredAt ? "Renovar el plan" : "Ver el Plan Trazabilidad"}
        </Link>
      </Shell>
    );
  }

  if (!slug) {
    return (
      <Shell earned>
        <p className="text-sm text-muted-foreground">
          Tu plan está activo, pero tu dirección pública todavía no está lista. Escríbenos y el equipo la revisa.
        </p>
      </Shell>
    );
  }

  const url = circularUrl(slug);
  const qr = await circularQrDataUrl(slug);
  return (
    <Shell earned>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- QR generado en el servidor (data URL) */}
        <img src={qr} alt="Código QR de tu página pública" className="size-32 rounded-md border border-border" />
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Tu página pública</p>
            <Link href={`/circular/${slug}`} className="font-semibold break-all text-brand underline-offset-4 hover:underline">
              {url}
            </Link>
            <p className="text-sm text-muted-foreground">
              Cualquiera la ve sin iniciar sesión: tus libras recicladas, el CO₂ evitado y tu última entrega. No muestra
              datos personales ni de los recicladores.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Es un archivo, no una página: enlace normal, sin precarga de Next. */}
            <a href={circularQrDownloadPath(slug)} download className={buttonVariants({ size: "xl" })}>
              <Download aria-hidden="true" />
              Descargar QR
            </a>
            <Link href={`/circular/${slug}`} className={buttonVariants({ size: "xl", variant: "outline" })}>
              <ExternalLink aria-hidden="true" />
              Ver mi página
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
