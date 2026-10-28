import { checkCronAuth } from "@/lib/notify/cron-auth";
import { processDueNotifications } from "@/lib/notify/queue";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron (vercel.json): cada 15 minutos libera las reservas vencidas, crea los lotes de los
// retiros programados y saca la cola de avisos (esos dos pasos dejan avisos nuevos). Corre en Node
// y nunca se guarda en caché. Si algún día se activa Cache Components, estas dos líneas se quitan.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : "Error desconocido");

export async function GET(request: Request) {
  const auth = checkCronAuth(request.headers.get("authorization"), process.env.CRON_SECRET);
  if (!auth.ok) return Response.json({ ok: false, error: auth.message }, { status: auth.status });

  // Cada paso es independiente: si uno falla, los otros igual corren, y el error se reporta al final.
  const errors: string[] = [];
  let released = 0;
  let created = 0;
  let sent = 0;
  let failed = 0;

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (error) {
    return Response.json({ ok: false, error: messageOf(error) }, { status: 500 });
  }

  const expired = await supabase.rpc("release_expired_reservations");
  if (expired.error) errors.push(`release_expired_reservations: ${expired.error.message}`);
  else released = expired.data;

  const scheduled = await supabase.rpc("create_scheduled_lots");
  if (scheduled.error) errors.push(`create_scheduled_lots: ${scheduled.error.message}`);
  else created = scheduled.data;

  try {
    ({ sent, failed } = await processDueNotifications());
  } catch (error) {
    errors.push(`avisos: ${messageOf(error)}`);
  }

  return Response.json({ ok: errors.length === 0, released, created, sent, failed, errors }, { status: errors.length === 0 ? 200 : 500 });
}
