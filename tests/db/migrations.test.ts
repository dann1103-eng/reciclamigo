import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { beforeAll, describe, expect, test } from "vitest";

// Corre las migraciones reales sobre un Postgres local que imita a Supabase y prueba las
// reglas del negocio: libras, plan y límite mensual, confirmación bilateral, comisión,
// liberación de reservas, avisos, puntos, retiros programados, insignia e historial.

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");
const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();

const GEN = "11111111-1111-4111-8111-111111111111"; // comercio con plan, Santa Ana centro
const COL = "22222222-2222-4222-8222-222222222222"; // reciclador de base, ~1.5 km
const MUN = "33333333-3333-4333-8333-333333333333"; // alcaldía
const GEN2 = "44444444-4444-4444-8444-444444444444"; // comercio en San Salvador (~50 km)
const COLV = "55555555-5555-4555-8555-555555555555"; // comprador de volumen, ~0.5 km de GEN
const ADM = "66666666-6666-4666-8666-666666666666"; // administrador
const GEN3 = "77777777-7777-4777-8777-777777777777"; // comercio gratis (pruebas del límite)
const GEN4 = "99999999-9999-4999-8999-999999999999"; // comercio gratis (puntos)

let db: PGlite;

type Role = "authenticated" | "anon" | "service_role";

