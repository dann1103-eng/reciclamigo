import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PublishLotForm } from "@/features/lots/components/publish-lot-form";
import { getPlanStatus } from "@/features/plans/load";
import { requireRole } from "@/lib/auth";
import { freeLotsLeft } from "@/lib/domain/plans";
import { getSettings } from "@/lib/settings/load";

export const metadata: Metadata = { title: "Publicar lote" };

export default async function PublicarPage() {
  const profile = await requireRole("generador");
  const [settings, plan] = await Promise.all([getSettings(), getPlanStatus()]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href="/comercio"
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">Publicar un lote</h1>
        <p className="text-muted-foreground">Los recicladores cercanos lo verán en su mapa en cuanto lo publiques.</p>
      </div>
      <PublishLotForm
        userId={profile.id}
        prices={settings.refPriceUsdPerLb}
        freeLotsLeft={freeLotsLeft(plan)}
        freeLimit={plan.freeLimit}
        planPriceUsd={settings.planPriceUsd}
      />
    </>
  );
}
