import { timingSafeEqual } from "node:crypto";

import { seedDemo } from "@/lib/demo/seed";
import { createAdminClient } from "@/lib/supabase/admin";

function tokenMatches(given: string | null, expected: string | undefined) {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** POST /demo/reset?token=…  Restaura los datos del demo. Solo en modo demo y con el token. */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true" || !tokenMatches(token, process.env.DEMO_RESET_TOKEN)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const password = process.env.DEMO_PASSWORD;
  if (!password) {
    return Response.json({ error: "Falta DEMO_PASSWORD en el servidor" }, { status: 500 });
  }
  const summary = await seedDemo(createAdminClient(), { password });
  return Response.json(summary);
}