async function as<T = Record<string, unknown>>(role: Role, uid: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); set role ${role};`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}

const asUser = <T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []) =>
  as<T>("authenticated", uid, sql, params);

async function fails(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as Error & { hint?: string };
  }
  throw new Error("Se esperaba un error y no hubo ninguno");
}

const tomorrow = (h: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(h + 6, 0, 0, 0); // hora de El Salvador
  return d.toISOString();
};

async function publish(uid: string, polymer = "PET", lb = 100, modality = "venta") {
  const [row] = await asUser<{ publish_lot: string }>(
    uid,
    "select public.publish_lot($1, $2, $3, $4, $5::public.lot_modality) as publish_lot",
    [polymer, lb, tomorrow(9), tomorrow(11), modality],
  );
  return row.publish_lot;
}

async function reserve(collector: string, lotId: string) {
  const [r] = await asUser<{ reserve_lot: string }>(collector, "select public.reserve_lot($1)", [lotId]);
  return r.reserve_lot;
}

async function propose(generator: string, pickupId: string, lb: number, price: number | null = null) {
  await asUser(generator, "select public.propose_delivery($1, $2, $3)", [pickupId, lb, price]);
}

async function complete(collector: string, pickupId: string, accept: boolean, lb: number | null = null, price: number | null = null) {
  const [r] = await asUser<{ complete_pickup: string }>(
    collector,
    "select public.complete_pickup($1, $2, $3, $4, 'efectivo') as complete_pickup",
    [pickupId, accept, lb, price],
  );
  return r.complete_pickup;
}

/** Publica, reserva, propone y acepta: una entrega confirmada completa. */
async function fullDelivery(generator: string, collector: string, lb = 100, modality = "venta") {
  const lotId = await publish(generator, "PET", lb, modality);
  const pickupId = await reserve(collector, lotId);
  await propose(generator, pickupId, lb);
  const code = await complete(collector, pickupId, true);
  return { lotId, pickupId, code };
}

const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];

beforeAll(async () => {
  db = new PGlite({ extensions: { postgis } });
  await db.exec(readFileSync(join(ROOT, "supabase/tests/supabase-stubs.sql"), "utf8"));
  for (const file of migrationFiles) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  const point = (lat: number, lng: number) => `extensions.st_setsrid(extensions.st_makepoint(${lng}, ${lat}), 4326)::extensions.geography`;
  await db.exec(`
    insert into auth.users (id, email) values
      ('${GEN}', 'comercio@test'), ('${COL}', 'reciclador@test'), ('${MUN}', 'alcaldia@test'),
      ('${GEN2}', 'comercio2@test'), ('${COLV}', 'acopio@test'), ('${ADM}', 'admin@test'),
      ('${GEN3}', 'comercio3@test'), ('${GEN4}', 'comercio4@test');
    insert into public.profiles (id, role, display_name, org_type, municipality, zone, verified, tipo_valorizador) values
      ('${GEN}', 'generador', 'Comedor La Ceiba', 'Restaurante', 'Santa Ana', 'Centro', false, null),
      ('${COL}', 'valorizador', 'Don José', 'Reciclador de base', 'Santa Ana', 'El Palmar', true, 'base'),
      ('${MUN}', 'municipalidad', 'Alcaldía de Santa Ana', 'Alcaldía', 'Santa Ana', 'Centro', true, null),
      ('${GEN2}', 'generador', 'Hotel Prueba', 'Hotel', 'San Salvador', 'Escalón', false, null),
      ('${COLV}', 'valorizador', 'Centro de Acopio El Progreso', 'Centro de acopio', 'Santa Ana', 'El Progreso', true, 'volumen'),
      ('${ADM}', 'administrador', 'Equipo Reciclamigo', 'Administración', 'San Salvador', 'Centro', true, null),
      ('${GEN3}', 'generador', 'Pupusería Doña Tere', 'Restaurante', 'Santa Ana', 'Santa Lucía', false, null),
      ('${GEN4}', 'generador', 'Panadería San Miguelito', 'Comercio', 'Santa Ana', 'San Miguelito', false, null);
    insert into public.profile_private (id, whatsapp, address, location) values
      ('${GEN}', '50370000001', 'Calle 1', ${point(13.9946, -89.5597)}),
      ('${COL}', '50370000002', 'Calle 2', ${point(14.0066, -89.553)}),
      ('${GEN2}', '50370000004', 'Calle 4', ${point(13.6929, -89.2182)}),
      ('${COLV}', '50370000005', 'Calle 5', ${point(13.99, -89.56)}),
      ('${GEN3}', '50370000007', 'Calle 7', ${point(13.996, -89.558)}),
      ('${GEN4}', '50370000009', 'Calle 9', ${point(13.9955, -89.5585)});
    -- GEN tiene el Plan Trazabilidad activado (para que el límite gratis no estorbe en las demás pruebas).
    insert into public.generator_plans (profile_id, plan, started_at, expires_at)
    values ('${GEN}', 'trazabilidad', now(), now() + interval '30 days');
  `);
});

describe("migraciones", () => {
  test("se aplican todas en orden y quedan registradas", async () => {
    const rows = (await db.query<{ name: string }>("select name from public.app_migrations order by name")).rows;
    expect(rows.map((r) => r.name)).toEqual(migrationFiles.map((f) => f.replace(/\.sql$/, "")));
  });

  test("un valorizador necesita tipo; un comercio no puede tenerlo", async () => {
    await expect(
      db.exec(`insert into auth.users (id, email) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'x@test');
               insert into public.profiles (id, role, display_name, org_type, municipality, zone)
               values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'valorizador', 'Sin tipo', 'Reciclador', 'Santa Ana', 'X')`),
    ).rejects.toThrow(/profiles_tipo_valorizador_check/);
  });
});

describe("configuración", () => {
  test("trae los valores iniciales del documento", async () => {
    const rows = await asUser<{ key: string; value: unknown }>(GEN, "select key, value from public.app_settings");
    const by = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect(by.plan_trazabilidad_precio_usd).toBe(14.99);
    expect(by.lotes_gratis_por_mes).toBe(8);
    expect(by.historial_gratis_dias).toBe(30);
    expect(by.comision_volumen_pct).toBe(3);
    expect(by.precio_ref_pet_usd_lb).toBe(0.09);
    expect(by.precio_ref_hdpe_usd_lb).toBe(0.08);
    expect(by.precio_ref_ldpe_usd_lb).toBeNull();
    expect(by.precio_ref_pp_usd_lb).toBeNull();
    expect(by.precio_ref_ps_usd_lb).toBeNull();
    expect(by.radios_aviso_km).toEqual([1, 3, 5]);
    expect(by.radio_extra_plan_km).toBe(2);
    expect(by.horas_liberar_reserva).toBe(24);
    expect(by.factor_co2_mixto).toBe(2);
  });

  test("la configuración es pública para leer y solo el administrador la cambia", async () => {
    expect((await as("anon", null, "select key from public.app_settings")).length).toBeGreaterThan(10);
    await expect(asUser(GEN, "select public.set_setting('lotes_gratis_por_mes', '10'::jsonb)")).rejects.toThrow(
      "Solo el administrador",
    );
    await expect(asUser(COL, "select public.set_setting('lotes_gratis_por_mes', '10'::jsonb)")).rejects.toThrow(
      "Solo el administrador",
    );
    await expect(as("anon", null, "insert into public.app_settings (key, value, description) values ('x', '1', 'x')")).rejects.toThrow(
      /permission denied|row-level security/,
    );
  });

  test("la comisión solo se mueve entre 2 % y 4 %", async () => {
    await expect(asUser(ADM, "select public.set_setting('comision_volumen_pct', '5'::jsonb)")).rejects.toThrow(/máximo es 4/);
    await expect(asUser(ADM, "select public.set_setting('comision_volumen_pct', '1.5'::jsonb)")).rejects.toThrow(/mínimo es 2/);
    await asUser(ADM, "select public.set_setting('comision_volumen_pct', '3.5'::jsonb)");
    expect((await one<{ value: number }>("select value from public.app_settings where key = 'comision_volumen_pct'")).value).toBe(3.5);
    await asUser(ADM, "select public.set_setting('comision_volumen_pct', '3'::jsonb)");
  });

  test("valida tipos: precios vacíos o numéricos, radios como lista", async () => {
    await asUser(ADM, "select public.set_setting('precio_ref_ldpe_usd_lb', '0.05'::jsonb)");
    await asUser(ADM, "select public.set_setting('precio_ref_ldpe_usd_lb', 'null'::jsonb)");
    await expect(asUser(ADM, `select public.set_setting('precio_ref_pp_usd_lb', '"caro"'::jsonb)`)).rejects.toThrow(/número o quedar vacío/);
    await expect(asUser(ADM, "select public.set_setting('radios_aviso_km', '[1, -3]'::jsonb)")).rejects.toThrow(/mayor que 0/);
    await expect(asUser(ADM, "select public.set_setting('radios_aviso_km', '3'::jsonb)")).rejects.toThrow(/entre 1 y 8 radios/);
    await expect(asUser(ADM, "select public.set_setting('no_existe', '1'::jsonb)")).rejects.toThrow("Ajuste desconocido");
  });
});

describe("publish_lot en libras", () => {
  test("fija el precio de referencia desde la configuración y la ubicación desde el perfil", async () => {
    const id = await publish(GEN);
    const lot = await one<{ price_per_lb: string; estimated_lb: string; same_place: boolean; status: string }>(
      `select l.price_per_lb, l.estimated_lb, l.status, extensions.st_equals(l.location::extensions.geometry, pp.location::extensions.geometry) as same_place
       from public.lots l join public.profile_private pp on pp.id = l.generator_id where l.id = $1`,
      [id],
    );
    expect(Number(lot.price_per_lb)).toBe(0.09);
    expect(Number(lot.estimated_lb)).toBe(100);
    expect(lot.same_place).toBe(true);
    expect(lot.status).toBe("publicado");
    const hdpe = await publish(GEN, "HDPE", 50);
    expect(Number((await one<{ price_per_lb: string }>("select price_per_lb from public.lots where id = $1", [hdpe])).price_per_lb)).toBe(0.08);
  });

  test("LDPE, PP y PS no traen precio de referencia; en donación el precio es cero", async () => {
    const ldpe = await publish(GEN, "LDPE", 30);
    expect(Number((await one<{ price_per_lb: string }>("select price_per_lb from public.lots where id = $1", [ldpe])).price_per_lb)).toBe(0);
    const donation = await publish(GEN, "HDPE", 10, "donacion");
    expect(Number((await one<{ price_per_lb: string }>("select price_per_lb from public.lots where id = $1", [donation])).price_per_lb)).toBe(0);
  });

  test("el precio sale de la configuración, no del código", async () => {
    await asUser(ADM, "select public.set_setting('precio_ref_pet_usd_lb', '0.12'::jsonb)");
    const id = await publish(GEN);
    expect(Number((await one<{ price_per_lb: string }>("select price_per_lb from public.lots where id = $1", [id])).price_per_lb)).toBe(0.12);
    await asUser(ADM, "select public.set_setting('precio_ref_pet_usd_lb', '0.09'::jsonb)");
  });

  test("rechaza libras inválidas y ventana invertida", async () => {
    await expect(publish(GEN, "PET", 0)).rejects.toThrow(/libras estimadas/);
    await expect(publish(GEN, "PET", 22001)).rejects.toThrow(/libras estimadas/);
    await expect(publish(GEN, "PET", 0.004)).rejects.toThrow(/libras estimadas/);
    await expect(
      asUser(GEN, "select public.publish_lot('PET', 5, $1, $2, 'venta')", [tomorrow(11), tomorrow(9)]),
    ).rejects.toThrow(/ventana de retiro/);
  });

  test("solo un comercio publica", async () => {
    await expect(publish(COL)).rejects.toThrow("Solo los comercios pueden publicar lotes");
    await expect(publish(ADM)).rejects.toThrow("Solo los comercios pueden publicar lotes");
  });
});

describe("nearby_lots", () => {
  test("respeta el radio y el filtro de polímero, y devuelve libras", async () => {
    const id = await publish(GEN, "PET", 25);
    const farId = await publish(GEN2, "PET", 25);
    const near = (radius: number, polymers: string[] | null = null) =>
      asUser<{ id: string; distance_m: number; estimated_lb: string; price_per_lb: string }>(
        COL,
        "select id, distance_m, estimated_lb, price_per_lb from public.nearby_lots(14.0066, -89.553, $1, $2)",
        [radius, polymers],
      );

    const at3 = await near(3000);
    const found = at3.find((r) => r.id === id);
    expect(found?.distance_m).toBeGreaterThan(1000);
    expect(found?.distance_m).toBeLessThan(2000);
    expect(Number(found?.estimated_lb)).toBe(25);
    expect(Number(found?.price_per_lb)).toBe(0.09);
    expect(at3.some((r) => r.id === farId)).toBe(false);
    expect(at3.every((r) => r.distance_m <= 3000)).toBe(true);
    expect((await near(1000)).some((r) => r.id === id)).toBe(false);
    expect((await near(3000, ["HDPE"])).some((r) => r.id === id)).toBe(false);
  });
});

describe("avisos por cercanía", () => {
  const queued = (lotId: string) =>
    db
      .query<{ profile_id: string; delay_min: number }>(
        `select profile_id, round(extract(epoch from (send_after - created_at)) / 60)::int as delay_min
         from public.notification_queue where event = 'lote_cercano' and payload ->> 'lot_id' = $1 order by profile_id`,
        [lotId],
      )
      .then((r) => r.rows);

  test("un lote de comercio con plan avisa sin retraso de comercio y con radio mayor", async () => {
    const lot = await publish(GEN, "PET", 80);
    const rows = await queued(lot);
    // Nadie tiene reputación todavía: +5 min a todos. GEN tiene plan: sin los 10 min del gratis.
    expect(rows).toEqual([
      { profile_id: COL, delay_min: 5 },
      { profile_id: COLV, delay_min: 5 },
    ]);
  });

  test("un lote de comercio gratis espera 10 min más", async () => {
    const lot = await publish(GEN3, "PET", 60);
    expect(await queued(lot)).toEqual([
      { profile_id: COL, delay_min: 15 },
      { profile_id: COLV, delay_min: 15 },
    ]);
  });

  test("no avisa a recicladores lejos del lote", async () => {
    const lot = await publish(GEN2, "PET", 60);
    expect(await queued(lot)).toEqual([]);
  });

  test("elegir un radio de 1 km deja fuera lotes de comercios gratis a más de 1 km, pero el plan amplía 2 km", async () => {
    await asUser(COL, "select public.set_alert_prefs(1, null, true)");
    const free = await publish(GEN3, "PET", 40); // ~1.3 km de COL
    expect((await queued(free)).map((r) => r.profile_id)).toEqual([COLV]);
    const plan = await publish(GEN, "PET", 40); // ~1.5 km de COL, +2 km del plan
    expect((await queued(plan)).map((r) => r.profile_id)).toContain(COL);
    await asUser(COL, "select public.set_alert_prefs(3, null, true)");
  });

  test("filtra por tipo de plástico y por avisos desactivados", async () => {
    await asUser(COL, "select public.set_alert_prefs(3, array['HDPE'], true)");
    const pet = await publish(GEN, "PET", 40);
    expect((await queued(pet)).map((r) => r.profile_id)).not.toContain(COL);
    const hdpe = await publish(GEN, "HDPE", 40);
    expect((await queued(hdpe)).map((r) => r.profile_id)).toContain(COL);
    await asUser(COL, "select public.set_alert_prefs(3, null, false)");
    const off = await publish(GEN, "HDPE", 40);
    expect((await queued(off)).map((r) => r.profile_id)).not.toContain(COL);
    await asUser(COL, "select public.set_alert_prefs(3, null, true)");
  });

  test("solo acepta los radios configurados y tipos de plástico válidos", async () => {
    await expect(asUser(COL, "select public.set_alert_prefs(4, null, true)")).rejects.toThrow("Elige uno de los radios");
    await expect(asUser(COL, "select public.set_alert_prefs(3, array['XX'], true)")).rejects.toThrow(/tipo de plástico válido/);
    await expect(asUser(GEN, "select public.set_alert_prefs(3, null, true)")).rejects.toThrow("Solo los recicladores");
  });

  test("el cron toma solo lo vencido y descarta avisos de lotes que ya no están publicados", async () => {
    const lot = await publish(GEN, "PET", 70);
    await reserve(COLV, lot);
    await db.exec("update public.notification_queue set send_after = now() - interval '1 minute' where sent_at is null");
    const claimed = await as<{ id: string; event: string; payload: { lot_id: string } }>(
      "service_role",
      null,
      "select * from public.claim_due_notifications(500)",
    );
    expect(claimed.some((n) => n.payload.lot_id === lot && n.event === 'lote_cercano')).toBe(false);
    const discarded = await one<{ error: string }>(
      "select error from public.notification_queue where event = 'lote_cercano' and payload ->> 'lot_id' = $1 limit 1",
      [lot],
    );
    expect(discarded.error).toBe("El lote ya no está disponible");
    await as("service_role", null, "select public.finish_notification($1)", [claimed[0].id]);
    expect((await one<{ sent_at: string | null }>("select sent_at from public.notification_queue where id = $1", [claimed[0].id])).sent_at).not.toBeNull();
    await expect(asUser(COL, "select * from public.claim_due_notifications(5)")).rejects.toThrow(/permission denied/);
    expect(await asUser(COL, "select * from public.notification_queue")).toEqual([]);
  });

  test("guarda y quita dispositivos; un teléfono compartido pasa a la última persona", async () => {
    await asUser(COL, "select public.save_push_subscription('https://push.example/1', 'p', 'a', 'Chrome')");
    await asUser(COLV, "select public.save_push_subscription('https://push.example/1', 'p2', 'a2', 'Chrome')");
    expect((await one<{ profile_id: string }>("select profile_id from public.push_subscriptions where endpoint = 'https://push.example/1'")).profile_id).toBe(COLV);
    expect(await asUser(COL, "select * from public.push_subscriptions")).toEqual([]);
    await asUser(COL, "select public.remove_push_subscription('https://push.example/1')");
    expect((await db.query("select 1 from public.push_subscriptions")).rows).toHaveLength(1);
    await asUser(COLV, "select public.remove_push_subscription('https://push.example/1')");
    await expect(asUser(MUN, "select public.save_push_subscription('https://x', 'p', 'a')")).rejects.toThrow("Solo comercios y recicladores");
  });
});

describe("plan y límite de lotes gratis", () => {
  test("sale en hora de El Salvador: el 31 a las 22:00 todavía es el mes en curso", async () => {
    const start = await one<{ s: string }>("select public.sv_month_start('2026-11-01 03:00:00+00'::timestamptz)::text as s");
    // 1 nov 03:00 UTC = 31 oct 21:00 en El Salvador -> el mes en curso es octubre.
    expect(new Date(start.s).toISOString()).toBe("2026-10-01T06:00:00.000Z");
    const next = await one<{ s: string }>("select public.sv_month_start('2026-11-01 06:30:00+00'::timestamptz)::text as s");
    expect(new Date(next.s).toISOString()).toBe("2026-11-01T06:00:00.000Z");
  });

  test("un comercio gratis publica 8 lotes en el mes; el noveno muestra el mensaje del plan", async () => {
    const used = (await one<{ n: number }>("select count(*)::int as n from public.lots where generator_id = $1", [GEN3])).n;
    for (let i = used; i < 8; i++) await publish(GEN3, "PET", 10 + i);
    const status = await asUser<{ published_this_month: number; free_limit: number; plan: string; active: boolean }>(
      GEN3,
      "select * from public.plan_status()",
    );
    expect(status[0]).toMatchObject({ published_this_month: 8, free_limit: 8, plan: "gratis", active: false });

    const error = await fails(publish(GEN3, "PET", 99));
    expect(error.message).toMatch(/Ya publicaste tus 8 lotes gratis de este mes\. Activa el Plan Trazabilidad/);
    expect(error.hint).toBe("limite_gratis");
  });

  test("repetir un lote también cuenta para el límite", async () => {
    const [lot] = (await db.query<{ id: string }>("select id from public.lots where generator_id = $1 limit 1", [GEN3])).rows;
    const error = await fails(asUser(GEN3, "select public.repeat_lot($1)", [lot.id]));
    expect(error.hint).toBe("limite_gratis");
  });

  test("los lotes de un mes anterior no cuentan", async () => {
    await db.exec(`update public.lots set created_at = public.sv_month_start() - interval '2 days' where generator_id = '${GEN3}' and id in (
      select id from public.lots where generator_id = '${GEN3}' limit 3)`);
    await expect(publish(GEN3, "PET", 5)).resolves.toMatch(/^[0-9a-f-]{36}$/);
  });

  test("con el límite alcanzado, las entregas y los lotes ya publicados siguen funcionando", async () => {
    // GEN3 está al tope otra vez: publica hasta 8 y luego reserva, entrega y confirma uno.
    const n = (await one<{ n: number }>("select count(*)::int as n from public.lots where generator_id = $1 and created_at >= public.sv_month_start()", [GEN3])).n;
    for (let i = n; i < 8; i++) await publish(GEN3, "PET", 11 + i);
    await expect(publish(GEN3, "PET", 5)).rejects.toThrow(/lotes gratis/);
    const lot = (await one<{ id: string }>("select id from public.lots where generator_id = $1 and status = 'publicado' limit 1", [GEN3])).id;
    const pickup = await reserve(COL, lot);
    await propose(GEN3, pickup, 15);
    await expect(complete(COL, pickup, true)).resolves.toMatch(/^RCA-/);
  });

  test("el administrador activa el plan y el límite desaparece; al vencer, vuelve", async () => {
    await expect(asUser(GEN3, "select public.set_generator_plan($1, 'trazabilidad')", [GEN3])).rejects.toThrow("Solo el administrador");
    await asUser(ADM, "select public.set_generator_plan($1, 'trazabilidad')", [GEN3]);
    expect((await asUser<{ active: boolean }>(GEN3, "select active from public.plan_status()"))[0].active).toBe(true);
    await expect(publish(GEN3, "PET", 5)).resolves.toMatch(/^[0-9a-f-]{36}$/);
    const days = await one<{ d: number }>(
      "select round(extract(epoch from (expires_at - started_at)) / 86400)::int as d from public.generator_plans where profile_id = $1",
      [GEN3],
    );
    expect(days.d).toBe(30);

    await db.exec(`update public.generator_plans set expires_at = now() - interval '1 minute' where profile_id = '${GEN3}'`);
    await expect(publish(GEN3, "PET", 5)).rejects.toThrow(/lotes gratis/);

    await asUser(ADM, "select public.set_generator_plan($1, 'trazabilidad', now() + interval '10 days')", [GEN3]);
    await expect(publish(GEN3, "PET", 5)).resolves.toBeTruthy();
    await asUser(ADM, "select public.set_generator_plan($1, 'gratis')", [GEN3]);
    expect((await asUser<{ plan: string }>(GEN3, "select plan from public.plan_status()"))[0].plan).toBe("gratis");
  });

  test("el plan es solo para comercios y el comercio puede pedir la activación", async () => {
    await expect(asUser(ADM, "select public.set_generator_plan($1, 'trazabilidad')", [COL])).rejects.toThrow("solo para comercios");
    await asUser(GEN4, "select public.request_plan()");
    expect((await asUser<{ requested_at: string | null }>(GEN4, "select requested_at from public.plan_status()"))[0].requested_at).not.toBeNull();
    await expect(asUser(COL, "select public.request_plan()")).rejects.toThrow("Solo los comercios");
    // Cada comercio ve solo su plan; el administrador ve todos.
    expect(await asUser(GEN4, "select * from public.generator_plans")).toHaveLength(1);
    expect((await asUser(ADM, "select * from public.generator_plans")).length).toBeGreaterThan(2);
    // La activación borra el pedido.
    await asUser(ADM, "select public.set_generator_plan($1, 'trazabilidad')", [GEN4]);
    expect((await asUser<{ requested_at: string | null }>(GEN4, "select requested_at from public.plan_status()"))[0].requested_at).toBeNull();
    await asUser(ADM, "select public.set_generator_plan($1, 'gratis')", [GEN4]);
  });
});

describe("ciclo del retiro: confirmación bilateral", () => {
  let lotId: string;
  let pickupId: string;
  let code: string;
  let impactBefore: { count: number; lb: number };

  test("reserva una sola vez", async () => {
    lotId = await publish(GEN, "PET", 100);
    pickupId = await reserve(COL, lotId);
    expect(pickupId).toMatch(/^[0-9a-f-]{36}$/);
    await expect(reserve(COLV, lotId)).rejects.toThrow("El lote ya no está disponible");
  });

  test("antes de registrar la entrega no hay nada que confirmar ni calificar", async () => {
    await expect(complete(COL, pickupId, true)).rejects.toThrow(/todavía no registra la entrega/);
    await expect(asUser(GEN, "select public.rate_pickup($1, 5::smallint)", [pickupId])).rejects.toThrow(/retiros completados/);
    await expect(propose(GEN2, pickupId, 100)).rejects.toThrow("Retiro no encontrado");
    await expect(propose(COL, pickupId, 100)).rejects.toThrow("Solo el comercio");
  });

  test("el comercio propone el peso real y el precio, pero todavía no cuenta", async () => {
    await propose(GEN, pickupId, 100);
    const p = await one<Record<string, string | null>>(
      "select proposed_lb, proposed_price_per_lb, completed_at, voucher_code, confirmed_lb from public.pickups where id = $1",
      [pickupId],
    );
    expect(Number(p.proposed_lb)).toBe(100);
    expect(Number(p.proposed_price_per_lb)).toBe(0.09);
    expect(p.completed_at).toBeNull();
    expect(p.voucher_code).toBeNull();
    expect(p.confirmed_lb).toBeNull();
    // Nada de puntos, comisión, reputación ni impacto.
    expect((await db.query("select 1 from public.points_ledger where pickup_id = $1", [pickupId])).rows).toHaveLength(0);
    expect((await db.query("select 1 from public.commissions where pickup_id = $1", [pickupId])).rows).toHaveLength(0);
    // El impacto del reciclador no se movió con la propuesta (se compara contra lo que ya tenía).
    const impact = await asUser<{ completed_count: number; completed_lb: string }>(
      GEN,
      "select completed_count, completed_lb from public.profile_impact where profile_id = $1",
      [COL],
    );
    impactBefore = { count: impact[0].completed_count, lb: Number(impact[0].completed_lb) };
    expect(impactBefore.count).toBe(1); // solo la entrega de 15 lb de la prueba del límite
    expect(impactBefore.lb).toBe(15);
  });

  test("el reciclador acepta: comprobante, total, puntos y sin comisión (reciclador de base)", async () => {
    code = await complete(COL, pickupId, true);
    expect(code).toMatch(/^RCA-\d{4}-[0-9A-F]{6}$/);
    const p = await one<{ confirmed_lb: string; total_amount: string; final_price_per_lb: string; was_corrected: boolean }>(
      "select confirmed_lb, total_amount, final_price_per_lb, was_corrected from public.pickups where id = $1",
      [pickupId],
    );
    expect(Number(p.confirmed_lb)).toBe(100);
    expect(Number(p.total_amount)).toBe(9);
    expect(Number(p.final_price_per_lb)).toBe(0.09);
    expect(p.was_corrected).toBe(false);
    const points = await db.query<{ profile_id: string; points: number }>(
      "select profile_id, points from public.points_ledger where pickup_id = $1 order by profile_id",
      [pickupId],
    );
    expect(points.rows).toEqual([
      { profile_id: GEN, points: 100 },
      { profile_id: COL, points: 100 },
    ]);
    expect((await db.query("select 1 from public.commissions where collector_id = $1", [COL])).rows).toHaveLength(0);
  });

  test("cada parte califica una vez y el impacto se agrega en libras", async () => {
    await asUser(GEN, "select public.rate_pickup($1, 5::smallint, 'Puntual')", [pickupId]);
    await asUser(COL, "select public.rate_pickup($1, 4::smallint)", [pickupId]);
    await expect(asUser(GEN, "select public.rate_pickup($1, 5::smallint)", [pickupId])).rejects.toThrow("Ya calificaste este retiro");
    const [impact] = await asUser<{ completed_count: number; completed_lb: string; rating_avg: string; rating_count: number; reputation_tier: string }>(
      GEN,
      "select completed_count, completed_lb, rating_avg, rating_count, reputation_tier from public.profile_impact where profile_id = $1",
      [COL],
    );
    expect(impact.completed_count).toBe(impactBefore.count + 1);
    expect(Number(impact.completed_lb)).toBe(impactBefore.lb + 100);
    expect(Number(impact.rating_avg)).toBe(5);
    expect(impact.rating_count).toBe(1);
    expect(impact.reputation_tier).toBe("en_marcha");
  });

  test("la alcaldía no opera ni lee contacto, lotes o retiros, pero sí los reportes", async () => {
    await expect(publish(MUN)).rejects.toThrow("Solo los comercios pueden publicar lotes");
    await expect(asUser(MUN, "select public.reserve_lot($1)", [lotId])).rejects.toThrow("Solo los recicladores");
    await expect(asUser(MUN, "select public.rate_pickup($1, 5::smallint)", [pickupId])).rejects.toThrow("Solo comercios y recicladores");
    expect(await asUser(MUN, "select * from public.lots")).toEqual([]);
    expect(await asUser(MUN, "select * from public.profile_private")).toEqual([]);
    expect(await asUser(MUN, "select * from public.pickups")).toEqual([]);
    expect(await asUser(MUN, "select * from public.nearby_lots(13.9946, -89.5597, 5000)")).toEqual([]);
    const monthly = await asUser<{ municipality: string; completed_lb: string }>(MUN, "select municipality, completed_lb from public.impact_monthly");
    expect(monthly).toContainEqual(expect.objectContaining({ municipality: "Santa Ana" }));
    expect((await asUser(MUN, "select * from public.impact_heat")).length).toBeGreaterThan(0);
  });

  test("el comprobante se lee sin sesión y nada más", async () => {
    const [v] = await as<{ confirmed_lb: string; generator_name: string; resin_number: number; total_amount: string }>(
      "anon",
      null,
      "select * from public.get_voucher($1)",
      [code],
    );
    expect(Number(v.confirmed_lb)).toBe(100);
    expect(v.generator_name).toBe("Comedor La Ceiba");
    expect(v.resin_number).toBe(1);
    expect(Number(v.total_amount)).toBe(9);
    expect(await as("anon", null, "select * from public.get_voucher('RCA-2026-000000')")).toEqual([]);
    await expect(as("anon", null, "select * from public.nearby_lots(13.9946, -89.5597, 5000)")).rejects.toThrow(/permission denied/);
    expect(await as("anon", null, "select * from public.profiles")).toEqual([]);
    await expect(as("anon", null, "select * from public.profile_impact")).rejects.toThrow(/permission denied/);
  });

  test("confirmar dos veces el mismo retiro explica que ya está completado", async () => {
    await expect(complete(COL, pickupId, true)).rejects.toThrow("Este retiro ya está completado");
    await expect(propose(GEN, pickupId, 90)).rejects.toThrow("Esta entrega ya está confirmada");
  });

  test("el reciclador corrige peso y precio en un paso: manda lo corregido", async () => {
    const lot = await publish(GEN, "PET", 100);
    const pickup = await reserve(COL, lot);
    await propose(GEN, pickup, 100);
    await complete(COL, pickup, false, 95, 0.1);
    const p = await one<{ confirmed_lb: string; total_amount: string; proposed_lb: string; was_corrected: boolean }>(
      "select confirmed_lb, total_amount, proposed_lb, was_corrected from public.pickups where id = $1",
      [pickup],
    );
    expect(Number(p.confirmed_lb)).toBe(95);
    expect(Number(p.proposed_lb)).toBe(100);
    expect(Number(p.total_amount)).toBe(9.5);
    expect(p.was_corrected).toBe(true);
    // Los puntos se dan por las libras confirmadas, no por las propuestas.
    const pts = await one<{ points: number }>("select points from public.points_ledger where pickup_id = $1 and profile_id = $2", [pickup, GEN]);
    expect(pts.points).toBe(95);
  });

  test("corregir exige libras válidas", async () => {
    const lot = await publish(GEN, "PET", 50);
    const pickup = await reserve(COL, lot);
    await propose(GEN, pickup, 50);
    await expect(complete(COL, pickup, false, 0)).rejects.toThrow(/libras confirmadas/);
    await expect(complete(COL, pickup, false, null)).rejects.toThrow(/libras confirmadas/);
    await expect(complete(COL, pickup, false, 22001)).rejects.toThrow(/libras confirmadas/);
    await expect(complete(COL, pickup, false, 40, -1)).rejects.toThrow(/precio no puede ser negativo/);
    await expect(complete(COLV, pickup, true)).rejects.toThrow("Retiro no encontrado");
  });

  test("el comercio puede corregir su propuesta mientras el reciclador no acepta", async () => {
    const lot = await publish(GEN, "PET", 50);
    const pickup = await reserve(COL, lot);
    await propose(GEN, pickup, 50);
    await propose(GEN, pickup, 48, 0.1);
    await complete(COL, pickup, true);
    const p = await one<{ confirmed_lb: string; total_amount: string }>("select confirmed_lb, total_amount from public.pickups where id = $1", [pickup]);
    expect(Number(p.confirmed_lb)).toBe(48);
    expect(Number(p.total_amount)).toBe(4.8);
  });
});

describe("comisión", () => {
  const commission = (pickupId: string) =>
    one<{ gross_amount: string; pct: string; amount: string; status: string }>(
      "select gross_amount, pct, amount, status from public.commissions where pickup_id = $1",
      [pickupId],
    );

  test("un comprador de volumen paga 3 % del valor confirmado de una venta", async () => {
    const { pickupId } = await fullDelivery(GEN, COLV, 200);
    expect(await commission(pickupId)).toEqual({ gross_amount: "18.00", pct: "3.00", amount: "0.54", status: "pendiente" });
  });

  test("el reciclador de base paga 0 %", async () => {
    const { pickupId } = await fullDelivery(GEN, COL, 200);
    expect(await commission(pickupId)).toBeUndefined();
  });

  test("donación o trueque a un comprador de volumen no genera comisión", async () => {
    const donation = await fullDelivery(GEN, COLV, 100, "donacion");
    expect(await commission(donation.pickupId)).toBeUndefined();
    const swap = await fullDelivery(GEN, COLV, 100, "trueque");
    expect(await commission(swap.pickupId)).toBeUndefined();
  });

  test("la comisión usa el peso corregido y el porcentaje configurado", async () => {
    await asUser(ADM, "select public.set_setting('comision_volumen_pct', '4'::jsonb)");
    const lot = await publish(GEN, "PET", 100);
    const pickup = await reserve(COLV, lot);
    await propose(GEN, pickup, 100);
    await complete(COLV, pickup, false, 50, 0.1); // 50 lb × 0.10 = 5.00
    expect(await commission(pickup)).toEqual({ gross_amount: "5.00", pct: "4.00", amount: "0.20", status: "pendiente" });
    await asUser(ADM, "select public.set_setting('comision_volumen_pct', '3'::jsonb)");
  });

  test("el administrador ve el resumen mensual por comprador y marca cobradas", async () => {
    const summary = await asUser<{ collector_id: string; deliveries: number; commission_amount: string; pending_amount: string; paid_amount: string }>(
      ADM,
      "select * from public.commission_summary()",
    );
    expect(summary).toHaveLength(1);
    expect(summary[0].collector_id).toBe(COLV);
    expect(summary[0].deliveries).toBe(2);
    expect(Number(summary[0].commission_amount)).toBe(0.74);
    expect(Number(summary[0].pending_amount)).toBe(0.74);

    const [c] = (await db.query<{ id: string }>("select id from public.commissions limit 1")).rows;
    await asUser(ADM, "select public.set_commission_status($1, 'cobrada')", [c.id]);
    const after = await asUser<{ paid_amount: string }>(ADM, "select paid_amount from public.commission_summary()");
    expect(Number(after[0].paid_amount)).toBeGreaterThan(0);
    await expect(asUser(ADM, "select public.set_commission_status($1, 'otra')", [c.id])).rejects.toThrow(/pendiente o cobrada/);
  });

  test("cada comprador ve solo sus comisiones; comercios y recicladores de base no ven ninguna", async () => {
    expect((await asUser(COLV, "select * from public.commissions")).length).toBe(2);
    expect(await asUser(COL, "select * from public.commissions")).toEqual([]);
    expect(await asUser(GEN, "select * from public.commissions")).toEqual([]);
    await expect(asUser(GEN, "select * from public.commission_summary()")).rejects.toThrow("Solo el administrador");
    await expect(asUser(COLV, "select public.set_commission_status(gen_random_uuid(), 'cobrada')")).rejects.toThrow("Solo el administrador");
  });

  test("el administrador clasifica a un valorizador", async () => {
    await asUser(ADM, "select public.set_valorizador_tipo($1, 'volumen')", [COL]);
    const { pickupId } = await fullDelivery(GEN, COL, 100);
    expect(await commission(pickupId)).toMatchObject({ amount: "0.27" });
    await asUser(ADM, "select public.set_valorizador_tipo($1, 'base')", [COL]);
    await expect(asUser(ADM, "select public.set_valorizador_tipo($1, 'base')", [GEN])).rejects.toThrow("Valorizador no encontrado");
    await expect(asUser(COL, "select public.set_valorizador_tipo($1, 'volumen')", [COL])).rejects.toThrow("Solo el administrador");
  });
});

describe("liberar reservas", () => {
  test("el comercio suelta la reserva: el lote se publica de nuevo y otro reciclador puede reservar", async () => {
    const lot = await publish(GEN, "PET", 100);
    const first = await reserve(COL, lot);
    await asUser(GEN, "select public.release_reservation($1)", [first]);
    expect((await one<{ status: string }>("select status from public.lots where id = $1", [lot])).status).toBe("publicado");
    expect((await db.query("select 1 from public.pickups where lot_id = $1", [lot])).rows).toHaveLength(0);
    expect(await one<{ reason: string; collector_id: string }>("select reason, collector_id from public.pickup_releases where lot_id = $1", [lot])).toEqual({
      reason: "generador",
      collector_id: COL,
    });
    // La restricción unique(lot_id) no estorba: el retiro anterior quedó archivado.
    await expect(reserve(COLV, lot)).resolves.toMatch(/^[0-9a-f-]{36}$/);
  });

  test("al republicar se avisa a otros recicladores, no a quien soltó el lote", async () => {
    const lot = await publish(GEN, "PET", 100);
    const pickup = await reserve(COL, lot);
    await db.exec(`delete from public.notification_queue where payload ->> 'lot_id' = '${lot}'`);
    await asUser(COL, "select public.release_reservation($1)", [pickup]);
    const rows = await db.query<{ profile_id: string; event: string }>(
      "select profile_id, event from public.notification_queue where payload ->> 'lot_id' = $1 order by event, profile_id",
      [lot],
    );
    expect(rows.rows).toContainEqual({ profile_id: COLV, event: "lote_cercano" });
    expect(rows.rows).not.toContainEqual({ profile_id: COL, event: "lote_cercano" });
    expect(rows.rows).toContainEqual({ profile_id: GEN, event: "reserva_liberada" });
  });

  test("solo las partes sueltan, y no después de registrada la entrega", async () => {
    const lot = await publish(GEN, "PET", 100);
    const pickup = await reserve(COL, lot);
    await expect(asUser(COLV, "select public.release_reservation($1)", [pickup])).rejects.toThrow("Retiro no encontrado");
    await expect(asUser(GEN2, "select public.release_reservation($1)", [pickup])).rejects.toThrow("Retiro no encontrado");
    await propose(GEN, pickup, 100);
    await expect(asUser(GEN, "select public.release_reservation($1)", [pickup])).rejects.toThrow(/todavía no tiene entrega registrada/);
  });

  test("una reserva sin confirmar se libera sola 24 h después del horario de retiro", async () => {
    const lot = await publish(GEN, "PET", 100);
    await reserve(COL, lot);
    // Retiro terminó hace 23 h: todavía no.
    await db.exec(`update public.lots set pickup_from = now() - interval '25 hours', pickup_to = now() - interval '23 hours' where id = '${lot}'`);
    expect((await asUser<{ n: number }>(COL, "select public.release_expired_reservations() as n"))[0].n).toBe(0);
    // Hace 25 h: se libera.
    await db.exec(`update public.lots set pickup_from = now() - interval '27 hours', pickup_to = now() - interval '25 hours' where id = '${lot}'`);
    expect((await asUser<{ n: number }>(COL, "select public.release_expired_reservations() as n"))[0].n).toBe(1);
    expect((await one<{ status: string }>("select status from public.lots where id = $1", [lot])).status).toBe("publicado");
    expect((await one<{ reason: string }>("select reason from public.pickup_releases where lot_id = $1", [lot])).reason).toBe("automatica");
    // Idempotente.
    expect((await asUser<{ n: number }>(COL, "select public.release_expired_reservations() as n"))[0].n).toBe(0);
  });

  test("una entrega ya registrada no se libera sola", async () => {
    const lot = await publish(GEN, "PET", 100);
    const pickup = await reserve(COL, lot);
    await propose(GEN, pickup, 100);
    await db.exec(`update public.lots set pickup_from = now() - interval '60 hours', pickup_to = now() - interval '50 hours' where id = '${lot}'`);
    expect((await asUser<{ n: number }>(COL, "select public.release_expired_reservations() as n"))[0].n).toBe(0);
    expect((await one<{ status: string }>("select status from public.lots where id = $1", [lot])).status).toBe("entregado");
  });

  test("la espera para liberar sale de la configuración", async () => {
    const lot = await publish(GEN, "PET", 100);
    await reserve(COL, lot);
    await db.exec(`update public.lots set pickup_from = now() - interval '5 hours', pickup_to = now() - interval '3 hours' where id = '${lot}'`);
    await asUser(ADM, "select public.set_setting('horas_liberar_reserva', '2'::jsonb)");
    expect((await asUser<{ n: number }>(COL, "select public.release_expired_reservations() as n"))[0].n).toBe(1);
    await asUser(ADM, "select public.set_setting('horas_liberar_reserva', '24'::jsonb)");
  });
});

describe("repetir lote", () => {
  test("publica un lote igual con la ventana en un día futuro", async () => {
    const lot = await publish(GEN, "HDPE", 77);
    const copyId = (await asUser<{ repeat_lot: string }>(GEN, "select public.repeat_lot($1)", [lot]))[0].repeat_lot;
    const [a, b] = (
      await db.query<{ polymer_code: string; estimated_lb: string; modality: string; pickup_from: string; ok: boolean }>(
        `select polymer_code, estimated_lb, modality, pickup_from, (pickup_from > now() + interval '1 hour') as ok
         from public.lots where id in ($1, $2) order by id = $2`,
        [lot, copyId],
      )
    ).rows;
    expect(b).toMatchObject({ polymer_code: a.polymer_code, estimated_lb: a.estimated_lb, modality: a.modality, ok: true });
    expect(new Date(b.pickup_from).getTime()).toBeGreaterThan(new Date(a.pickup_from).getTime());
  });

  test("solo el dueño del lote lo repite", async () => {
    const lot = await publish(GEN, "PET", 10);
    await expect(asUser(GEN3, "select public.repeat_lot($1)", [lot])).rejects.toThrow("Lote no encontrado");
    await expect(asUser(COL, "select public.repeat_lot($1)", [lot])).rejects.toThrow("Solo los comercios");
  });
});

describe("ReciclaPuntos", () => {
  const balance = (uid: string) => asUser<{ b: number }>(uid, "select public.points_balance() as b").then((r) => r[0].b);

  test("se ganan solo con entregas confirmadas, por libra, para ambas partes", async () => {
    expect(await balance(GEN4)).toBe(0);
    const lot = await publish(GEN4, "PET", 100);
    const pickup = await reserve(COLV, lot);
    await propose(GEN4, pickup, 100);
    expect(await balance(GEN4)).toBe(0); // propuesta no cuenta
    await complete(COLV, pickup, true);
    expect(await balance(GEN4)).toBe(100);
    expect(await balance(COLV)).toBeGreaterThanOrEqual(100);
  });

  test("tope mensual por usuario", async () => {
    await asUser(ADM, "select public.set_setting('reciclapuntos_tope_mensual', '150'::jsonb)");
    await fullDelivery(GEN4, COLV, 100); // GEN4 ya tiene 100: solo 50 más
    expect(await balance(GEN4)).toBe(150);
    await fullDelivery(GEN4, COLV, 100); // tope alcanzado
    expect(await balance(GEN4)).toBe(150);
    await asUser(ADM, "select public.set_setting('reciclapuntos_tope_mensual', '500'::jsonb)");
    await fullDelivery(GEN4, COLV, 100);
    expect(await balance(GEN4)).toBe(250);
  });

  test("el canje manual del administrador consume primero lo que caduca antes", async () => {
    await asUser(ADM, "select public.redeem_points($1, 120, 'Canje de prueba')", [GEN4]);
    expect(await balance(GEN4)).toBe(130);
    const rows = await db.query<{ points: number; remaining: number | null; kind: string }>(
      "select kind, points, remaining from public.points_ledger where profile_id = $1 order by created_at, kind",
      [GEN4],
    );
    expect(rows.rows.filter((r) => r.kind === "canje")).toEqual([{ kind: "canje", points: -120, remaining: null }]);
    // Ganó 100, 50 (tope) y 100; la entrega con el tope lleno no deja fila. FIFO: 100 + 20 del segundo.
    expect(rows.rows.filter((r) => r.kind === "ganado").map((r) => r.remaining)).toEqual([0, 30, 100]);
    await expect(asUser(ADM, "select public.redeem_points($1, 1000)", [GEN4])).rejects.toThrow("El saldo no alcanza");
    await expect(asUser(GEN4, "select public.redeem_points($1, 10)", [GEN4])).rejects.toThrow("Solo el administrador");
    await expect(asUser(ADM, "select public.redeem_points($1, 0)", [GEN4])).rejects.toThrow(/mayores que 0/);
  });

  test("los puntos caducan según la configuración", async () => {
    await db.exec(`update public.points_ledger set expires_at = now() - interval '1 day' where profile_id = '${GEN4}' and kind = 'ganado' and remaining = 30`);
    expect(await balance(GEN4)).toBe(100);
  });

  test("cada quien ve solo su saldo e historial", async () => {
    await expect(asUser(COL, "select public.points_balance($1)", [GEN4])).rejects.toThrow("No puedes ver los puntos");
    expect((await asUser<{ b: number }>(ADM, "select public.points_balance($1) as b", [GEN4]))[0].b).toBe(100);
    const mine = await asUser<{ profile_id: string }>(GEN4, "select profile_id from public.points_ledger");
    expect(mine.every((r) => r.profile_id === GEN4)).toBe(true);
    await expect(asUser(GEN4, "select public._award_points(gen_random_uuid())")).rejects.toThrow(/permission denied/);
  });
});

describe("retiros programados", () => {
  const weekdayTomorrow = async () =>
    (await one<{ d: number }>("select extract(dow from ((now() at time zone 'America/El_Salvador') + interval '1 day'))::int as d")).d;

  test("solo con plan activo", async () => {
    const error = await fails(
      asUser(GEN4, "select public.save_scheduled_pickup($1, 'PET', 100, 'venta', 1::smallint, '10:00', '12:00')", [COL]),
    );
    expect(error.hint).toBe("requiere_plan");
  });

  test("el sistema crea el lote y avisa primero al reciclador de confianza", async () => {
    const dow = await weekdayTomorrow();
    const [{ save_scheduled_pickup: scheduleId }] = await asUser<{ save_scheduled_pickup: string }>(
      GEN,
      "select public.save_scheduled_pickup($1, 'PET', 120, 'venta', $2::smallint, '10:00', '12:00', 'Cada semana') as save_scheduled_pickup",
      [COL, dow],
    );
    expect(scheduleId).toMatch(/^[0-9a-f-]{36}$/);

    const created = (await as<{ n: number }>("service_role", null, "select public.create_scheduled_lots() as n"))[0].n;
    expect(created).toBe(1);
    const lot = await one<{ id: string; estimated_lb: string; scheduled_pickup_id: string }>(
      "select id, estimated_lb, scheduled_pickup_id from public.lots where scheduled_pickup_id = $1",
      [scheduleId],
    );
    expect(Number(lot.estimated_lb)).toBe(120);

    const rows = await db.query<{ profile_id: string; delay_min: number }>(
      `select profile_id, round(extract(epoch from (send_after - created_at)) / 60)::int as delay_min
       from public.notification_queue where event = 'lote_cercano' and payload ->> 'lot_id' = $1 order by profile_id`,
      [lot.id],
    );
    // COL (de confianza): 0 min. COLV: 0 (plan) + 5 (reputación) + 60 (programado) = 65.
    expect(rows.rows).toEqual([
      { profile_id: COL, delay_min: 0 },
      { profile_id: COLV, delay_min: 65 },
    ]);

    // Idempotente: no duplica el mismo día.
    expect((await as<{ n: number }>("service_role", null, "select public.create_scheduled_lots() as n"))[0].n).toBe(0);
  });

  test("pausar, borrar y que nadie más toque el retiro programado", async () => {
    const [s] = (await db.query<{ id: string }>("select id from public.scheduled_pickups limit 1")).rows;
    await expect(asUser(GEN3, "select public.set_scheduled_active($1, false)", [s.id])).rejects.toThrow("no encontrado");
    expect((await asUser(COL, "select * from public.scheduled_pickups")).length).toBe(1);
    expect(await asUser(GEN3, "select * from public.scheduled_pickups")).toEqual([]);
    await asUser(GEN, "select public.set_scheduled_active($1, false)", [s.id]);
    await db.exec("update public.scheduled_pickups set last_created_for = null");
    expect((await as<{ n: number }>("service_role", null, "select public.create_scheduled_lots() as n"))[0].n).toBe(0);
    await asUser(GEN, "select public.delete_scheduled_pickup($1)", [s.id]);
    expect((await db.query("select 1 from public.scheduled_pickups")).rows).toHaveLength(0);
  });

  test("si el plan vence, el retiro programado deja de crear lotes", async () => {
    const dow = await weekdayTomorrow();
    await asUser(GEN, "select public.save_scheduled_pickup($1, 'PET', 50, 'venta', $2::smallint, '09:00', '10:00')", [COL, dow]);
    await db.exec(`update public.generator_plans set expires_at = now() - interval '1 minute' where profile_id = '${GEN}'`);
    expect((await as<{ n: number }>("service_role", null, "select public.create_scheduled_lots() as n"))[0].n).toBe(0);
    await db.exec(`update public.generator_plans set expires_at = now() + interval '30 days' where profile_id = '${GEN}'`);
    await expect(as("authenticated", GEN, "select public.create_scheduled_lots()")).rejects.toThrow(/permission denied/);
  });
});

describe("Comercio Circular, historial y reporte", () => {
  test("el slug sale del nombre sin acentos y es único", async () => {
    expect((await one<{ s: string }>("select public.slugify('Pupusería Doña Tere') as s")).s).toBe("pupuseria-dona-tere");
    expect((await one<{ slug: string }>("select slug from public.profiles where id = $1", [GEN])).slug).toBe("comedor-la-ceiba");
    await db.exec(`insert into auth.users (id, email) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'dup@test');
      insert into public.profiles (id, role, display_name, org_type, municipality, zone)
      values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'generador', 'Comedor la Ceiba', 'Comedor', 'Santa Ana', 'X')`);
    expect((await one<{ slug: string }>("select slug from public.profiles where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'")).slug).toBe("comedor-la-ceiba-2");
    expect((await one<{ slug: string | null }>("select slug from public.profiles where id = $1", [COL])).slug).toBeNull();
  });

  test("la página pública muestra libras, CO₂ y última entrega, sin datos personales", async () => {
    const rows = await as<Record<string, unknown>>("anon", null, "select * from public.get_circular('comedor-la-ceiba')");
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(["business_name", "co2_kg", "deliveries", "last_delivery_at", "org_type", "total_lb"]);
    expect(rows[0].business_name).toBe("Comedor La Ceiba");
    const lbs = Number(rows[0].total_lb);
    expect(lbs).toBeGreaterThanOrEqual(100);
    // 100 lb = 45.36 kg × 2.0 = 90.72 kg de CO₂
    expect(Number(rows[0].co2_kg)).toBeCloseTo(lbs * 0.45359237 * 2, 3);
  });

  test("sin plan activo o sin entregas confirmadas no hay página pública", async () => {
    expect(await as("anon", null, "select * from public.get_circular('panaderia-san-miguelito')")).toEqual([]); // sin plan
    await db.exec(`update public.generator_plans set expires_at = now() - interval '1 minute' where profile_id = '${GEN}'`);
    expect(await as("anon", null, "select * from public.get_circular('comedor-la-ceiba')")).toEqual([]); // plan vencido
    await db.exec(`update public.generator_plans set expires_at = now() + interval '30 days' where profile_id = '${GEN}'`);
    expect(await as("anon", null, "select * from public.get_circular('no-existe')")).toEqual([]);
  });

  test("historial: gratis ve 30 días; con plan ve todo", async () => {
    await db.exec(`insert into public.lots (generator_id, polymer_code, estimated_lb, pickup_from, pickup_to, modality, location, created_at)
      select '${GEN4}', 'PET', 10, now() - interval '41 days', now() - interval '40 days', 'venta', location, now() - interval '40 days'
      from public.profile_private where id = '${GEN4}'`);
    const free = await asUser<{ created_at: string }>(GEN4, "select created_at from public.generator_history()");
    expect(free.length).toBeGreaterThan(0);
    expect(free.every((r) => Date.now() - new Date(r.created_at).getTime() <= 30 * 86_400_000)).toBe(true);
    await asUser(ADM, "select public.set_generator_plan($1, 'trazabilidad')", [GEN4]);
    const full = await asUser<{ created_at: string }>(GEN4, "select created_at from public.generator_history()");
    expect(full.length).toBe(free.length + 1);
    await asUser(ADM, "select public.set_generator_plan($1, 'gratis')", [GEN4]);
    await expect(asUser(COL, "select * from public.generator_history()")).rejects.toThrow("Solo los comercios");
  });

  test("el reporte mensual es solo del plan e incluye únicamente entregas confirmadas del mes", async () => {
    const report = await asUser<{ voucher_code: string; confirmed_lb: string; collector_name: string }>(
      GEN,
      "select voucher_code, confirmed_lb, collector_name from public.monthly_report()",
    );
    expect(report.length).toBeGreaterThan(3);
    expect(report.every((r) => /^RCA-/.test(r.voucher_code))).toBe(true);
    // Un mes sin entregas: vacío, no error.
    expect(await asUser(GEN, "select * from public.monthly_report('2020-01-15')")).toEqual([]);
    const error = await fails(asUser(GEN3, "select * from public.monthly_report()"));
    expect(error.hint).toBe("requiere_plan");
    expect(error.message).toMatch(/Plan Trazabilidad/);
    await expect(asUser(COL, "select * from public.monthly_report()")).rejects.toThrow("Solo los comercios");
  });
});

describe("WhatsApp en formato +503", () => {
  test("normaliza ocho dígitos, con prefijo y con símbolos", async () => {
    const sql = "select public.normalize_sv_phone($1) as n";
    expect((await one<{ n: string }>(sql, ["7000-0101"])).n).toBe("50370000101");
    expect((await one<{ n: string }>(sql, ["+503 7000 0101"])).n).toBe("50370000101");
    expect((await one<{ n: string }>(sql, ["00503 7000-0101"])).n).toBe("50370000101");
    expect((await one<{ n: string }>(sql, ["50370000101"])).n).toBe("50370000101");
    expect((await one<{ n: string | null }>(sql, [""])).n).toBeNull();
  });

  test("lo que se guarda en el perfil queda normalizado", async () => {
    await db.exec(`update public.profile_private set whatsapp = '7000 0777' where id = '${GEN3}'`);
    expect((await one<{ whatsapp: string }>("select whatsapp from public.profile_private where id = $1", [GEN3])).whatsapp).toBe("50370000777");
    await db.exec(`update public.profile_private set whatsapp = '50370000007' where id = '${GEN3}'`);
  });
});

describe("fotos en storage", () => {
  test("solo un comercio sube, y solo a su carpeta", async () => {
    await asUser(GEN, "insert into storage.objects (bucket_id, name) values ('lot-photos', $1)", [`${GEN}/foto.jpg`]);
    await expect(
      asUser(GEN, "insert into storage.objects (bucket_id, name) values ('lot-photos', $1)", [`${COL}/foto.jpg`]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(COL, "insert into storage.objects (bucket_id, name) values ('lot-photos', $1)", [`${COL}/foto.jpg`]),
    ).rejects.toThrow(/row-level security/);
  });

  const photo = (uid: string) => `https://abcdefgh.supabase.co/storage/v1/object/public/lot-photos/${uid}/foto.jpg`;
  const publishWithPhotos = (uid: string, urls: string[]) =>
    asUser(uid, "select public.publish_lot('PET', 10, $1, $2, 'venta', $3)", [tomorrow(9), tomorrow(11), urls]);

  test("solo acepta fotos de la carpeta del propio comercio en el bucket", async () => {
    await expect(publishWithPhotos(GEN, [photo(GEN)])).resolves.toHaveLength(1);
    await expect(publishWithPhotos(GEN, [photo(GEN2)])).rejects.toThrow("Una de las fotos no es válida");
    await expect(publishWithPhotos(GEN, ["https://example.com/feo.jpg"])).rejects.toThrow("Una de las fotos no es válida");
  });

  test("un comercio borra sus propias fotos, no las de otro", async () => {
    await db.exec(`insert into storage.objects (bucket_id, name) values ('lot-photos', '${GEN}/borrar.jpg'), ('lot-photos', '${GEN2}/ajena.jpg')`);
    const mine = await asUser(GEN, "delete from storage.objects where name = $1 returning name", [`${GEN}/borrar.jpg`]);
    expect(mine).toHaveLength(1);
    const other = await asUser(GEN, "delete from storage.objects where name = $1 returning name", [`${GEN2}/ajena.jpg`]);
    expect(other).toHaveLength(0);
  });
});

