import { createClient } from "@/lib/supabase/server";

import { fetchCollectorPoint, fetchNearbyLots } from "../queries";
import { DEFAULT_RADIUS } from "../types";

import { CollectorMap } from "./collector-map";

/** Pantalla del reciclador: su ubicación y los lotes publicados a 3 km (el resto lo filtra el cliente). */
export async function CollectorMapPage({ collectorId }: { collectorId: string }) {
  const supabase = await createClient();
  const center = await fetchCollectorPoint(supabase, collectorId);
  if (!center) {
    return (
      <section className="rounded-xl border border-dashed border-input px-5 py-8">
        <h1 className="text-lg font-bold">Tu perfil no tiene ubicación</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sin una ubicación registrada no podemos mostrarte lotes cercanos.
        </p>
      </section>
    );
  }
  const initialLots = await fetchNearbyLots(supabase, { ...center, radiusM: DEFAULT_RADIUS, polymers: null });
  return <CollectorMap center={center} initialLots={initialLots} />;
}
