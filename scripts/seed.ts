// Siembra la base con los datos del demo. Uso: npm run seed  (lee .env.local)
import { seedDemo } from "../src/lib/demo/seed";
import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const password = process.env.DEMO_PASSWORD;
  if (!password) {
    console.error("Falta DEMO_PASSWORD en .env.local");
    process.exitCode = 2;
    return;
  }
  const summary = await seedDemo(createAdminClient(), { password });
  console.log(summary);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
