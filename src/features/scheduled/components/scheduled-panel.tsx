"use client";

import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";

import type { CollectorOption } from "../collectors";
import { emptyScheduledForm, scheduledToForm } from "../form";
import type { ScheduledView } from "../format";

import { ScheduledForm } from "./scheduled-form";
import { ScheduledItem } from "./scheduled-item";

/** Lista de retiros programados con su formulario (nuevo o de edición) en la misma pantalla. */
export function ScheduledPanel({
  pickups,
  collectors,
}: {
  pickups: ScheduledView[];
  collectors: { known: CollectorOption[]; others: CollectorOption[] };
}) {
  // null = solo la lista; "nuevo" = formulario vacío; un id = editando ese retiro.
  const [editing, setEditing] = useState<"nuevo" | string | null>(null);
  const [planNotice, setPlanNotice] = useState<string | null>(null);

  // Si solo hay un reciclador entre quienes elegir, el formulario nuevo ya lo trae elegido.
  const all = [...collectors.known, ...collectors.others];
  const onlyOne = all.length === 1 ? all[0].id : "";
  const close = () => setEditing(null);

  return (
    <div className="flex flex-col gap-6">
      {planNotice ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl bg-accent-warm-soft px-4 py-3 text-accent-warm-ink">
          <p className="text-sm font-semibold">{planNotice}</p>
          <Link href="/comercio/plan" className={buttonVariants({ size: "lg", className: "h-11 px-4" })}>
            Ver el Plan Trazabilidad
          </Link>
        </div>
      ) : null}

      {editing === "nuevo" ? (
        <ScheduledForm initial={emptyScheduledForm(onlyOne)} collectors={collectors} onClose={close} onPlanRequired={setPlanNotice} />
      ) : (
        <div>
          <button type="button" onClick={() => setEditing("nuevo")} className={buttonVariants({ size: "xl" })}>
            <CalendarPlus aria-hidden="true" />
            Programar un retiro
          </button>
        </div>
      )}

      {pickups.length === 0 ? (
        editing === null ? (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-input px-5 py-6">
            <p className="font-semibold">Todavía no tienes retiros programados</p>
            <p className="text-sm text-muted-foreground">
              Elige un día y una hora fijos, por ejemplo cada lunes de 9:00 a 11:00, y un reciclador de confianza. Cada semana tu lote
              sale solo.
            </p>
          </div>
        ) : null
      ) : (
        <section className="flex flex-col gap-3" aria-labelledby="mis-programados">
          <h2 id="mis-programados" className="text-xl font-bold">
            Tus retiros programados
          </h2>
          <ul className="flex flex-col gap-3">
            {pickups.map((pickup) =>
              editing === pickup.id ? (
                <li key={pickup.id} className="list-none">
                  <ScheduledForm
                    initial={scheduledToForm(pickup)}
                    id={pickup.id}
                    collectors={collectors}
                    onClose={close}
                    onPlanRequired={setPlanNotice}
                  />
                </li>
              ) : (
                <ScheduledItem key={pickup.id} pickup={pickup} onEdit={() => setEditing(pickup.id)} onPlanRequired={setPlanNotice} />
              ),
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
