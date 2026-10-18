import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { MyPickups } from "@/features/lots/components/my-pickups";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Mis retiros" };

export default async function RetirosPage({ searchParams }: { searchParams: Promise<{ completado?: string }> }) {
  const profile = await requireRole("valorizador");
  const { completado } = await searchParams;
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
        <h1 className="text-3xl font-extrabold tracking-tight">Mis retiros</h1>
      </div>
      <MyPickups collectorId={profile.id} highlightId={completado} />
    </>
  );
}
