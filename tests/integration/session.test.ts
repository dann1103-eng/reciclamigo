import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { DEMO_ACCOUNTS } from "@/lib/demo/accounts";
import { demoSignIn, endSession } from "@/lib/demo/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

// Las cuentas demo se comparten entre quien presenta, los previews y la URL pública:
// salir o cambiar de rol en un navegador no puede sacar a los demás.

const newClient = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

const admin = createAdminClient();
const email = `prueba-sesion-${Date.now()}@test.reciclamigo.app`;
const password = randomBytes(18).toString("base64url");
let userId: string;

beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(error.message);
  userId = data.user.id;
});

afterAll(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId);
});

describe("sesiones compartidas", () => {
  test("cerrar sesión en un navegador no saca a los demás de la misma cuenta", async () => {
    const presenter = newClient();
    const other = newClient();
    await presenter.auth.signInWithPassword({ email, password });
    await other.auth.signInWithPassword({ email, password });

    await endSession(other);

    const { data, error } = await presenter.auth.getUser();
    expect(error).toBeNull();
    expect(data.user?.email).toBe(email);
    expect((await other.auth.getSession()).data.session).toBeNull();
  });
});

describe("demoSignIn", () => {
  test("devuelve un error en español en vez de lanzar", async () => {
    await expect(demoSignIn(newClient(), "comercio", "contraseña-incorrecta")).resolves.toEqual({
      error: expect.stringMatching(/No se pudo entrar con la cuenta demo/),
    });
  });

  test("rechaza un rol desconocido", async () => {
    await expect(demoSignIn(newClient(), "admin", "x")).resolves.toEqual({ error: "Rol de demo desconocido." });
  });

  test("entra con la contraseña correcta", async () => {
    const client = newClient();
    await expect(demoSignIn(client, "reciclador", process.env.DEMO_PASSWORD!)).resolves.toEqual({ error: null });
    const { data } = await client.auth.getUser();
    expect(data.user?.email).toBe(DEMO_ACCOUNTS.reciclador.email);
    await endSession(client);
  });
});
