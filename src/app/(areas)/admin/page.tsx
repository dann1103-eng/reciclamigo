import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AdminHeading } from "@/features/admin/components/admin-heading";
import { loadOverview } from "@/features/admin/queries";
import { currentMonth, monthLabel } from "@/features/commissions/month";
import { requireRole } from "@/lib/auth";
import { formatUSD } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Administración" };

function Card({
  href,
  title,
  value,
  detail,
  cta,
  attention = false,
}: {
  href: string;
  title: string;
  value?: string;
  detail: string;
  cta: string;
  attention?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group flex h-full flex-col gap-1 rounded-xl border px-4 py-4 outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50",
          attention
            ? "border-accent-warm-ink/30 bg-accent-warm-soft hover:border-accent-warm-ink/60"
            : "border-border bg-card hover:border-input hover:bg-paper-2",
        )}
      >
        <span className="text-sm font-semibold text-muted-foreground">{title}</span>
        {value ? <span className="tabular text-3xl font-extrabold tracking-tight">{value}</span> : null}
        <span className="text-sm text-muted-foreground">{detail}</span>
        <span className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-2 text-sm font-semibold text-brand">
          {cta}
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

export default async function AdminPage() {
  await requireRole("administrador");
  const supabase = await createClient();
  const month = currentMonth();
  const overview = await loadOverview(supabase, month);
  const label = monthLabel(month);

  return (
    <>
      <AdminHeading title="Administración">
        <p>Planes, comisiones y configuración de Reciclamigo. Todo se registra a mano: no hay pasarela de pago ni cobro automático.</p>
      </AdminHeading>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          href="/admin/planes"
          title="Comercios con plan activo"
          value={String(overview.conPlanActivo)}
          detail={`de ${overview.comercios} comercios`}
          cta="Ver planes"
        />
        <Card
          href="/admin/planes"
          title="Solicitudes de activación"
          value={String(overview.solicitudes)}
          detail={overview.solicitudes === 1 ? "comercio espera que le activen el plan" : "comercios esperan que les activen el plan"}
          cta={overview.solicitudes > 0 ? "Atenderlas" : "Ver planes"}
          attention={overview.solicitudes > 0}
        />
        <Card
          href="/admin/comisiones"
          title={`Comisiones pendientes de ${label}`}
          value={formatUSD(overview.comisionesPendientes)}
          detail={`de ${formatUSD(overview.comisionesDelMes)} generados por ${overview.comisionesCompradores} ${overview.comisionesCompradores === 1 ? "comprador" : "compradores"}`}
          cta="Ver comisiones"
        />
        <Card
          href="/admin/valorizadores"
          title="Valorizadores"
          value={String(overview.valorizadoresBase + overview.valorizadoresVolumen)}
          detail={`${overview.valorizadoresBase} de base · ${overview.valorizadoresVolumen} de volumen`}
          cta="Cambiar el tipo"
        />
        <Card href="/admin/puntos" title="ReciclaPuntos" detail="Saldos, historial y canjes manuales." cta="Registrar un canje" />
        <Card href="/admin/configuracion" title="Configuración" detail="Precios, límites, comisión, radios y horas." cta="Editar ajustes" />
      </ul>
    </>
  );
}
