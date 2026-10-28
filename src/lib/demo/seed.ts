import { randomBytes, randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { parseSettings } from "@/lib/domain/settings";
import type { Database } from "@/types/database";

import { buildSeedData, type SeedPerson } from "./seed-data";

export type SeedSummary = { users: number; lots: number; completedPickups: number };

type Admin = SupabaseClient<Database>;

const point = (p: { lat: number; lng: number }) => `SRID=4326;POINT(${p.lng} ${p.lat})`;

async function check<T extends { error: { message: string } | null }>(step: string, query: PromiseLike<T>) {
  const result = await query;
  if (result.error) throw new Error(`Seed (${step}): ${result.error.message}`);
  return result;
}

/** ¿La cuenta ya entra con esa contraseña? (cliente aparte: nunca mezclar sesión con el admin) */
async function passwordWorks(email: string, password: string): Promise<boolean> {
  const probe = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}

/**
 * Crea los usuarios que falten; a las cuentas demo les fija la contraseña DEMO_PASSWORD.
 * Solo la cambia si hace falta: cambiarla cierra todas las sesiones de esa cuenta, y
 * reiniciar el demo justo antes de presentar no puede sacar a quien ya entró.
 */
async function ensureUsers(admin: Admin, people: SeedPerson[], password: string) {
  const existing = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Seed (usuarios): ${error.message}`);
    data.users.forEach((u) => u.email && existing.set(u.email.toLowerCase(), u.id));
    if (data.users.length < 1000) break;
  }

  const ids: Record<string, string> = {};
  for (const person of people) {
    const id = existing.get(person.email);
    const userPassword = person.demo ? password : randomBytes(18).toString("base64url");
    if (id) {
      ids[person.key] = id;
      if (person.demo && !(await passwordWorks(person.email, password))) {
        const { error } = await admin.auth.admin.updateUserById(id, { password });
        if (error) throw new Error(`Seed (contraseña ${person.email}): ${error.message}`);
      }
      continue;
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: person.email,
      password: userPassword,
      email_confirm: true,
      user_metadata: { seed: true },
    });
    if (error) throw new Error(`Seed (crear ${person.email}): ${error.message}`);
    ids[person.key] = data.user.id;
  }
  return ids;
}

/**
 * Deja la base en el estado inicial del demo: perfiles sembrados, ~20 lotes publicados,
 * un retiro reservado y ~60 retiros completados con calificaciones. Borra TODOS los lotes
 * (y en cascada retiros y calificaciones). Es idempotente.
 */
export async function seedDemo(admin: Admin, opts: { password: string; now?: Date }): Promise<SeedSummary> {
  const now = opts.now ?? new Date();

  // Los precios de referencia vienen de la configuración (app_settings), igual que en la app.
  const { data: settingRows } = await check("configuración", admin.from("app_settings").select("key, value"));
  const settings = parseSettings(settingRows!);

  const data = buildSeedData(now, settings.refPriceUsdPerLb);
  const ids = await ensureUsers(admin, data.people, opts.password);
  const personByKey = new Map(data.people.map((p) => [p.key, p]));

  await check(
    "perfiles",
    admin.from("profiles").upsert(
      data.people.map((p) => ({
        id: ids[p.key],
        role: p.role,
        display_name: p.displayName,
        org_type: p.orgType,
        municipality: p.municipality,
        zone: p.zone,
        verified: p.verified,
        tipo_valorizador: p.tipoValorizador,
      })),
    ),
  );
  await check(
    "contacto",
    admin.from("profile_private").upsert(
      data.people
        .filter((p) => p.role !== "municipalidad" && p.role !== "administrador")
        .map((p) => ({ id: ids[p.key], whatsapp: p.whatsapp, address: p.address, location: point(p) })),
    ),
  );

  // Planes: solo los comercios marcados quedan con el Plan Trazabilidad vigente.
  await check("limpiar planes", admin.from("generator_plans").delete().not("profile_id", "is", null));
  const planHolders = data.people.filter((p) => p.plan);
  await check(
    "planes",
    admin.from("generator_plans").insert(
      planHolders.map((p) => ({
        profile_id: ids[p.key],
        plan: "trazabilidad" as const,
        started_at: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
        expires_at: new Date(now.getTime() + 335 * 86_400_000).toISOString(),
        source: "manual",
      })),
    ),
  );

  // Borra todos los lotes; retiros, calificaciones y comisiones caen en cascada. Los puntos, los
  // avisos en cola y los retiros programados no cuelgan de un lote, así que se limpian aparte.
  await check("limpiar lotes", admin.from("lots").delete().not("id", "is", null));
  await check("limpiar puntos", admin.from("points_ledger").delete().not("id", "is", null));
  await check("limpiar avisos", admin.from("notification_queue").delete().not("id", "is", null));
  await check("limpiar programados", admin.from("scheduled_pickups").delete().not("id", "is", null));

  const lotIds = Object.fromEntries(data.lots.map((l) => [l.key, randomUUID()]));
  await check(
    "lotes",
    admin.from("lots").insert(
      data.lots.map((l) => ({
        id: lotIds[l.key],
        generator_id: ids[l.generatorKey],
        polymer_code: l.polymerCode,
        estimated_lb: l.estimatedLb,
        photo_urls: l.photoUrls,
        pickup_from: l.pickupFrom,
        pickup_to: l.pickupTo,
        modality: l.modality,
        price_per_lb: l.pricePerLb,
        notes: l.notes,
        status: l.status,
        location: point(personByKey.get(l.generatorKey)!),
        created_at: l.createdAt,
      })),
    ),
  );

  const pickupIds = Object.fromEntries(data.pickups.map((p) => [p.lotKey, randomUUID()]));
  await check(
    "retiros",
    admin.from("pickups").insert(
      data.pickups.map((p) => ({
        id: pickupIds[p.lotKey],
        lot_id: lotIds[p.lotKey],
        collector_id: ids[p.collectorKey],
        reserved_at: p.reservedAt,
        delivered_at: p.deliveredAt,
        completed_at: p.completedAt,
        proposed_lb: p.proposedLb,
        proposed_price_per_lb: p.finalPricePerLb,
        proposed_at: p.deliveredAt,
        confirmed_lb: p.confirmedLb,
        final_price_per_lb: p.finalPricePerLb,
        total_amount: p.totalAmount,
        payment_method: p.paymentMethod,
        voucher_code: p.voucherCode,
      })),
    ),
  );

  await check(
    "calificaciones",
    admin.from("ratings").insert(
      data.ratings.map((r) => ({
        pickup_id: pickupIds[r.lotKey],
        rater_id: ids[r.raterKey],
        ratee_id: ids[r.rateeKey],
        stars: r.stars,
        comment: r.comment,
        created_at: r.createdAt,
      })),
    ),
  );

  await check(
    "comisiones",
    admin.from("commissions").insert(
      data.commissions.map((c) => ({
        pickup_id: pickupIds[c.lotKey],
        collector_id: ids[c.collectorKey],
        gross_amount: c.grossAmount,
        pct: c.pct,
        amount: c.amount,
        status: c.status,
        created_at: c.createdAt,
        paid_at: c.paidAt,
      })),
    ),
  );

  await check(
    "puntos",
    admin.from("points_ledger").insert(
      data.points.map((pt) => ({
        profile_id: ids[pt.personKey],
        kind: "ganado" as const,
        points: pt.points,
        remaining: pt.points,
        pickup_id: pickupIds[pt.lotKey],
        expires_at: pt.expiresAt,
        note: "Entrega confirmada",
        created_at: pt.createdAt,
      })),
    ),
  );

  return {
    users: data.people.length,
    lots: data.lots.length,
    completedPickups: data.pickups.filter((p) => p.completedAt).length,
  };
}
