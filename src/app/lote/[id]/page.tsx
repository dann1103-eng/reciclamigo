import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { PolymerChip } from "@/components/polymer/polymer-chip";
import { buttonVariants } from "@/components/ui/button";
import { formatPickupWindow } from "@/features/lots/format-window";
import { fetchLotSummary } from "@/features/lots/queries";
import { lotCode } from "@/features/lots/whatsapp";
import { idSchema } from "@/features/lots/schemas";
import { getSessionProfile, ROLE_HOME } from "@/lib/auth";
import { formatPricePerLb } from "@/lib/domain/format";
import type { LotStatus, Modality } from "@/lib/domain/types";
import { formatLb } from "@/lib/domain/units";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Lote" };

const STATUS_TEXT: Record<LotStatus, string> = {
  publicado: "Publicado: esperando reciclador",
  reservado: "Reservado",
  entregado: "Entrega registrada, esperando confirmación",
  completado: "Entrega confirmada",
  cancelado: "Cancelado",
};
const MODALITY_LABEL: Record<Modality, string> = { venta: "Venta", trueque: "Trueque", donacion: "Donación" };

/** El enlace que va en el mensaje de WhatsApp: muestra el lote y lleva a la pantalla de cada quien. */
export default async function LotePage({ params }: Props) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const profile = await getSessionProfile();
  if (!profile) redirect("/entrar");

  const lot = await fetchLotSummary(await createClient(), id);
  if (!lot) notFound();

  const mine = profile.role === "generador" && lot.generatorId === profile.id;
  const target = profile.role === "valorizador" && lot.status === "publicado" ? `/reciclador?lote=${lot.id}` : ROLE_HOME[profile.role];
  const targetLabel = profile.role === "valorizador" && lot.status === "publicado" ? "Ver en el mapa" : "Ir a mi pantalla";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-5 py-8 sm:py-12">
      <Link href="/inicio" className="self-start rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Logo />
      </Link>
      <div className="flex flex-col gap-2">
        <p className="tabular text-sm font-semibold text-muted-foreground">Lote {lotCode(lot.id)}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{formatLb(lot.estimatedLb)} de {lot.polymerCode}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <PolymerChip code={lot.polymerCode} />
          <span className="text-sm font-semibold">{STATUS_TEXT[lot.status]}</span>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Comercio</dt>
        <dd className="font-semibold">{mine ? "Tu comercio" : lot.generatorName}</dd>
        <dt className="text-muted-foreground">Retiro</dt>
        <dd className="font-semibold">{formatPickupWindow(new Date(lot.pickupFrom), new Date(lot.pickupTo))}</dd>
        <dt className="text-muted-foreground">Modalidad</dt>
        <dd className="font-semibold">
          {MODALITY_LABEL[lot.modality]}
          {lot.modality === "venta" && lot.pricePerLb > 0 ? ` · ${formatPricePerLb(lot.pricePerLb)} de referencia` : ""}
        </dd>
      </dl>
      <Link href={target} className={buttonVariants({ size: "xl" })}>
        {targetLabel}
      </Link>
    </main>
  );
}
