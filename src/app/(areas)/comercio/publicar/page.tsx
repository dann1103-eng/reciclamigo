import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PublishLotForm } from "@/features/lots/components/publish-lot-form";
import { requireRole } from "@/lib/auth";
import type { PolymerCode } from "@/lib/domain/polymers";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Publicar lote" };

export default async function PublicarPage() {
  const profile = await requireRole("generador");
  const supabase = await createClient();
  const { data: polymers } = await supabase.from("polymers").select("code, price_per_kg");
  const prices = Object.fromEntries((polymers ?? []).map((p) => [p.code, Number(p.price_per_kg)])) as Record<
    PolymerCode,
    number
  >;

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
      <PublishLotForm userId={profile.id} prices={prices} />
    </>
  );
}
