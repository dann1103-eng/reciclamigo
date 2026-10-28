import type { Metadata } from "next";

import { PointsPanel } from "@/features/points/components/points-panel";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "ReciclaPuntos" };

export default async function ComercioPuntosPage() {
  const profile = await requireRole("generador");
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">ReciclaPuntos</h1>
        <p className="text-muted-foreground">Puntos por cada entrega de plástico que confirmas en Reciclamigo.</p>
      </div>
      <PointsPanel profileId={profile.id} />
    </>
  );
}
