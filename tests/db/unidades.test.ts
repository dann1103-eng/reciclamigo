import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { describe, expect, test } from "vitest";

// Qué pasa con datos que YA existen en kilos cuando se aplica la migración de libras, y que la
// reversa devuelve la base a como estaba. Cada prueba arma su propia base desde cero.

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");
const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
const UNITS = "20261028000200_unidades_libras.sql";
const DOWN = join(ROOT, "supabase/rollbacks/20261028_modelo_negocio.down.sql");

const GEN = "11111111-1111-4111-8111-111111111111";
const COL = "22222222-2222-4222-8222-222222222222";

type Role = "authenticated" | "anon";

async function newDb(upTo: (file: string) => boolean) {
  const db = new PGlite({ extensions: { postgis } });
  await db.exec(readFileSync(join(ROOT, "supabase/tests/supabase-stubs.sql"), "utf8"));
  for (const file of files.filter(upTo)) await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  return db;
}

async function as<T = Record<string, unknown>>(db: PGlite, role: Role, uid: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role ${role};`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}

const tomorrow = (h: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(h + 6, 0, 0, 0);
  return d.toISOString();
};

const point = "extensions.st_setsrid(extensions.st_makepoint(-89.5597, 13.9946), 4326)::extensions.geography";

/** Datos como los dejaba la app en kilos (esquema anterior). `withTipo`: el esquema ya tiene tipo_valorizador. */
async function seedKilos(db: PGlite) {
  await db.exec(`
    insert into auth.users (id, email) values ('${GEN}', 'g@test'), ('${COL}', 'c@test');
    insert into public.profiles (id, role, display_name, org_type, municipality, zone, verified) values
      ('${GEN}', 'generador', 'Comedor La Ceiba', 'Restaurante', 'Santa Ana', 'Centro', false),
      ('${COL}', 'valorizador', 'Don José', 'Reciclador de base', 'Santa Ana', 'El Palmar', true);
    insert into public.profile_private (id, whatsapp, address, location) values
      ('${GEN}', '7000-0001', 'Calle 1', ${point}), ('${COL}', '50370000002', 'Calle 2', ${point});
  `);
  const [{ publish_lot: lot }] = await as<{ publish_lot: string }>(
    db, "authenticated", GEN,
    "select public.publish_lot('PET', 40, $1, $2, 'venta') as publish_lot", [tomorrow(9), tomorrow(11)],
  );
  const [{ reserve_lot: pickup }] = await as<{ reserve_lot: string }>(db, "authenticated", COL, "select public.reserve_lot($1) as reserve_lot", [lot]);
  await as(db, "authenticated", GEN, "select public.mark_delivered($1)", [pickup]);
  await as(db, "authenticated", COL, "select public.complete_pickup($1, 35.5, 'efectivo')", [pickup]);
  await as(db, "authenticated", GEN, "select public.publish_lot('HDPE', 10, $1, $2, 'venta')", [tomorrow(9), tomorrow(11)]);
  return { lot, pickup };
}

describe("conversión de datos existentes (kg -> lb)", () => {
  test("convierte pesos y precios, deja el dinero igual y recrea las vistas", async () => {
    const db = await newDb((f) => f < UNITS);
    const { pickup } = await seedKilos(db);
    await db.exec(readFileSync(join(MIGRATIONS_DIR, UNITS), "utf8"));

    const lots = (await db.query<{ polymer_code: string; estimated_lb: string; price_per_lb: string }>(
      "select polymer_code, estimated_lb, price_per_lb from public.lots order by polymer_code",
    )).rows;
    // 40 kg × 2.20462 = 88.18 lb; $0.20/kg ÷ 2.20462 = $0.09/lb. 10 kg = 22.05 lb; $0.18/kg = $0.08/lb.
    expect(lots).toEqual([
      { polymer_code: "HDPE", estimated_lb: "22.05", price_per_lb: "0.080" },
      { polymer_code: "PET", estimated_lb: "88.18", price_per_lb: "0.090" },
    ]);

    const p = (await db.query<{ confirmed_lb: string; total_amount: string }>(
      "select confirmed_lb, total_amount from public.pickups where id = $1", [pickup],
    )).rows[0];
    expect(p.confirmed_lb).toBe("78.26"); // 35.5 kg
    expect(p.total_amount).toBe("7.10"); // $ ya acordados: no cambia

    const impact = (await db.query<{ completed_lb: string }>(
      "select completed_lb from public.profile_impact where profile_id = $1", [COL],
    )).rows[0];
    expect(impact.completed_lb).toBe("78.26");
    expect((await db.query("select 1 from public.impact_monthly")).rows).toHaveLength(1);
  });

  test("una libra conserva el cálculo: 100 lb = 45.36 kg", async () => {
    const db = await newDb(() => true);
    const [r] = (await db.query<{ kg: string }>("select round(100 * 0.45359237, 2)::text as kg")).rows;
    expect(r.kg).toBe("45.36");
  });
});

describe("reversa", () => {
  test("aplica todo, revierte y el ciclo en kilos vuelve a funcionar", async () => {
    const db = await newDb(() => true);
    await db.exec(`
      insert into auth.users (id, email) values ('${GEN}', 'g@test'), ('${COL}', 'c@test');
      insert into public.profiles (id, role, display_name, org_type, municipality, zone, verified, tipo_valorizador) values
        ('${GEN}', 'generador', 'Comedor La Ceiba', 'Restaurante', 'Santa Ana', 'Centro', false, null),
        ('${COL}', 'valorizador', 'Don José', 'Reciclador de base', 'Santa Ana', 'El Palmar', true, 'base');
      insert into public.profile_private (id, whatsapp, address, location) values
        ('${GEN}', '7000-0001', 'Calle 1', ${point}), ('${COL}', '50370000002', 'Calle 2', ${point});
    `);
    // Una entrega completa en el modelo nuevo (88.18 lb ≈ 40 kg).
    const [{ publish_lot: lot }] = await as<{ publish_lot: string }>(
      db, "authenticated", GEN,
      "select public.publish_lot('PET', 88.18, $1, $2, 'venta') as publish_lot", [tomorrow(9), tomorrow(11)],
    );
    const [{ reserve_lot: pickup }] = await as<{ reserve_lot: string }>(db, "authenticated", COL, "select public.reserve_lot($1) as reserve_lot", [lot]);
    await as(db, "authenticated", GEN, "select public.propose_delivery($1, 88.18)", [pickup]);
    await as(db, "authenticated", COL, "select public.complete_pickup($1, true)", [pickup]);

    await db.exec(readFileSync(DOWN, "utf8"));

    // Pesos de vuelta en kilos (88.18 lb -> 40.00 kg) y precio por kg.
    const lotRow = (await db.query<{ estimated_kg: string; price_per_kg: string }>(
      "select estimated_kg, price_per_kg from public.lots where id = $1", [lot],
    )).rows[0];
    expect(lotRow).toEqual({ estimated_kg: "40.00", price_per_kg: "0.20" });
    const pickupRow = (await db.query<{ confirmed_kg: string; certificate_code: string }>(
      "select confirmed_kg, certificate_code from public.pickups where id = $1", [pickup],
    )).rows[0];
    expect(pickupRow.confirmed_kg).toBe("40.00");
    expect(pickupRow.certificate_code).toMatch(/^RCA-/);

    // Lo nuevo desaparece y las migraciones nuevas quedan sin registrar.
    for (const gone of ["app_settings", "generator_plans", "commissions", "points_ledger", "notification_queue", "scheduled_pickups"]) {
      const exists = (await db.query<{ t: string | null }>("select to_regclass($1)::text as t", [`public.${gone}`])).rows[0].t;
      expect(exists, gone).toBeNull();
    }
    expect((await db.query("select name from public.app_migrations where name like '20261028%'")).rows).toEqual([]);

    // El ciclo viejo funciona otra vez: publicar 40 kg, entregar, completar con 35.5 kg.
    const [{ publish_lot: lot2 }] = await as<{ publish_lot: string }>(
      db, "authenticated", GEN,
      "select public.publish_lot('PET', 40, $1, $2, 'venta') as publish_lot", [tomorrow(9), tomorrow(11)],
    );
    const [{ reserve_lot: pickup2 }] = await as<{ reserve_lot: string }>(db, "authenticated", COL, "select public.reserve_lot($1) as reserve_lot", [lot2]);
    await as(db, "authenticated", GEN, "select public.mark_delivered($1)", [pickup2]);
    const [{ complete_pickup: code }] = await as<{ complete_pickup: string }>(
      db, "authenticated", COL, "select public.complete_pickup($1, 35.5, 'efectivo') as complete_pickup", [pickup2],
    );
    expect(code).toMatch(/^RCA-\d{4}-[0-9A-F]{6}$/);
    const cert = await as(db, "anon", "", "select * from public.get_certificate($1)", [code]);
    expect(cert).toHaveLength(1);
    const impact = (await db.query<{ completed_kg: string }>("select completed_kg from public.profile_impact where profile_id = $1", [COL])).rows[0];
    expect(Number(impact.completed_kg)).toBe(75.5);
  });

  test("después de revertir, las migraciones nuevas se pueden volver a aplicar", async () => {
    const db = await newDb(() => true);
    await db.exec(readFileSync(DOWN, "utf8"));
    for (const file of files.filter((f) => f.startsWith("20261028"))) {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    }
    const names = (await db.query<{ name: string }>("select name from public.app_migrations order by name")).rows;
    expect(names.map((n) => n.name)).toEqual(files.map((f) => f.replace(/\.sql$/, "")));
  });
});
