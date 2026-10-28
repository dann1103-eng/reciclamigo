"use client";

import { ArrowLeft, LoaderCircle, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { PolymerChip } from "@/components/polymer/polymer-chip";
import { buttonVariants } from "@/components/ui/button";
import { BadgeList } from "@/features/reputation/components/badge-list";
import { getProfileImpact, profileStatsFromRow, reputationFromRow, type ProfileImpactRow } from "@/lib/data/profile-impact";
import { formatDistance, formatPricePerLb, formatUSD } from "@/lib/domain/format";
import { POLYMERS, type PolymerCode } from "@/lib/domain/polymers";
import { suggestedTotal } from "@/lib/domain/pricing";
import { reputationLine } from "@/lib/domain/reputation";
import type { Modality } from "@/lib/domain/types";
import { formatLb } from "@/lib/domain/units";
import { createClient } from "@/lib/supabase/client";

import { reserveLot } from "../actions";
import { formatPickupWindow } from "../format-window";
import { fetchWhatsapp } from "../queries";
import type { NearbyLot } from "../types";
import { lotCode, reservationMessage, whatsappLink } from "../whatsapp";

const MODALITY_LABEL: Record<Modality, string> = { venta: "Venta", trueque: "Trueque", donacion: "Donación" };

export function LotDetailPanel({
  lot,
  collectorName,
  onBack,
  onTaken,
}: {
  lot: NearbyLot;
  collectorName: string;
  onBack: () => void;
  onTaken: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [impact, setImpact] = useState<ProfileImpactRow | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const code = lot.polymer_code as PolymerCode;
  const lb = Number(lot.estimated_lb);
  const price = Number(lot.price_per_lb);
  const modality = lot.modality as Modality;
  const total = suggestedTotal(lb, price, modality);
  const windowLabel = formatPickupWindow(new Date(lot.pickup_from), new Date(lot.pickup_to));

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    getProfileImpact(supabase, lot.generator_id)
      .then((row) => alive && setImpact(row))
      .catch(() => alive && setImpact(null));
    fetchWhatsapp(supabase, lot.generator_id)
      .then((phone) => alive && setWhatsapp(phone))
      .catch(() => alive && setWhatsapp(null));
    return () => {
      alive = false;
    };
  }, [lot.generator_id]);

  /** Reserva el lote y abre WhatsApp con el mensaje prellenado (código del lote, plástico, libras y enlace). */
  function reserve() {
    startTransition(async () => {
      try {
        const result = await reserveLot(lot.id);
        if (!result.ok) {
          toast.error(result.error);
          onTaken();
          return;
        }
        const link = whatsapp
          ? whatsappLink(whatsapp, reservationMessage({ collectorName, lotId: lot.id, polymerCode: code, estimatedLb: lb, windowLabel }))
          : null;
        toast.success("Lote reservado", {
          description: link ? "Coordina el retiro por WhatsApp." : `Pasa por el lote de ${lot.generator_name} en la ventana acordada.`,
        });
        if (link) {
          const opened = window.open(link, "_blank", "noopener,noreferrer");
          // Si el navegador bloquea la ventana, el botón de WhatsApp sigue en "Mis retiros".
          if (!opened) toast("Abre WhatsApp desde Mis retiros para coordinar con el comercio.");
        }
        router.push("/reciclador/retiros");
      } catch {
        toast.error("No se pudo reservar. Revisa la conexión e inténtalo de nuevo.");
      }
    });
  }

  return (
    <article className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Todos los lotes
      </button>

      {lot.photo_urls.length > 0 ? (
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- fotos de Storage o ilustraciones locales */}
          <img
            src={lot.photo_urls[0]}
            alt={`Foto del lote de ${POLYMERS[code].name}`}
            className="aspect-[4/3] w-full rounded-xl border border-border object-cover"
          />
          {lot.photo_urls.length > 1 ? (
            <div className="flex gap-2">
              {lot.photo_urls.slice(1).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt={`Foto ${i + 2} del lote`} className="size-16 rounded-lg border border-border object-cover" />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <PolymerChip code={code} />
        <span className="tabular text-sm font-semibold text-brand">a {formatDistance(lot.distance_m)}</span>
      </div>

      <div>
        <p className="tabular text-3xl font-extrabold tracking-tight">{formatLb(lb)}</p>
        <p className="text-sm text-muted-foreground">
          {MODALITY_LABEL[modality]} · lote {lotCode(lot.id)}
          {modality === "venta"
            ? price > 0
              ? ` · ${formatPricePerLb(price)} de referencia, ${formatUSD(total)} sugerido`
              : " · sin precio de referencia: lo acuerdan entre ustedes"
            : ""}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Retiro</dt>
        <dd className="font-semibold">{windowLabel}</dd>
        <dt className="text-muted-foreground">Comercio</dt>
        <dd>
          <Link href={`/perfil/${lot.generator_id}`} className="font-semibold underline-offset-4 hover:underline">
            {lot.generator_name}
          </Link>
          <span className="block text-muted-foreground">{reputationLine(reputationFromRow(impact))}</span>
        </dd>
        {lot.notes ? (
          <>
            <dt className="text-muted-foreground">Notas</dt>
            <dd>{lot.notes}</dd>
          </>
        ) : null}
      </dl>

      {impact ? <BadgeList stats={profileStatsFromRow(impact)} /> : null}

      <div className="flex flex-col gap-2">
        <button type="button" onClick={reserve} disabled={pending} className={buttonVariants({ size: "xl", className: "w-full" })}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
          {pending ? "Reservando…" : whatsapp ? "Reservar y abrir WhatsApp" : "Reservar retiro"}
        </button>
        <p className="text-xs text-muted-foreground">
          Reservar aparta el lote para ti. Coordinan por WhatsApp; la app no guarda los mensajes.
        </p>
      </div>
    </article>
  );
}
