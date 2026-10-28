import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AlertPrefsForm } from "@/features/alerts/components/alert-prefs-form";
import { EnablePush } from "@/features/alerts/components/enable-push";
import { requireRole } from "@/lib/auth";
import { POLYMER_CODES, type PolymerCode } from "@/lib/domain/polymers";
import { getSettings } from "@/lib/settings/load";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Avisos" };

// Mismo radio que usa la base cuando todavía no hay preferencias guardadas (coalesce(radius_km, 3)).
const DEFAULT_RADIUS_KM = 3;

export default async function AvisosPage() {
  const profile = await requireRole("valorizador");
  const settings = await getSettings();
  const radii = settings.alertRadiiKm;

  // RLS: solo se leen las preferencias propias. Sin fila, la base avisa de todo dentro de 3 km.
  const supabase = await createClient();
  const { data: prefs } = await supabase
    .from("alert_prefs")
    .select("enabled, radius_km, polymers")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const fallback = radii.includes(DEFAULT_RADIUS_KM) ? DEFAULT_RADIUS_KM : (radii[0] ?? DEFAULT_RADIUS_KM);
  const radiusKm = prefs && radii.includes(prefs.radius_km) ? prefs.radius_km : fallback;
  const polymers = prefs?.polymers
    ? POLYMER_CODES.filter((code: PolymerCode) => prefs.polymers?.includes(code))
    : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href="/reciclador"
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Lotes cerca
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">Avisos</h1>
        <p className="max-w-prose text-muted-foreground">
          Te avisamos al teléfono cuando alguien publica plástico cerca de ti. Tú eliges hasta dónde y de qué tipo.
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-6">
        <div className="flex flex-col gap-3">
          <EnablePush />
          <p className="text-sm text-muted-foreground">
            Si tu teléfono no recibe avisos, igual verás los lotes en el{" "}
            <Link href="/reciclador" className="font-semibold text-brand underline-offset-4 hover:underline">
              mapa
            </Link>
            .
          </p>
        </div>

        <AlertPrefsForm
          radiiKm={radii}
          extraPlanRadiusKm={settings.extraPlanRadiusKm}
          initial={{ enabled: prefs?.enabled ?? true, radiusKm, polymers: polymers && polymers.length > 0 ? polymers : null }}
        />

        <section aria-labelledby="orden-avisos" className="flex flex-col gap-2">
          <h2 id="orden-avisos" className="text-lg font-bold tracking-tight">
            Quién recibe primero
          </h2>
          <ul className="flex max-w-prose list-disc flex-col gap-1.5 pl-5 text-muted-foreground">
            <li>Los lotes de comercios con plan salen primero y llegan desde más lejos.</li>
            <li>Con entregas confirmadas y buenas calificaciones, tus avisos llegan antes.</li>
            <li>Si un comercio te eligió de confianza para sus retiros programados, el aviso es primero para ti, sin importar el radio.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
