import type { Metadata } from "next";

import { CollectorMapPage } from "@/features/lots/components/collector-map-page";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Lotes cerca" };

export default async function RecicladorPage() {
  const profile = await requireRole("valorizador");
  return <CollectorMapPage collectorId={profile.id} />;
}
