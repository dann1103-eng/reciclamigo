import { checkCronAuth } from "@/lib/notify/cron-auth";
import { processDueNotifications } from "@/lib/notify/queue";

// Vercel Cron (vercel.json): cada 2 minutos saca la cola de avisos push. Corre en Node (usa web-push)
// y nunca se guarda en caché. Si algún día se activa Cache Components, estas dos líneas se quitan.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = checkCronAuth(request.headers.get("authorization"), process.env.CRON_SECRET);
  if (!auth.ok) return Response.json({ ok: false, error: auth.message }, { status: auth.status });

  try {
    const { sent, failed } = await processDueNotifications();
    return Response.json({ ok: true, sent, failed });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 });
  }
}
