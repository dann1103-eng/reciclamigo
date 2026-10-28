import { Logo } from "@/components/brand/logo";
import { ResinMark } from "@/components/polymer/polymer-chip";
import { formatPricePerLb, formatUSD } from "@/lib/domain/format";
import type { PolymerCode } from "@/lib/domain/polymers";
import { co2AvoidedKg, formatCo2, formatKg, formatLb, lbToKg } from "@/lib/domain/units";
import type { Modality } from "@/lib/domain/types";

import type { VoucherData } from "../load";
import { voucherUrl } from "../url";

import { PrintButton } from "./print-button";

const longDate = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  dateStyle: "long",
  timeStyle: "short",
});

const MODALITY_LABEL: Record<Modality, string> = { venta: "Venta", trueque: "Trueque", donacion: "Donación" };

function Party({ role, name, detail }: { role: string; name: string; detail: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{role}</span>
      <span className="text-lg font-bold">{name}</span>
      <span className="text-sm text-muted-foreground">{detail}</span>
    </div>
  );
}

/** Comprobante de una entrega confirmada (página pública e imprimible). */
export function Voucher({ voucher, qr, co2Factor }: { voucher: VoucherData; qr: string; co2Factor: number }) {
  const lb = Number(voucher.confirmed_lb);
  const url = voucherUrl(voucher.code);
  const modality = voucher.modality as Modality;

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-2xl border border-border bg-card px-6 py-8 shadow-raised sm:px-10 sm:py-10 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <Logo />
        <span className="rounded-md border-2 border-accent-warm-ink/40 px-3 py-1 text-xs font-bold tracking-[0.1em] text-accent-warm-ink uppercase">
          Versión piloto
        </span>
      </header>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Comprobante de entrega de plástico</h1>
        <p className="text-muted-foreground">Registro de una entrega confirmada por las dos partes en Reciclamigo.</p>
      </div>

      <div className="flex flex-wrap items-center gap-5 rounded-xl bg-brand-soft px-5 py-5">
        <ResinMark code={voucher.polymer_code as PolymerCode} className="size-14" />
        <div className="flex flex-col">
          <span className="tabular text-4xl font-extrabold tracking-tight text-brand">{formatLb(lb, 2)}</span>
          <span className="tabular text-sm text-muted-foreground">{formatKg(lbToKg(lb))}</span>
          <span className="font-semibold">
            {voucher.polymer_name} ({voucher.polymer_code}, resina {voucher.resin_number})
          </span>
        </div>
        <div className="ml-auto flex flex-col text-right">
          <span className="tabular text-2xl font-bold">{formatCo2(co2AvoidedKg(lb, co2Factor))}</span>
          <span className="text-sm text-muted-foreground">de CO₂ evitado</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Party role="Comercio" name={voucher.generator_name} detail={`${voucher.generator_org_type}, ${voucher.municipality}`} />
        <Party role="Reciclador" name={voucher.collector_name} detail={voucher.collector_org_type} />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Fecha de la entrega</dt>
        <dd className="font-semibold">{longDate.format(new Date(voucher.completed_at))}</dd>
        <dt className="text-muted-foreground">Modalidad</dt>
        <dd className="font-semibold">{MODALITY_LABEL[modality]}</dd>
        {modality === "venta" ? (
          <>
            <dt className="text-muted-foreground">Precio acordado</dt>
            <dd className="tabular font-semibold">{formatPricePerLb(Number(voucher.price_per_lb))}</dd>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="tabular font-semibold">{formatUSD(Number(voucher.total_amount))}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">Código</dt>
        <dd className="tabular font-semibold">{voucher.code}</dd>
      </dl>

      <footer className="flex flex-wrap items-end justify-between gap-6 border-t border-dashed border-border pt-6">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR generado en el servidor (data URL) */}
          <img src={qr} alt={`Código QR para verificar el comprobante ${voucher.code}`} className="size-28 rounded-md" />
          <p className="max-w-[46ch] text-sm text-muted-foreground">
            Escanea el código o entra a esta dirección para verificarlo:
            <span className="block font-medium break-all text-foreground">{url}</span>
          </p>
        </div>
        <PrintButton />
      </footer>

      <p className="text-xs text-muted-foreground">
        Este comprobante documenta una entrega registrada en Reciclamigo y puede respaldar la gestión de residuos del
        comercio. No es un permiso ni un documento emitido por una autoridad. Versión piloto.
      </p>
    </article>
  );
}