describe("permisos", () => {
  test("las funciones internas no las llama nadie con sesión de usuario", async () => {
    await expect(asUser(GEN, "select public._enqueue_notification($1, 'x')", [COL])).rejects.toThrow(/permission denied/);
    await expect(asUser(GEN, "select public._release_pickup(gen_random_uuid(), 'generador')")).rejects.toThrow(/permission denied/);
    await expect(
      asUser(GEN, "select public._create_lot($1, 'PET', 1, now(), now() + interval '1 hour', 'venta', '{}', null)", [GEN]),
    ).rejects.toThrow(/permission denied/);
    await expect(asUser(GEN, "select * from public._lot_alert_recipients(gen_random_uuid())")).rejects.toThrow(/permission denied/);
  });

  test("anónimos no operan nada del mercado", async () => {
    await expect(as("anon", null, "select public.set_setting('lotes_gratis_por_mes', '1'::jsonb)")).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, "select public.release_expired_reservations()")).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, "select * from public.monthly_report()")).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, "select public.has_active_plan(gen_random_uuid())")).rejects.toThrow(/permission denied/);
  });

  test("las tablas de plan, comisión, puntos, avisos y liberaciones solo las leen sus dueños", async () => {
    expect(await asUser(COL, "select * from public.pickup_releases where collector_id <> $1", [COL])).toEqual([]);
    expect((await asUser(GEN, "select * from public.pickup_releases")).length).toBeGreaterThan(0);
    expect(await asUser(MUN, "select * from public.generator_plans")).toEqual([]);
    expect(await asUser(MUN, "select * from public.points_ledger")).toEqual([]);
    await expect(asUser(GEN, "insert into public.points_ledger (profile_id, kind, points) values ($1, 'canje', -5)", [GEN])).rejects.toThrow(
      /row-level security|permission denied/,
    );
  });
});

