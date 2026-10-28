import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { EnablePushPrompt } from "@/features/alerts/components/enable-push-prompt";
import { CircularCard } from "@/features/circular/components/circular-card";
import { GeneratorImpact } from "@/features/impact/components/generator-impact";
import { MyLots } from "@/features/lots/components/my-lots";
import { PlanBanner } from "@/features/plans/components/plan-banner";
import { getPlanStatus } from "@/features/plans/load";
import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings/load";

export const metadata: Metadata = { title: "Comercio" };

export default async function ComercioPage() {
  const profile = await requireRole("generador");
  const [plan, settings] = await Promise.all([getPlanStatus(), getSettings()]);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {profile.orgType} · {profile.municipality}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">{profile.displayName}</h1>
        </div>
        <Link href="/comercio/publicar" className={buttonVariants({ size: "xl" })}>
          <Plus aria-hidden="true" />
          Publicar lote
        </Link>
      </div>
      <PlanBanner status={plan} priceUsd={settings.planPriceUsd} />
      <EnablePushPrompt role="generador" />
      <GeneratorImpact generatorId={profile.id} />
      <CircularCard generatorId={profile.id} />
      <MyLots generatorId={profile.id} />
    </>
  );
}
