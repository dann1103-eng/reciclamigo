import Link from "next/link";

import { getSessionProfile } from "@/lib/auth";
import { getSettings } from "@/lib/settings/load";
import { createClient } from "@/lib/supabase/server";

import { groupMyPickups, type MyPickup } from "../pickups";
import { fetchMyPickups } from "../queries";

import { PickupRow } from "./pickup-row";

function Group({
  title,
  pickups,
  highlightId,
  collectorName,
  co2Factor,
}: {
  title: string;
  pickups: MyPickup[];
  highlightId?: string;
  collectorName: string;
  co2Factor: number;
}) {
  if (pickups.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <ul className="flex flex-col gap-3">
        {pickups.map((p) => (
          <PickupRow key={p.id} pickup={p} highlighted={p.id === highlightId} collectorName={collectorName} co2Factor={co2Factor} />
        ))}
      </ul>
    </section>
  );
}

export async function MyPickups({ collectorId, highlightId }: { collectorId: string; highlightId?: string }) {
  const supabase = await createClient();
  const [pickups, profile, settings] = await Promise.all([fetchMyPickups(supabase, collectorId), getSessionProfile(), getSettings()]);
  const collectorName = profile?.displayName ?? "Reciclamigo";
  const { toCollect, toConfirm, completed } = groupMyPickups(pickups);
  const shared = { highlightId, collectorName, co2Factor: settings.co2Factor };

  if (!toCollect.length && !toConfirm.length && !completed.length) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-input px-5 py-6">
        <p className="font-semibold">Todavía no tienes retiros</p>
        <p className="text-sm text-muted-foreground">Reserva un lote en el mapa y aparecerá aquí.</p>
        <Link href="/reciclador" className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
          Ver lotes cerca
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Group title="Listos para confirmar" pickups={toConfirm} {...shared} />
      <Group title="Por recoger" pickups={toCollect} {...shared} />
      <Group title="Confirmados en los últimos 30 días" pickups={completed} {...shared} />
    </div>
  );
}