describe("ajustes de administración (migración 0900)", () => {
  test("un NULL de SQL deja vacío un precio de referencia o el contacto, pero no un número obligatorio", async () => {
    await asUser(ADM, "select public.set_setting('precio_ref_pp_usd_lb', '0.07'::jsonb)");
    await asUser(ADM, "select public.set_setting('precio_ref_pp_usd_lb', null::jsonb)");
    expect((await one<{ value: unknown }>("select value from public.app_settings where key = 'precio_ref_pp_usd_lb'")).value).toBeNull();

    await asUser(ADM, `select public.set_setting('contacto_whatsapp_reciclamigo', '"7000-1234"'::jsonb)`);
    await asUser(ADM, "select public.set_setting('contacto_whatsapp_reciclamigo', null::jsonb)");
    expect((await one<{ value: unknown }>("select value from public.app_settings where key = 'contacto_whatsapp_reciclamigo'")).value).toBeNull();

    await expect(asUser(ADM, "select public.set_setting('lotes_gratis_por_mes', null::jsonb)")).rejects.toThrow("El valor debe ser un número");
    await expect(asUser(ADM, "select public.set_setting('radios_aviso_km', null::jsonb)")).rejects.toThrow(/entre 1 y 8 radios/);
  });

  test("commission_pickup_facts devuelve peso, fecha, comprobante y plástico solo de entregas con comisión", async () => {
    const commissioned = (await db.query<{ pickup_id: string }>("select pickup_id from public.commissions limit 1")).rows[0];
    const other = (
      await db.query<{ id: string }>(
        `select p.id from public.pickups p
         where p.completed_at is not null and not exists (select 1 from public.commissions c where c.pickup_id = p.id) limit 1`,
      )
    ).rows[0];
    const rows = await asUser<{ pickup_id: string; confirmed_lb: string; voucher_code: string; polymer_code: string }>(
      ADM,
      "select * from public.commission_pickup_facts($1::uuid[])",
      [[commissioned.pickup_id, other.id]],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].pickup_id).toBe(commissioned.pickup_id);
    expect(rows[0].voucher_code).toMatch(/^RCA-\d{4}-[0-9A-F]{6}$/);
    expect(Number(rows[0].confirmed_lb)).toBeGreaterThan(0);
    expect(rows[0].polymer_code).toBe("PET");
  });

  test("commission_pickup_facts es solo del administrador", async () => {
    const id = "00000000-0000-4000-8000-000000000000";
    await expect(asUser(GEN, "select * from public.commission_pickup_facts($1::uuid[])", [[id]])).rejects.toThrow("Solo el administrador");
    await expect(asUser(COLV, "select * from public.commission_pickup_facts($1::uuid[])", [[id]])).rejects.toThrow("Solo el administrador");
    await expect(as("anon", null, "select * from public.commission_pickup_facts($1::uuid[])", [[id]])).rejects.toThrow(/permission denied/);
  });
});
