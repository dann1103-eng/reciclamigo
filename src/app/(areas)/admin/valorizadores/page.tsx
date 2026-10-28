import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";

import { AdminHeading } from "@/features/admin/components/admin-heading";
import { TipoSwitch } from "@/features/admin/components/tipo-switch";
import { loadValorizadores } from "@/features/admin/queries";
import { formatPct } from "@/features/commissions/format";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings/load";

export const metadata: Metadata = { title: "Valorizadores" };

export default async function AdminValorizadoresPage() {
  await requireRole("administrador");
  const supabase = await createClient();
  const [valorizadores, settings] = await Promise.all([loadValorizadores(supabase), getSettings()]);

  return (
    <>
      <AdminHeading title="Valorizadores">
        <p>
          Solo los <strong className="text-foreground">compradores de volumen</strong> (centros de acopio, recicladoras, industria)
          pagan comisión: {formatPct(settings.commissionPct)} sobre sus compras confirmadas. Los{" "}
          <strong className="text-foreground">recicladores de base</strong> pagan 0 %. El cambio de tipo vale para las próximas
          entregas que se confirmen.
        </p>
      </AdminHeading>

      {valorizadores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-input px-5 py-6">
          <p className="font-semibold">Todavía no hay valorizadores registrados</p>
          <p className="text-sm text-muted-foreground">Cuando un reciclador cree su cuenta, aparecerá aquí.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {valorizadores.map((v) => (
            <li key={v.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="text-lg font-bold">{v.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {v.orgType} · {v.municipality}
                </p>
                {v.verified ? (
                  <p className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-brand">
                    <BadgeCheck className="size-4" aria-hidden="true" />
                    Verificado
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin verificar</p>
                )}
              </div>
              <TipoSwitch profileId={v.id} name={v.name} tipo={v.tipo} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
