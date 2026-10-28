import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { formatCo2, formatLb } from "@/lib/domain/units";
import { cn } from "@/lib/utils";

import type { CircularData } from "../load";
import { deliveriesLabel, formatLongDate } from "../state";

import { CircularSeal } from "./circular-seal";
import { PrintButton } from "./print-button";

const integer = new Intl.NumberFormat("es-SV");
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function Fact({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="tabular text-xl font-bold">{value}</dd>
    </div>
  );
}

/**
 * Página pública de un Comercio Circular: lo ve cualquiera, sin sesión, desde el QR.
 * Solo cifras del negocio: nunca datos personales ni de los recicladores.
 */
export function CircularPublic({ data, qr, url }: { data: CircularData; qr: string; url: string }) {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-8 rounded-2xl border border-border bg-card px-5 py-7 shadow-raised sm:px-10 sm:py-10 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Logo />
        </Link>
        <span className="rounded-md border-2 border-accent-warm-ink/40 px-3 py-1 text-xs font-bold tracking-[0.1em] text-accent-warm-ink uppercase">
          Versión piloto
        </span>
      </header>

      <div className="flex items-center gap-4 sm:gap-5">
        <CircularSeal size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-bold tracking-[0.08em] text-brand uppercase">Comercio Circular</p>
          <h1 className="text-3xl font-extrabold tracking-tight break-words sm:text-4xl">{data.businessName}</h1>
          <p className="text-muted-foreground">{data.orgType}</p>
        </div>
      </div>

      <p className="text-lg">
        Este negocio entrega su plástico a recicladores a través de Reciclamigo. Cada entrega queda confirmada por las
        dos partes.
      </p>

      <div className="flex flex-col gap-1 rounded-xl bg-brand-soft px-5 py-5">
        <span className="text-sm font-semibold text-muted-foreground">Plástico reciclado en total</span>
        <span className="tabular text-3xl font-extrabold tracking-tight text-brand sm:text-5xl">{formatLb(data.totalLb)}</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        <Fact label="CO₂ evitado" value={formatCo2(data.co2Kg)} />
        <Fact label={capitalize(deliveriesLabel(data.deliveries))} value={integer.format(data.deliveries)} />
        <Fact label="Última entrega" value={formatLongDate(data.lastDeliveryAt)} className="col-span-2 sm:col-span-1" />
      </dl>

      <footer className="flex flex-wrap items-end justify-between gap-6 border-t border-dashed border-border pt-6">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR generado en el servidor (data URL) */}
          <img src={qr} alt={`Código QR de la página de ${data.businessName}`} className="size-28 rounded-md" />
          <p className="max-w-[40ch] text-sm text-muted-foreground">
            Escanea el código o entra a esta dirección:
            <span className="block font-medium break-all text-foreground">{url}</span>
          </p>
        </div>
        <PrintButton />
      </footer>

      <p className="text-xs text-muted-foreground">
        Estas cifras salen de entregas que el comercio y el reciclador confirmaron en Reciclamigo. El CO₂ evitado es una
        estimación a partir de las libras recicladas. Esta página no es un permiso ni un documento emitido por una
        autoridad. Versión piloto.
      </p>
    </article>
  );
}
