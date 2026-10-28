import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CircularPublic } from "@/features/circular/components/circular-public";
import { circularQrDataUrl } from "@/features/circular/qr";
import { getCircular } from "@/features/circular/server";
import { deliveriesLabel } from "@/features/circular/state";
import { circularUrl } from "@/features/circular/url";
import { formatLb } from "@/lib/domain/units";

type Props = { params: Promise<{ slug: string }> };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCircular(slug);
  if (!data) return { title: "Insignia no encontrada" };

  const title = `${data.businessName} · Comercio Circular`;
  const description = `${data.businessName} entrega su plástico a recicladores con Reciclamigo: ${formatLb(data.totalLb)} recicladas en ${data.deliveries} ${deliveriesLabel(data.deliveries)}.`;
  const url = circularUrl(slug);
  return {
    metadataBase: URL.canParse(SITE_URL) ? new URL(SITE_URL) : undefined,
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "Reciclamigo", locale: "es_SV", title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Insignia pública: la abre cualquiera con el enlace o el QR, sin iniciar sesión. */
export default async function CircularPage({ params }: Props) {
  const { slug } = await params;
  // Una caída de la base lanza y la muestra error.tsx ("Reintentar"), nunca "no encontrado".
  const data = await getCircular(slug);
  if (!data) notFound();

  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:py-12 print:p-0">
      {/* A4 con márgenes de imprenta; la página se imprime sin nada más de la app. */}
      <style>{"@page { size: A4; margin: 16mm; } @media print { body { background: #fff; } }"}</style>
      <CircularPublic data={data} qr={await circularQrDataUrl(slug)} url={circularUrl(slug)} />
    </main>
  );
}
