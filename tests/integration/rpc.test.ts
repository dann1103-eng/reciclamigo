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

async function publish(lb = 90, polymer = "PET", modality: "venta" | "trueque" | "donacion" = "venta") {
  const { data, error } = await clients.comercio.rpc("publish_lot", {
    p_polymer_code: polymer,
    p_estimated_lb: lb,
    p_pickup_from: inHours(20),
    p_pickup_to: inHours(22),
    p_modality: modality,
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
  let voucherCode: string;

  test("nearby_lots respeta el radio y el filtro de polímero, y devuelve libras", async () => {
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
    expect(at3[0].estimated_lb).toBeGreaterThan(0);
    const pet = await near(5000, ["PET"]);
    expect(pet.length).toBeGreaterThan(0);
    expect(pet.every((l) => l.polymer_code === "PET")).toBe(true);
  });

  test("publish_lot rechaza libras inválidas y ventana invertida", async () => {
    await expect(publish(0)).rejects.toThrow(/libras estimadas/);
    await expect(publish(22001)).rejects.toThrow(/libras estimadas/);
    const { error } = await clients.comercio.rpc("publish_lot", {
      p_polymer_code: "PET",
      p_estimated_lb: 10,
      p_pickup_from: inHours(22),
      p_pickup_to: inHours(20),
      p_modality: "venta",
    });
    expect(error?.message).toMatch(/ventana de retiro/);
  });

  test("el precio de referencia sale de la configuración (PET $0.09/lb)", async () => {
    const lotId = await publish(50);
    const { data } = await admin.from("lots").select("price_per_lb").eq("id", lotId).single();
    const { data: setting } = await admin.from("app_settings").select("value").eq("key", "precio_ref_pet_usd_lb").single();
    expect(Number(data!.price_per_lb)).toBe(Number(setting!.value));
  });

  test("flujo completo con confirmación bilateral", async () => {
    const lotId = await publish(100);
    const pickupId = await reserve(lotId);

    // Antes de que el comercio registre la entrega, el reciclador no puede confirmar nada.
    const early = await clients.reciclador.rpc("complete_pickup", { p_pickup_id: pickupId, p_accept: true });
    expect(early.error?.message).toMatch(/todavía no registra la entrega/);

    const proposed = await clients.comercio.rpc("propose_delivery", { p_pickup_id: pickupId, p_lb: 100 });
    expect(proposed.error).toBeNull();
    const { data: code, error } = await clients.reciclador.rpc("complete_pickup", {
      p_pickup_id: pickupId,
      p_accept: true,
      p_payment_method: "efectivo",
    });
    expect(error).toBeNull();
    expect(code).toMatch(/^RCA-\d{4}-[0-9A-F]{6}$/);
    voucherCode = code!;
    const { data: pickup } = await admin.from("pickups").select("total_amount, confirmed_lb, was_corrected").eq("id", pickupId).single();
    expect(Number(pickup!.confirmed_lb)).toBe(100);
    expect(Number(pickup!.total_amount)).toBe(9); // 100 lb × $0.09
    expect(pickup!.was_corrected).toBe(false);
  });

  test("el reciclador puede corregir el peso y manda lo corregido", async () => {
    const lotId = await publish(100);
    const pickupId = await reserve(lotId);
    await clients.comercio.rpc("propose_delivery", { p_pickup_id: pickupId, p_lb: 100 });
    const { error } = await clients.reciclador.rpc("complete_pickup", {
      p_pickup_id: pickupId,
      p_accept: false,
      p_confirmed_lb: 95,
      p_payment_method: "efectivo",
    });
    expect(error).toBeNull();
    const { data } = await admin.from("pickups").select("confirmed_lb, was_corrected").eq("id", pickupId).single();
    expect(Number(data!.confirmed_lb)).toBe(95);
    expect(data!.was_corrected).toBe(true);
  });

  test("segunda reserva falla", async () => {
    const lotId = await publish(30);
    await reserve(lotId);
    await expect(reserve(lotId)).rejects.toThrow("El lote ya no está disponible");
  });

  test("liberar una reserva vuelve a publicar el lote", async () => {
    const lotId = await publish(25);
    const pickupId = await reserve(lotId);
    const released = await clients.comercio.rpc("release_reservation", { p_pickup_id: pickupId });
    expect(released.error).toBeNull();
    const { data } = await admin.from("lots").select("status").eq("id", lotId).single();
    expect(data!.status).toBe("publicado");
    await expect(reserve(lotId)).resolves.toBeTruthy();
  });

  test("transiciones inválidas fallan", async () => {
    const lotId = await publish(26);
    const pickupId = await reserve(lotId);
    const notOwner = await clients.reciclador.rpc("propose_delivery", { p_pickup_id: pickupId, p_lb: 26 });
    expect(notOwner.error?.message).toMatch(/Solo el comercio/);
  });

  test("publish_lot rechaza un tipo de plástico desconocido", async () => {
    await expect(publish(10, "PVC")).rejects.toThrow("Tipo de plástico desconocido");
  });

  test("alcaldía no opera ni lee datos privados", async () => {
    const mun = clients.alcaldia;
    const lotId = await publish(8);
    const pickupId = await reserve(lotId);
    const pub = await mun.rpc("publish_lot", {
      p_polymer_code: "PET",
      p_estimated_lb: 10,
      p_pickup_from: inHours(20),
      p_pickup_to: inHours(22),
      p_modality: "venta",
    });
    expect(pub.error?.message).toMatch(/Solo los comercios/);
    const res = await mun.rpc("reserve_lot", { p_lot_id: lotId });
    expect(res.error?.message).toMatch(/Solo los recicladores/);
    const proposed = await mun.rpc("propose_delivery", { p_pickup_id: pickupId, p_lb: 8 });
    expect(proposed.error?.message).toMatch(/Solo el comercio/);
    const completed = await mun.rpc("complete_pickup", { p_pickup_id: pickupId, p_accept: true });
    expect(completed.error?.message).toMatch(/Solo el reciclador/);
    const rate = await mun.rpc("rate_pickup", { p_pickup_id: pickupId, p_stars: 5 });
    expect(rate.error?.message).toMatch(/Solo comercios y recicladores/);
    expect((await mun.from("lots").select("id")).data).toEqual([]);
    expect((await mun.from("profile_private").select("id")).data).toEqual([]);
    const report = await mun.from("impact_monthly").select("completed_lb");
    expect(report.error).toBeNull();
    expect(report.data!.length).toBeGreaterThan(0);
  });

  test("solo el administrador cambia la configuración y respeta el rango de la comisión", async () => {
    const denied = await clients.comercio.rpc("set_setting", { p_key: "lotes_gratis_por_mes", p_value: 99 });
    expect(denied.error?.message).toMatch(/Solo el administrador/);
    const tooHigh = await clients.admin.rpc("set_setting", { p_key: "comision_volumen_pct", p_value: 5 });
    expect(tooHigh.error?.message).toMatch(/máximo es 4/);
  });

  test("get_voucher funciona sin sesión", async () => {
    const { data, error } = await newClient().rpc("get_voucher", { p_code: voucherCode });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(Number(data![0].confirmed_lb)).toBe(100);
  });

  test("/demo/reset exige token", async () => {
    const noToken = await resetDemo(new Request("http://localhost/demo/reset", { method: "POST" }));
    expect(noToken.status).toBe(401);
    const badToken = await resetDemo(new Request("http://localhost/demo/reset?token=malo", { method: "POST" }));
    expect(badToken.status).toBe(401);
  });
});
