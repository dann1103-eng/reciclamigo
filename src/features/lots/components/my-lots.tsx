import Link from "next/link";
import { FileCheck2 } from "lucide-react";

import { PolymerChip } from "@/components/polymer/polymer-chip";
import { formatKg, formatUSD } from "@/lib/domain/format";
import type { LotStatus } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { fetchDisplayName, fetchMyLots } from "../queries";
import { myLotStatusLabel, type MyLot } from "../status";

import { MarkDeliveredButton } from "./mark-delivered-button";
import { generatorMessage } from "../whatsapp";

import { RatePickup } from "./rate-pickup";
import { WhatsAppButton } from "./whatsapp-button";

const STATUS_STYLE: Record<LotStatus, string> = {
  publicado: "bg-paper-2 text-muted-foreground",
  reservado: "bg-accent-warm-soft text-accent-warm-ink",
  entregado: "bg-brand-soft text-brand",
  completado: "bg-brand text-brand-foreground",
  cancelado: "bg-paper-2 text-muted-foreground",
};
const STATUS_NAME: Record<LotStatus, string> = {
  publicado: "Publicado",
  reservado: "Reservado",
  entregado: "Entregado",
  completado: "Completado",
  cancelado: "Cancelado",
};

function LotRow({ lot, now, generatorName }: { lot: MyLot; now: Date; generatorName: string }) {
  const p = lot.pickup;
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <PolymerChip code={lot.polymerCode} />
          <span className="tabular font-bold">{formatKg(p?.confirmedKg ?? lot.estimatedKg)}</span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[lot.status])}>
            {STATUS_NAME[lot.status]}
          </span>
        </div>
        {lot.status === "completado" && p ? (
          // El peso confirmado ya va arriba: aquí, quién lo recogió y cuánto se recibió.
          <p className="tabular text-sm">
            Recogido por {p.collectorName}
            {p.totalAmount ? <span className="text-muted-foreground"> · {formatUSD(p.totalAmount)} recibidos</span> : null}
          </p>
        ) : (
          <p className="text-sm">{myLotStatusLabel(lot, now)}</p>
        )}
        {lot.status === "completado" && p ? (
          <RatePickup pickupId={p.id} otherName={p.collectorName} myRating={p.myRating} />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {lot.status === "reservado" && p ? (
          <>
            <WhatsAppButton
              phone={p.collectorWhatsapp}
              text={generatorMessage({ generatorName, kg: lot.estimatedKg, polymerCode: lot.polymerCode })}
            />
            <MarkDeliveredButton pickupId={p.id} collectorName={p.collectorName} />
          </>
        ) : null}
        {lot.status === "completado" && p?.certificateCode ? (
          <Link
            href={`/certificados/${p.certificateCode}`}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold outline-none hover:bg-paper-2 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <FileCheck2 className="size-4" aria-hidden="true" />
            Ver certificado
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export async function MyLots({ generatorId }: { generatorId: string }) {
  const supabase = await createClient();
  const [lots, generatorName] = await Promise.all([fetchMyLots(supabase, generatorId), fetchDisplayName(supabase, generatorId)]);
  const now = new Date();
  const active = lots.filter((l) => l.status !== "completado");
  const done = lots.filter((l) => l.status === "completado");

  return (
    <section className="flex flex-col gap-6" aria-labelledby="mis-lotes">
      <h2 id="mis-lotes" className="text-xl font-bold">
        Mis lotes
      </h2>
      {lots.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-input px-5 py-6">
          <p className="font-semibold">Todavía no publicas lotes</p>
          <p className="text-sm text-muted-foreground">Publica tu primer lote y los recicladores cercanos lo verán en su mapa.</p>
          <Link href="/comercio/publicar" className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
            Publicar un lote
          </Link>
        </div>
      ) : null}
      {active.length ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Activos</h3>
          <ul className="flex flex-col gap-3">
            {active.map((lot) => (
              <LotRow key={lot.id} lot={lot} now={now} generatorName={generatorName} />
            ))}
          </ul>
        </div>
      ) : null}
      {done.length ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Completados en los últimos 30 días</h3>
          <ul className="flex flex-col gap-3">
            {done.map((lot) => (
              <LotRow key={lot.id} lot={lot} now={now} generatorName={generatorName} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
