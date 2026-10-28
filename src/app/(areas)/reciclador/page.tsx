import type { Metadata } from "next";

import { EnablePushPrompt } from "@/features/alerts/components/enable-push-prompt";
import { CollectorMapPage } from "@/features/lots/components/collector-map-page";
import { RecyclerWelcome } from "@/features/lots/components/recycler-welcome";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Lotes cerca" };

export default async function RecicladorPage({ searchParams }: { searchParams: Promise<{ lote?: string }> }) {
  const profile = await requireRole("valorizador");
  const { lote } = await searchParams; // un aviso o un enlace puede abrir el mapa con un lote ya elegido
  return (
    <>
      <RecyclerWelcome />
      <EnablePushPrompt role="valorizador" />
      <CollectorMapPage collectorId={profile.id} selectedLotId={lote} />
    </>
  );
}
