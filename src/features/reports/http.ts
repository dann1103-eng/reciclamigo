import "server-only";

import { getSessionProfile, type SessionProfile } from "@/lib/auth";

/** Error de una descarga: siempre JSON con el mensaje en español. */
export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
}

/** Las descargas son solo del comercio con sesión: sin sesión de generador, 401. */
export async function generatorOr401(): Promise<{ profile: SessionProfile } | { response: Response }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "generador") {
    return { response: jsonError(401, "Entra con la cuenta de tu comercio para descargar este archivo.") };
  }
  return { profile };
}

/** Archivo para descargar, sin guardarlo en cachés compartidas (lleva datos del comercio). */
export function fileResponse(body: string | Uint8Array, contentType: string, filename: string, length?: number): Response {
  // new Uint8Array(...) copia a un ArrayBuffer común, que es lo que TypeScript acepta como cuerpo.
  return new Response(typeof body === "string" ? body : new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      ...(length === undefined ? {} : { "Content-Length": String(length) }),
    },
  });
}
