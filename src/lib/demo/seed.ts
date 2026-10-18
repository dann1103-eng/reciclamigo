import { randomBytes, randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PolymerCode } from "@/lib/domain/polymers";
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

/** Crea los usuarios que falten; a las cuentas demo les fija la contraseña DEMO_PASSWORD. */
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
      if (person.demo) {
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

  const { data: polymers } = await check("polímeros", admin.from("polymers").select("code, price_per_kg"));
  const prices = Object.fromEntries(polymers!.map((p) => [p.code, Number(p.price_per_kg)])) as Record<PolymerCode, number>;

  const data = buildSeedData(now, prices);
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
      })),
    ),
  );
  await check(
    "contacto",
    admin.from("profile_private").upsert(
      data.people
        .filter((p) => p.role !== "municipalidad")
        .map((p) => ({ id: ids[p.key], whatsapp: p.whatsapp, address: p.address, location: point(p) })),
    ),
  );

  // Borra todos los lotes; retiros y calificaciones caen en cascada.
  await check("limpiar lotes", admin.from("lots").delete().not("id", "is", null));

  const lotIds = Object.fromEntries(data.lots.map((l) => [l.key, randomUUID()]));
  await check(
    "lotes",
    admin.from("lots").insert(
      data.lots.map((l) => ({
        id: lotIds[l.key],
        generator_id: ids[l.generatorKey],
        polymer_code: l.polymerCode,
        estimated_kg: l.estimatedKg,
        photo_urls: l.photoUrls,
        pickup_from: l.pickupFrom,
        pickup_to: l.pickupTo,
        modality: l.modality,
        price_per_kg: l.pricePerKg,
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
        confirmed_kg: p.confirmedKg,
        total_amount: p.totalAmount,
        payment_method: p.paymentMethod,
        certificate_code: p.certificateCode,
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

  return {
    users: data.people.length,
    lots: data.lots.length,
    completedPickups: data.pickups.filter((p) => p.completedAt).length,
  };
}
