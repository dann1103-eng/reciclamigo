import type { NextRequest } from "next/server";

import { loadCircular } from "@/features/circular/load";
import { circularQrPng } from "@/features/circular/qr";
import { circularQrFilename } from "@/features/circular/url";
import { createClient } from "@/lib/supabase/server";

const notFound = () =>
  new Response("Esta insignia no está disponible", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

/**
 * PNG del QR que lleva a la página pública. Solo existe mientras la página existe: slug
 * inexistente, comercio sin plan activo o sin entregas confirmadas dan 404.
 * Con ?descargar=1 el navegador lo guarda como archivo.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadCircular(await createClient(), slug);
  if (!data) return notFound();

  const png = await circularQrPng(slug);
  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    // Depende del plan del comercio: no se guarda en cachés compartidas.
    "Cache-Control": "no-store",
  };
  if (request.nextUrl.searchParams.get("descargar") === "1") {
    // El slug ya pasó isCircularSlug (solo a-z, 0-9 y guiones): es seguro en el encabezado.
    headers["Content-Disposition"] = `attachment; filename="${circularQrFilename(slug)}"`;
  }
  return new Response(new Uint8Array(png), { headers });
}
