import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { POST as resetDemo } from "@/app/demo/reset/route";
import { DEMO_ACCOUNTS, type DemoRole } from "@/lib/demo/accounts";
import { parsePoint } from "@/lib/geo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

// Corre contra el proyecto Supabase de .env.local, con los datos de `npm run seed`.
// Crea sus propios lotes y los borra al final.

type Client = SupabaseClient<Database>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const password = process.env.DEMO_PASSWORD!;

const newClient = (): Client => createClient<Database>(url, anonKey, { auth: { persistSession: false } });

const clients = {} as Record<DemoRole, Client>;
const createdLots: string[] = [];
let admin: Client;
let collectorPoint: { lat: number; lng: number };

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

async function publish(kg = 40, polymer = "PET") {
  const { data, error } = await clients.comercio.rpc("publish_lot", {
    p_polymer_code: polymer,
    p_estimated_kg: kg,
    p_pickup_from: inHours(20),
    p_pickup_to: inHours(22),
    p_modality: "venta",
  });
  if (error) throw new Error(error.message);
  createdLots.push(data);
  return data;
}

async function reserve(lotId: string) {
  const { data, error } = await clients.reciclador.rpc("reserve_lot", { p_lot_id: lotId });
  if (error) throw new Error(error.message);
  return data;
}

beforeAll(async () => {
  admin = createAdminClient();
  for (const role of Object.keys(DEMO_ACCOUNTS) as DemoRole[]) {
    const client = newClient();
    const { error } = await client.auth.signInWithPassword({ email: DEMO_ACCOUNTS[role].email, password });
    if (error) throw new Error(`No se pudo iniciar sesión como ${role}: ${error.message}. ¿Corriste npm run seed?`);
    clients[role] = client;
  }
  const { data: me } = await clients.reciclador.auth.getUser();
  const { data: point, error: pointError } = await admin
    .from("profile_private")
    .select("location")
    .eq("id", me.user!.id)
    .single();
  if (pointError) throw new Error(pointError.message);
  const parsed = parsePoint(point.location);
  if (!parsed) throw new Error("Don José no tiene ubicación");
  collectorPoint = parsed;
});

afterAll(async () => {
  if (createdLots.length) await admin.from("lots").delete().in("id", createdLots);
});

describe("RPC contra Supabase", () => {
  let completedCode: string;

  test("nearby_lots respeta el radio y el filtro de polímero", async () => {
    const near = async (radius: number, polymers: string[] | null = null) => {
      const { data, error } = await clients.reciclador.rpc("nearby_lots", {
        p_lat: collectorPoint.lat,
        p_lng: collectorPoint.lng,
        p_radius_m: radius,
        p_polymers: polymers,
      });
      if (error) throw new Error(error.message);
      return data;
    };
    const at1 = await near(1000);
    const at3 = await near(3000);
    expect(at3.length).toBeGreaterThanOrEqual(8);
    expect(at1.every((l) => at3.some((m) => m.id === l.id))).toBe(true);
    expect(at3.every((l) => l.distance_m <= 3000)).toBe(true);
    const pet = await near(5000, ["PET"]);
    expect(pet.length).toBeGreaterThan(0);
    expect(pet.every((l) => l.polymer_code === "PET")).toBe(true);
  });

  test("publish_lot rechaza kg inválidos y ventana invertida", async () => {
    await expect(publish(0)).rejects.toThrow(/kg estimados/);
    await expect(publish(10001)).rejects.toThrow(/kg estimados/);
    const { error } = await clients.comercio.rpc("publish_lot", {
      p_polymer_code: "PET",
      p_estimated_kg: 10,
      p_pickup_from: inHours(22),
      p_pickup_to: inHours(20),
      p_modality: "venta",
    });
    expect(error?.message).toMatch(/ventana de retiro/);
  });

  test("flujo completo", async () => {
    const lotId = await publish(40);
    const pickupId = await reserve(lotId);
    const delivered = await clients.comercio.rpc("mark_delivered", { p_pickup_id: pickupId });
    expect(delivered.error).toBeNull();
    const { data: code, error } = await clients.reciclador.rpc("complete_pickup", {
      p_pickup_id: pickupId,
      p_confirmed_kg: 35.5,
      p_payment_method: "efectivo",
    });
    expect(error).toBeNull();
    expect(code).toMatch(/^RCA-\d{4}-[0-9A-F]{6}$/);
    completedCode = code!;
    const { data: pickup } = await admin.from("pickups").select("total_amount").eq("id", pickupId).single();
    expect(Number(pickup!.total_amount)).toBe(7.1); // 35.5 kg × $0.20
  });

  test("segunda reserva falla", async () => {
    const lotId = await publish(15);
    await reserve(lotId);
    await expect(reserve(lotId)).rejects.toThrow("El lote ya no está disponible");
  });

  test("transiciones inválidas fallan", async () => {
    const lotId = await publish(12);
    const pickupId = await reserve(lotId);
    const early = await clients.reciclador.rpc("complete_pickup", {
      p_pickup_id: pickupId,
      p_confirmed_kg: 12,
      p_payment_method: "efectivo",
    });
    expect(early.error?.message).toMatch(/todavía no marca la entrega/);
    const notOwner = await clients.reciclador.rpc("mark_delivered", { p_pickup_id: pickupId });
    expect(notOwner.error?.message).toMatch(/Solo el comercio/);
  });

  test("alcaldía no opera ni lee datos privados", async () => {
    const mun = clients.alcaldia;
    const pub = await mun.rpc("publish_lot", {
      p_polymer_code: "PET",
      p_estimated_kg: 10,
      p_pickup_from: inHours(20),
      p_pickup_to: inHours(22),
      p_modality: "venta",
    });
    expect(pub.error?.message).toMatch(/Solo los comercios/);
    const res = await mun.rpc("reserve_lot", { p_lot_id: createdLots[0] });
    expect(res.error?.message).toMatch(/Solo los recicladores/);
    const rate = await mun.rpc("rate_pickup", { p_pickup_id: createdLots[0], p_stars: 5 });
    expect(rate.error?.message).toMatch(/Solo comercios y recicladores/);
    expect((await mun.from("lots").select("id")).data).toEqual([]);
    expect((await mun.from("profile_private").select("id")).data).toEqual([]);
    const report = await mun.from("impact_monthly").select("completed_kg");
    expect(report.error).toBeNull();
    expect(report.data!.length).toBeGreaterThan(0);
  });

  test("get_certificate funciona sin sesión", async () => {
    const { data, error } = await newClient().rpc("get_certificate", { p_code: completedCode });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(Number(data![0].confirmed_kg)).toBe(35.5);
  });

  test("/demo/reset exige token", async () => {
    const noToken = await resetDemo(new Request("http://localhost/demo/reset", { method: "POST" }));
    expect(noToken.status).toBe(401);
    const badToken = await resetDemo(new Request("http://localhost/demo/reset?token=malo", { method: "POST" }));
    expect(badToken.status).toBe(401);
  });
});
