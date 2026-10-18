// Compara las migraciones del repo con las registradas en public.app_migrations.
// Uso: npm run db:status   (lee .env.local; necesita SUPABASE_SERVICE_ROLE_KEY)
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exitCode = 2;
    return;
  }

  const files = readdirSync(join(process.cwd(), "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => f.replace(/\.sql$/, ""));

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("app_migrations").select("name, applied_at");

  // Si la tabla no existe todavía, ninguna migración está aplicada.
  if (error && !/app_migrations/.test(error.message)) {
    console.error(`No se pudo leer app_migrations: ${error.message}`);
    process.exitCode = 2;
    return;
  }
  const applied = new Map((error ? [] : (data ?? [])).map((r) => [r.name as string, r.applied_at as string]));

  let pending = 0;
  for (const name of files) {
    const at = applied.get(name);
    if (at) {
      console.log(`  aplicada   ${name}  (${new Date(at).toLocaleString("es-SV")})`);
    } else {
      pending++;
      console.log(`  PENDIENTE  ${name}  → ejecuta supabase/migrations/${name}.sql en el SQL Editor`);
    }
  }
  console.log(`\n${files.length - pending} aplicadas, ${pending} pendientes.`);
  // exitCode en vez de process.exit: en Windows, salir con sockets abiertos dispara un assert de libuv.
  process.exitCode = pending ? 1 : 0;
}

main();
