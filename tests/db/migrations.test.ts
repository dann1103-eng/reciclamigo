import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { beforeAll, describe, expect, test } from "vitest";

// Corre las migraciones reales sobre un Postgres local que imita a Supabase y
// prueba las reglas del mercado: radio, doble reserva, transiciones, alcaldía, anon.

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");
const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();

const GEN = "11111111-1111-4111-8111-111111111111"; // comercio, Santa Ana centro
const COL = "22222222-2222-4222-8222-222222222222"; // reciclador, ~1.5 km
const MUN = "33333333-3333-4333-8333-333333333333"; // alcaldía
const GEN2 = "44444444-4444-4444-8444-444444444444"; // comercio en San Salvador (~50 km)

let db: PGlite;

type Role = "authenticated" | "anon";

async function as<T = Record<string, unknown>>(role: Role, uid: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); set role ${role};`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}

const tomorrow = (h: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(h + 6, 0, 0, 0); // hora de El Salvador
  return d.toISOString();
};

async function publish(uid: string, polymer = "PET", kg = 40, modality = "venta") {
  const [row] = await as<{ publish_lot: string }>(
    "authenticated",
    uid,
    "select public.publish_lot($1, $2, $3, $4, $5::public.lot_modality) as publish_lot",
    [polymer, kg, tomorrow(9), tomorrow(11), modality],
  );
  return row.publish_lot;
}

beforeAll(async () => {
  db = new PGlite({ extensions: { postgis } });
  await db.exec(readFileSync(join(ROOT, "supabase/tests/supabase-stubs.sql"), "utf8"));
  for (const file of migrationFiles) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  const point = (lat: number, lng: number) => `extensions.st_setsrid(extensions.st_makepoint(${lng}, ${lat}), 4326)::extensions.geography`;
  await db.exec(`
    insert into auth.users (id, email) values
      ('${GEN}', 'comercio@test'), ('${COL}', 'reciclador@test'), ('${MUN}', 'alcaldia@test'), ('${GEN2}', 'comercio2@test');
    insert into public.profiles (id, role, display_name, org_type, municipality, zone, verified) values
      ('${GEN}', 'generador', 'Comedor La Ceiba', 'Restaurante', 'Santa Ana', 'Centro', false),
      ('${COL}', 'valorizador', 'Don José', 'Reciclador de base', 'Santa Ana', 'El Palmar', true),
      ('${MUN}', 'municipalidad', 'Alcaldía de Santa Ana', 'Alcaldía', 'Santa Ana', 'Centro', true),
      ('${GEN2}', 'generador', 'Hotel Prueba', 'Hotel', 'San Salvador', 'Escalón', false);
    insert into public.profile_private (id, whatsapp, address, location) values
      ('${GEN}', '50370000001', 'Calle 1', ${point(13.9946, -89.5597)}),
      ('${COL}', '50370000002', 'Calle 2', ${point(14.0066, -89.553)}),
      ('${GEN2}', '50370000004', 'Calle 4', ${point(13.6929, -89.2182)});
  `);
});

describe("migraciones", () => {
  test("se aplican todas en orden y quedan registradas", async () => {
    const rows = (await db.query<{ name: string }>("select name from public.app_migrations order by name")).rows;
    expect(rows.map((r) => r.name)).toEqual(migrationFiles.map((f) => f.replace(/\.sql$/, "")));
  });
});

describe("publish_lot", () => {
  test("fija precio desde el catálogo y ubicación desde el perfil", async () => {
    const id = await publish(GEN);
    const [lot] = (
      await db.query<{ price_per_kg: string; same_place: boolean; status: string }>(
        `select l.price_per_kg, l.status, extensions.st_equals(l.location::extensions.geometry, pp.location::extensions.geometry) as same_place
         from public.lots l join public.profile_private pp on pp.id = l.generator_id where l.id = $1`,
        [id],
      )
    ).rows;
    expect(Number(lot.price_per_kg)).toBe(0.2);
    expect(lot.same_place).toBe(true);
    expect(lot.status).toBe("publicado");
  });

  test("en donación el precio es cero", async () => {
    const id = await publish(GEN, "HDPE", 10, "donacion");
    const [lot] = (await db.query<{ price_per_kg: string }>("select price_per_kg from public.lots where id = $1", [id])).rows;
    expect(Number(lot.price_per_kg)).toBe(0);
  });

  test("rechaza kg inválidos y ventana invertida", async () => {
    await expect(publish(GEN, "PET", 0)).rejects.toThrow(/kg estimados/);
    await expect(publish(GEN, "PET", 10001)).rejects.toThrow(/kg estimados/);
    await expect(
      as("authenticated", GEN, "select public.publish_lot('PET', 5, $1, $2, 'venta')", [tomorrow(11), tomorrow(9)]),
    ).rejects.toThrow(/ventana de retiro/);
  });
});

describe("nearby_lots", () => {
  test("respeta el radio y el filtro de polímero", async () => {
    const id = await publish(GEN, "PET", 25);
    const farId = await publish(GEN2, "PET", 25);
    const near = (radius: number, polymers: string[] | null = null) =>
      as<{ id: string; distance_m: number }>(
        "authenticated",
        COL,
        "select id, distance_m from public.nearby_lots(14.0066, -89.553, $1, $2)",
        [radius, polymers],
      );

    const at3 = await near(3000);
    const found = at3.find((r) => r.id === id);
    expect(found?.distance_m).toBeGreaterThan(1000);
    expect(found?.distance_m).toBeLessThan(2000);
    expect(at3.some((r) => r.id === farId)).toBe(false);
    expect(at3.every((r) => r.distance_m <= 3000)).toBe(true);
    expect((await near(1000)).some((r) => r.id === id)).toBe(false);
    expect((await near(3000, ["HDPE"])).some((r) => r.id === id)).toBe(false);
  });
});

describe("ciclo del retiro", () => {
  let lotId: string;
  let pickupId: string;
  let code: string;

  test("reserva una sola vez", async () => {
    lotId = await publish(GEN, "PET", 40);
    const [r] = await as<{ reserve_lot: string }>("authenticated", COL, "select public.reserve_lot($1)", [lotId]);
    pickupId = r.reserve_lot;
    expect(pickupId).toMatch(/^[0-9a-f-]{36}$/);
    await expect(as("authenticated", COL, "select public.reserve_lot($1)", [lotId])).rejects.toThrow(
      "El lote ya no está disponible",
    );
  });

  test("no se completa antes de la entrega ni la marca otro comercio", async () => {
    await expect(
      as("authenticated", COL, "select public.complete_pickup($1, 35.5, 'efectivo')", [pickupId]),
    ).rejects.toThrow(/todavía no marca la entrega/);
    await expect(as("authenticated", GEN2, "select public.mark_delivered($1)", [pickupId])).rejects.toThrow(
      "Retiro no encontrado",
    );
  });

  test("entrega, completa con kg reales y genera el código del certificado", async () => {
    await as("authenticated", GEN, "select public.mark_delivered($1)", [pickupId]);
    const [r] = await as<{ complete_pickup: string }>(
      "authenticated",
      COL,
      "select public.complete_pickup($1, 35.5, 'efectivo')",
      [pickupId],
    );
    code = r.complete_pickup;
    expect(code).toMatch(/^RCA-\d{4}-[0-9A-F]{6}$/);
    const [p] = (await db.query<{ total_amount: string; confirmed_kg: string }>("select total_amount, confirmed_kg from public.pickups where id = $1", [pickupId])).rows;
    expect(Number(p.confirmed_kg)).toBe(35.5);
    expect(Number(p.total_amount)).toBe(7.1);
  });

  test("cada parte califica una vez y el impacto se agrega", async () => {
    await as("authenticated", GEN, "select public.rate_pickup($1, 5::smallint, 'Puntual')", [pickupId]);
    await as("authenticated", COL, "select public.rate_pickup($1, 4::smallint)", [pickupId]);
    await expect(as("authenticated", GEN, "select public.rate_pickup($1, 5::smallint)", [pickupId])).rejects.toThrow(
      "Ya calificaste este retiro",
    );
    const [impact] = await as<{ completed_kg: string; rating_avg: string; rating_count: number }>(
      "authenticated",
      GEN,
      "select completed_kg, rating_avg, rating_count from public.profile_impact where profile_id = $1",
      [COL],
    );
    expect(Number(impact.completed_kg)).toBe(35.5);
    expect(Number(impact.rating_avg)).toBe(5);
    expect(impact.rating_count).toBe(1);
  });

  test("la alcaldía no opera ni lee contacto, lotes o retiros, pero sí los reportes", async () => {
    await expect(publish(MUN)).rejects.toThrow("Solo los comercios pueden publicar lotes");
    await expect(as("authenticated", MUN, "select public.reserve_lot($1)", [lotId])).rejects.toThrow(
      "Solo los recicladores",
    );
    await expect(as("authenticated", MUN, "select public.rate_pickup($1, 5::smallint)", [pickupId])).rejects.toThrow(
      "Solo comercios y recicladores",
    );
    expect(await as("authenticated", MUN, "select * from public.lots")).toEqual([]);
    expect(await as("authenticated", MUN, "select * from public.profile_private")).toEqual([]);
    expect(await as("authenticated", MUN, "select * from public.pickups")).toEqual([]);
    expect(await as("authenticated", MUN, "select * from public.nearby_lots(13.9946, -89.5597, 5000)")).toEqual([]);
    const monthly = await as<{ municipality: string; completed_kg: string }>(
      "authenticated",
      MUN,
      "select municipality, completed_kg from public.impact_monthly",
    );
    expect(monthly).toContainEqual(expect.objectContaining({ municipality: "Santa Ana" }));
    expect((await as("authenticated", MUN, "select * from public.impact_heat")).length).toBe(1);
  });

  test("el certificado se lee sin sesión y nada más", async () => {
    const [cert] = await as<{ confirmed_kg: string; generator_name: string; resin_number: number }>(
      "anon",
      null,
      "select * from public.get_certificate($1)",
      [code],
    );
    expect(Number(cert.confirmed_kg)).toBe(35.5);
    expect(cert.generator_name).toBe("Comedor La Ceiba");
    expect(cert.resin_number).toBe(1);
    expect(await as("anon", null, "select * from public.get_certificate('RCA-2026-000000')")).toEqual([]);
    await expect(as("anon", null, "select * from public.nearby_lots(13.9946, -89.5597, 5000)")).rejects.toThrow(
      /permission denied/,
    );
    expect(await as("anon", null, "select * from public.profiles")).toEqual([]);
    await expect(as("anon", null, "select * from public.profile_impact")).rejects.toThrow(/permission denied/);
  });
});

describe("fotos en storage", () => {
  test("solo un comercio sube, y solo a su carpeta", async () => {
    await as("authenticated", GEN, "insert into storage.objects (bucket_id, name) values ('lot-photos', $1)", [
      `${GEN}/foto.jpg`,
    ]);
    await expect(
      as("authenticated", GEN, "insert into storage.objects (bucket_id, name) values ('lot-photos', $1)", [
        `${COL}/foto.jpg`,
      ]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as("authenticated", COL, "insert into storage.objects (bucket_id, name) values ('lot-photos', $1)", [
        `${COL}/foto.jpg`,
      ]),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("ajustes (migración 0600)", () => {
  const photo = (uid: string) => `https://abcdefgh.supabase.co/storage/v1/object/public/lot-photos/${uid}/foto.jpg`;
  const publishWithPhotos = (uid: string, urls: string[]) =>
    as("authenticated", uid, "select public.publish_lot('PET', 10, $1, $2, 'venta', $3)", [tomorrow(9), tomorrow(11), urls]);

  test("solo acepta fotos de la carpeta del propio comercio en el bucket", async () => {
    await expect(publishWithPhotos(GEN, [photo(GEN)])).resolves.toHaveLength(1);
    await expect(publishWithPhotos(GEN, [photo(GEN2)])).rejects.toThrow("Una de las fotos no es válida");
    await expect(publishWithPhotos(GEN, ["https://example.com/feo.jpg"])).rejects.toThrow("Una de las fotos no es válida");
  });

  test("kg que se redondean a cero dan un error en español", async () => {
    await expect(publish(GEN, "PET", 0.004)).rejects.toThrow(/kg estimados/);
  });

  test("confirmar dos veces el mismo retiro explica que ya está completado", async () => {
    const lotId = await publish(GEN, "PET", 20);
    const [r] = await as<{ reserve_lot: string }>("authenticated", COL, "select public.reserve_lot($1)", [lotId]);
    await as("authenticated", GEN, "select public.mark_delivered($1)", [r.reserve_lot]);
    await as("authenticated", COL, "select public.complete_pickup($1, 20, 'efectivo')", [r.reserve_lot]);
    await expect(as("authenticated", COL, "select public.complete_pickup($1, 20, 'efectivo')", [r.reserve_lot])).rejects.toThrow(
      "Este retiro ya está completado",
    );
  });

  test("un comercio borra sus propias fotos, no las de otro", async () => {
    await db.exec(`insert into storage.objects (bucket_id, name) values ('lot-photos', '${GEN}/borrar.jpg'), ('lot-photos', '${GEN2}/ajena.jpg')`);
    const mine = await as("authenticated", GEN, "delete from storage.objects where name = $1 returning name", [`${GEN}/borrar.jpg`]);
    expect(mine).toHaveLength(1);
    const other = await as("authenticated", GEN, "delete from storage.objects where name = $1 returning name", [`${GEN2}/ajena.jpg`]);
    expect(other).toHaveLength(0);
  });
});
