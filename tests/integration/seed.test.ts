import { createClient } from "@supabase/supabase-js";
import { expect, test } from "vitest";

import { DEMO_ACCOUNTS } from "@/lib/demo/accounts";
import { seedDemo } from "@/lib/demo/seed";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

// Reiniciar el demo justo antes de presentar no puede sacar a quien ya entró.
test("reiniciar el demo no cierra las sesiones abiertas de las cuentas demo", async () => {
  const presenter = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await presenter.auth.signInWithPassword({
    email: DEMO_ACCOUNTS.comercio.email,
    password: process.env.DEMO_PASSWORD!,
  });
  expect(error).toBeNull();

  await seedDemo(createAdminClient(), { password: process.env.DEMO_PASSWORD! });

  const { data, error: after } = await presenter.auth.getUser();
  expect(after).toBeNull();
  expect(data.user?.email).toBe(DEMO_ACCOUNTS.comercio.email);
  await presenter.auth.signOut({ scope: "local" });
}, 60_000);
