import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { GeneratorImpact } from "@/features/impact/components/generator-impact";
import { MyLots } from "@/features/lots/components/my-lots";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Comercio" };

export default async function ComercioPage() {
  const profile = await requireRole("generador");
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
      <GeneratorImpact generatorId={profile.id} />
      <MyLots generatorId={profile.id} />
    </>
  );
}
