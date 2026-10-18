import { Logo } from "@/components/brand/logo";
import { ResinMark } from "@/components/polymer/polymer-chip";
import { formatKg } from "@/lib/domain/format";
import { co2eAvoidedKg } from "@/lib/domain/impact";
import type { PolymerCode } from "@/lib/domain/polymers";
import type { Database } from "@/types/database";

import { certificateUrl } from "../url";

import { PrintButton } from "./print-button";

export type CertificateData = Database["public"]["Functions"]["get_certificate"]["Returns"][number];

const longDate = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  dateStyle: "long",
  timeStyle: "short",
});

function Party({ role, name, detail }: { role: string; name: string; detail: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{role}</span>
      <span className="text-lg font-bold">{name}</span>
      <span className="text-sm text-muted-foreground">{detail}</span>
    </div>
  );
}

/** Certificado de manejo de residuos de un retiro completado (página pública e imprimible). */
export function Certificate({ cert, qr }: { cert: CertificateData; qr: string }) {
  const kg = Number(cert.confirmed_kg);
  const url = certificateUrl(cert.code);

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-2xl border border-border bg-card px-6 py-8 shadow-raised sm:px-10 sm:py-10 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <Logo />
        <span className="rounded-md border-2 border-accent-warm-ink/40 px-3 py-1 text-xs font-bold tracking-[0.1em] text-accent-warm-ink uppercase">
          Versión piloto
        </span>
      </header>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Certificado de manejo de residuos plásticos</h1>
        <p className="text-muted-foreground">
          Registro de trazabilidad para la Ley ANDRES (Decreto 186/2024), emitido por Reciclamigo.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-5 rounded-xl bg-brand-soft px-5 py-5">
        <ResinMark code={cert.polymer_code as PolymerCode} className="size-14" />
        <div className="flex flex-col">
          <span className="tabular text-4xl font-extrabold tracking-tight text-brand">{formatKg(kg)}</span>
          <span className="font-semibold">
            {cert.polymer_name} ({cert.polymer_code}, resina {cert.resin_number})
          </span>
        </div>
        <div className="ml-auto flex flex-col text-right">
          <span className="tabular text-2xl font-bold">{formatKg(co2eAvoidedKg(kg))}</span>
          <span className="text-sm text-muted-foreground">de CO₂e evitados</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Party role="Generador" name={cert.generator_name} detail={`${cert.generator_org_type}, ${cert.municipality}`} />
        <Party role="Gestor" name={cert.collector_name} detail={cert.collector_org_type} />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Fecha del retiro</dt>
        <dd className="font-semibold">{longDate.format(new Date(cert.completed_at))}</dd>
        <dt className="text-muted-foreground">Código</dt>
        <dd className="tabular font-semibold">{cert.code}</dd>
      </dl>

      <footer className="flex flex-wrap items-end justify-between gap-6 border-t border-dashed border-border pt-6">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR generado en el servidor (data URL) */}
          <img src={qr} alt={`Código QR para verificar el certificado ${cert.code}`} className="size-28 rounded-md" />
          <p className="max-w-[46ch] text-sm text-muted-foreground">
            Escanea el código o entra a esta dirección para verificarlo:
            <span className="block font-medium break-all text-foreground">{url}</span>
          </p>
        </div>
        <PrintButton />
      </footer>

      <p className="text-xs text-muted-foreground">
        Documento demostrativo del piloto Reciclamigo. No sustituye la documentación oficial exigida por la autoridad.
      </p>
    </article>
  );
}
