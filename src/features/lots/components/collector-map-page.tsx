import { getSessionProfile } from "@/lib/auth";
import { getSettings } from "@/lib/settings/load";
import { createClient } from "@/lib/supabase/server";

import { groupMyPickups } from "../pickups";
import { fetchCollectorPoint, fetchMyPickups, fetchNearbyLots } from "../queries";
import { defaultRadius, radiiToMeters } from "../radius";

import { CollectorMap } from "./collector-map";

/** Pantalla del reciclador: su ubicación y los lotes del radio inicial (el resto lo filtra el cliente). */
export async function CollectorMapPage({ collectorId, selectedLotId }: { collectorId: string; selectedLotId?: string }) {
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
  const settings = await getSettings();
  const radii = radiiToMeters(settings.alertRadiiKm);
  const defaultRadiusM = defaultRadius(radii);
  const [initialLots, profile, pickups] = await Promise.all([
    fetchNearbyLots(supabase, { ...center, radiusM: defaultRadiusM, polymers: null }),
    getSessionProfile(),
    fetchMyPickups(supabase, collectorId),
  ]);
  const collectorName = profile?.displayName ?? "Reciclamigo";
  const { toCollect, toConfirm } = groupMyPickups(pickups);
  return (
    <CollectorMap
      center={center}
      initialLots={initialLots}
      collectorName={collectorName}
      pendingPickups={toCollect.length + toConfirm.length}
      radii={radii}
      defaultRadiusM={defaultRadiusM}
      initialSelectedId={selectedLotId ?? null}
    />
  );
}
