import type { PolymerCode } from "@/lib/domain/polymers";
import type { LotStatus, Modality, PaymentMethod, UserRole } from "@/lib/domain/types";

import { DEMO_ACCOUNTS, type DemoRole } from "./accounts";

// Datos de demostración: nombres ficticios, coordenadas realistas en Santa Ana y San Salvador.
// Todo es determinista (PRNG con semilla fija) y relativo a `now`, para que el tablero
// siempre muestre los últimos 6 meses.

export type SeedPerson = {
  key: string;
  email: string;
  demo?: DemoRole;
  role: UserRole;
  displayName: string;
  orgType: string;
  municipality: "Santa Ana" | "San Salvador";
  zone: string;
  verified: boolean;
  whatsapp: string | null;
  address: string | null;
  lat: number;
  lng: number;
};

export type SeedLot = {
  key: string;
  generatorKey: string;
  polymerCode: PolymerCode;
  estimatedKg: number;
  modality: Modality;
  pricePerKg: number;
  status: LotStatus;
  pickupFrom: string;
  pickupTo: string;
  createdAt: string;
  photoUrls: string[];
  notes: string | null;
};

export type SeedPickup = {
  lotKey: string;
  collectorKey: string;
  reservedAt: string;
  deliveredAt: string | null;
  completedAt: string | null;
  confirmedKg: number | null;
  totalAmount: number | null;
  paymentMethod: PaymentMethod | null;
  certificateCode: string | null;
};

export type SeedRating = {
  lotKey: string;
  raterKey: string;
  rateeKey: string;
  stars: number;
  comment: string | null;
  createdAt: string;
};

export type SeedData = { people: SeedPerson[]; lots: SeedLot[]; pickups: SeedPickup[]; ratings: SeedRating[] };

type PersonInput = Omit<SeedPerson, "email">;

const seedEmail = (key: string) => `${key}@seed.reciclamigo.app`;

// Lotes publicados por comercio: reparte pines en los radios de 1, 3 y 5 km de Don José.
const PUBLISHED_PER_GENERATOR: Record<string, number> = {
  "cafeteria-santaneca": 2, // ~0.6 km
  "panaderia-san-miguelito": 2, // ~0.8 km
  "hotel-colonial": 2, // ~1.4 km
  "comedor-la-ceiba": 1, // ~1.5 km (cuenta demo)
  "pupuseria-dona-tere": 2, // ~1.8 km
  "super-la-cosecha": 2, // ~2.1 km
  "colegio-nuevo-amanecer": 2, // ~3.5 km
  "comedor-el-tecolote": 2, // ~3.9 km
  "hotel-brisas": 1,
  "oficinas-maquilishuat": 1,
  "restaurante-la-ceibita": 1,
  "comedor-los-planes": 1,
};

const PEOPLE: PersonInput[] = [
  // Cuentas demo
  { key: "comedor-la-ceiba", demo: "comercio", role: "generador", displayName: "Comedor La Ceiba", orgType: "Restaurante", municipality: "Santa Ana", zone: "Centro", verified: true, whatsapp: "50370000101", address: "2a Calle Poniente #14, Santa Ana", lat: 13.9946, lng: -89.5597 },
  { key: "don-jose", demo: "reciclador", role: "valorizador", displayName: "Don José", orgType: "Reciclador de base", municipality: "Santa Ana", zone: "El Palmar", verified: true, whatsapp: "50370000201", address: "Colonia El Palmar, pasaje 3, Santa Ana", lat: 14.0066, lng: -89.553 },
  { key: "alcaldia-santa-ana", demo: "alcaldia", role: "municipalidad", displayName: "Alcaldía de Santa Ana", orgType: "Alcaldía", municipality: "Santa Ana", zone: "Centro", verified: true, whatsapp: null, address: null, lat: 13.9942, lng: -89.5594 },

  // Comercios en Santa Ana
  { key: "cafeteria-santaneca", role: "generador", displayName: "Cafetería La Santaneca", orgType: "Restaurante", municipality: "Santa Ana", zone: "El Palmar", verified: false, whatsapp: "50370000102", address: "Avenida Fray Felipe de Jesús Moraga, Santa Ana", lat: 14.011, lng: -89.556 },
  { key: "panaderia-san-miguelito", role: "generador", displayName: "Panadería San Miguelito", orgType: "Comercio", municipality: "Santa Ana", zone: "San Miguelito", verified: false, whatsapp: "50370000103", address: "Barrio San Miguelito, Santa Ana", lat: 14.002, lng: -89.547 },
  { key: "hotel-colonial", role: "generador", displayName: "Hotel Colonial del Parque", orgType: "Hotel", municipality: "Santa Ana", zone: "Centro", verified: true, whatsapp: "50370000104", address: "Frente al parque, Santa Ana", lat: 13.9955, lng: -89.5585 },
  { key: "pupuseria-dona-tere", role: "generador", displayName: "Pupusería Doña Tere", orgType: "Restaurante", municipality: "Santa Ana", zone: "Santa Lucía", verified: false, whatsapp: "50370000105", address: "Barrio Santa Lucía, Santa Ana", lat: 13.993, lng: -89.562 },
  { key: "super-la-cosecha", role: "generador", displayName: "Supermercado La Cosecha", orgType: "Comercio", municipality: "Santa Ana", zone: "Avenida Independencia", verified: true, whatsapp: "50370000106", address: "Avenida Independencia Sur, Santa Ana", lat: 13.988, lng: -89.548 },
  { key: "colegio-nuevo-amanecer", role: "generador", displayName: "Colegio Nuevo Amanecer", orgType: "Colegio", municipality: "Santa Ana", zone: "Colonia IVU", verified: false, whatsapp: "50370000107", address: "Colonia IVU, Santa Ana", lat: 14.035, lng: -89.54 },
  { key: "comedor-el-tecolote", role: "generador", displayName: "Comedor El Tecolote", orgType: "Comedor", municipality: "Santa Ana", zone: "San Lorenzo", verified: false, whatsapp: "50370000108", address: "Barrio San Lorenzo, Santa Ana", lat: 13.979, lng: -89.575 },

  // Comercios en San Salvador
  { key: "hotel-brisas", role: "generador", displayName: "Hotel Brisas del Boulevard", orgType: "Hotel", municipality: "San Salvador", zone: "Escalón", verified: true, whatsapp: "50370000109", address: "Colonia Escalón, San Salvador", lat: 13.7034, lng: -89.2425 },
  { key: "oficinas-maquilishuat", role: "generador", displayName: "Oficinas Grupo Maquilishuat", orgType: "Oficina", municipality: "San Salvador", zone: "San Benito", verified: false, whatsapp: "50370000110", address: "Colonia San Benito, San Salvador", lat: 13.699, lng: -89.24 },
  { key: "restaurante-la-ceibita", role: "generador", displayName: "Restaurante La Ceibita", orgType: "Restaurante", municipality: "San Salvador", zone: "Colonia Flor Blanca", verified: false, whatsapp: "50370000111", address: "Colonia Flor Blanca, San Salvador", lat: 13.6985, lng: -89.2125 },
  { key: "comedor-los-planes", role: "generador", displayName: "Comedor Los Planes", orgType: "Comedor", municipality: "San Salvador", zone: "Centro Histórico", verified: false, whatsapp: "50370000112", address: "Centro Histórico, San Salvador", lat: 13.6976, lng: -89.1914 },

  // Recicladores y centros de acopio en Santa Ana
  { key: "acopio-el-progreso", role: "valorizador", displayName: "Centro de Acopio El Progreso", orgType: "Centro de acopio", municipality: "Santa Ana", zone: "El Progreso", verified: true, whatsapp: "50370000202", address: "Colonia El Progreso, Santa Ana", lat: 13.982, lng: -89.552 },
  { key: "dona-marta", role: "valorizador", displayName: "Doña Marta", orgType: "Recicladora de base", municipality: "Santa Ana", zone: "Santa Bárbara", verified: true, whatsapp: "50370000203", address: "Barrio Santa Bárbara, Santa Ana", lat: 13.998, lng: -89.566 },
  { key: "reciclajes-lamatepec", role: "valorizador", displayName: "Reciclajes Lamatepec", orgType: "Centro de acopio", municipality: "Santa Ana", zone: "Carretera a Chalchuapa", verified: false, whatsapp: "50370000204", address: "Carretera a Chalchuapa km 2, Santa Ana", lat: 13.99, lng: -89.585 },

  // Recicladores y centros de acopio en San Salvador
  { key: "acopio-mejicanos", role: "valorizador", displayName: "Centro de Acopio Mejicanos", orgType: "Centro de acopio", municipality: "San Salvador", zone: "Mejicanos", verified: true, whatsapp: "50370000205", address: "Mejicanos, San Salvador", lat: 13.7403, lng: -89.2131 },
  { key: "don-chepe", role: "valorizador", displayName: "Don Chepe", orgType: "Reciclador de base", municipality: "San Salvador", zone: "Centro Histórico", verified: true, whatsapp: "50370000206", address: "Centro Histórico, San Salvador", lat: 13.6965, lng: -89.1895 },
  { key: "recuperadora-metropolitana", role: "valorizador", displayName: "Recuperadora Metropolitana", orgType: "Transformador de resina", municipality: "San Salvador", zone: "Soyapango", verified: true, whatsapp: "50370000207", address: "Zona industrial, Soyapango", lat: 13.7105, lng: -89.1512 },
  { key: "dona-rosa", role: "valorizador", displayName: "Doña Rosa", orgType: "Recicladora de base", municipality: "San Salvador", zone: "San Jacinto", verified: false, whatsapp: "50370000208", address: "Barrio San Jacinto, San Salvador", lat: 13.6855, lng: -89.1945 },
];

const POLYMER_WEIGHTS: [PolymerCode, number][] = [
  ["PET", 0.35],
  ["HDPE", 0.2],
  ["PP", 0.15],
  ["LDPE", 0.15],
  ["PS", 0.15],
];
const MODALITY_WEIGHTS: [Modality, number][] = [
  ["venta", 0.75],
  ["donacion", 0.15],
  ["trueque", 0.1],
];
const PAYMENT_WEIGHTS: [PaymentMethod, number][] = [
  ["efectivo", 0.6],
  ["transferencia", 0.25],
  ["chivo_wallet", 0.15],
];
const STAR_WEIGHTS: [number, number][] = [
  [5, 0.55],
  [4, 0.35],
  [3, 0.1],
];
const LOT_NOTES = [
  "Botellas lavadas y aplastadas, en costales.",
  "Material separado por color.",
  "Está en la bodega de atrás, preguntar por el encargado.",
  "Pacas amarradas, listas para cargar.",
  null,
  null,
];
const COMMENTS_FOR_COLLECTOR = [
  "Llegó puntual y dejó todo limpio.",
  "Muy amable, recomendado.",
  "Pesó el material frente a nosotros.",
  "Avisó por WhatsApp antes de llegar.",
];
const COMMENTS_FOR_GENERATOR = [
  "El material venía bien separado.",
  "Todo listo a la hora acordada.",
  "Buen trato, volvería a recoger.",
  "Hubo que esperar un poco, pero todo bien.",
];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SV_OFFSET = 6 * HOUR; // El Salvador: UTC-6, sin horario de verano

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number, decimals: number) => Math.round(n * 10 ** decimals) / 10 ** decimals;

export function buildSeedData(now: Date, prices: Record<PolymerCode, number>): SeedData {
  const rand = mulberry32(20261017);
  const between = (min: number, max: number) => min + rand() * (max - min);
  const int = (min: number, max: number) => Math.floor(between(min, max + 1));
  const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
  const weighted = <T>(pairs: [T, number][]) => {
    let r = rand();
    for (const [value, weight] of pairs) {
      if ((r -= weight) <= 0) return value;
    }
    return pairs[pairs.length - 1][0];
  };

  // Medianoche de hoy en El Salvador, expresada en UTC.
  const svNow = new Date(now.getTime() - SV_OFFSET);
  const svMidnight = Date.UTC(svNow.getUTCFullYear(), svNow.getUTCMonth(), svNow.getUTCDate()) + SV_OFFSET;
  const svAt = (dayOffset: number, hour: number, minute = 0) =>
    new Date(svMidnight + dayOffset * DAY + hour * HOUR + minute * 60_000);

  const people: SeedPerson[] = PEOPLE.map((p) => ({
    ...p,
    email: p.demo ? DEMO_ACCOUNTS[p.demo].email : seedEmail(p.key),
  }));
  const byKey = new Map(people.map((p) => [p.key, p]));
  const generators = people.filter((p) => p.role === "generador");
  const collectorsIn = (municipality: string) =>
    people.filter((p) => p.role === "valorizador" && p.municipality === municipality);

  const lots: SeedLot[] = [];
  const pickups: SeedPickup[] = [];
  const ratings: SeedRating[] = [];

  const newLot = (
    generatorKey: string,
    status: LotStatus,
    pickupFrom: Date,
    createdAt: Date,
    kg = round(between(15, 180), 1),
  ): SeedLot => {
    const polymerCode = weighted(POLYMER_WEIGHTS);
    const modality = weighted(MODALITY_WEIGHTS);
    const lot: SeedLot = {
      key: `lote-${String(lots.length + 1).padStart(3, "0")}`,
      generatorKey,
      polymerCode,
      estimatedKg: kg,
      modality,
      pricePerKg: modality === "venta" ? prices[polymerCode] : 0,
      status,
      pickupFrom: pickupFrom.toISOString(),
      pickupTo: new Date(pickupFrom.getTime() + 2 * HOUR).toISOString(),
      createdAt: createdAt.toISOString(),
      photoUrls: [`/seed/${polymerCode.toLowerCase()}.svg`],
      notes: pick(LOT_NOTES),
    };
    lots.push(lot);
    return lot;
  };

  // 1. Lotes publicados, con ventana de retiro en los próximos 1 a 3 días.
  for (const [generatorKey, count] of Object.entries(PUBLISHED_PER_GENERATOR)) {
    for (let i = 0; i < count; i++) {
      const from = svAt(int(1, 3), int(8, 14));
      newLot(generatorKey, "publicado", from, new Date(now.getTime() - int(1, 30) * HOUR));
    }
  }

  // 2. Un lote ya reservado por Don José, para que "Mis retiros" no arranque vacío.
  const reserved = newLot("hotel-colonial", "reservado", svAt(1, 9), new Date(now.getTime() - 20 * HOUR), 60);
  pickups.push({
    lotKey: reserved.key,
    collectorKey: "don-jose",
    reservedAt: new Date(now.getTime() - 3 * HOUR).toISOString(),
    deliveredAt: null,
    completedAt: null,
    confirmedKg: null,
    totalAmount: null,
    paymentMethod: null,
    certificateCode: null,
  });

  // 3. Historial: 60 retiros completados en los últimos ~6 meses.
  const codes = new Set<string>();
  const otherGenerators = generators.filter((g) => !g.demo);
  for (let i = 0; i < 60; i++) {
    // Los primeros 8 son del comercio demo, para que su tablero tenga historia.
    const generator = i < 8 ? byKey.get("comedor-la-ceiba")! : pick(otherGenerators);
    const localCollectors = collectorsIn(generator.municipality);
    const collector =
      generator.municipality === "Santa Ana" && rand() < 0.5 ? byKey.get("don-jose")! : pick(localCollectors);

    const completedAt = svAt(-int(1, 178), int(9, 16), int(0, 59));
    const deliveredAt = new Date(completedAt.getTime() - int(10, 90) * 60_000);
    const reservedAt = new Date(completedAt.getTime() - int(1, 3) * DAY);
    const confirmedKg = round(10 + 290 * rand() ** 2, 1);
    const estimatedKg = round(Math.min(10_000, confirmedKg * between(0.9, 1.15)), 1);
    const lot = newLot(
      generator.key,
      "completado",
      new Date(deliveredAt.getTime() - 30 * 60_000),
      new Date(reservedAt.getTime() - int(2, 20) * HOUR),
      estimatedKg,
    );

    let code: string;
    do {
      const hex = Math.floor(rand() * 0xffffff).toString(16).toUpperCase().padStart(6, "0");
      code = `RCA-${new Date(completedAt.getTime() - SV_OFFSET).getUTCFullYear()}-${hex}`;
    } while (codes.has(code));
    codes.add(code);

    pickups.push({
      lotKey: lot.key,
      collectorKey: collector.key,
      reservedAt: reservedAt.toISOString(),
      deliveredAt: deliveredAt.toISOString(),
      completedAt: completedAt.toISOString(),
      confirmedKg,
      totalAmount: round(confirmedKg * lot.pricePerKg, 2),
      paymentMethod: lot.modality === "venta" ? weighted(PAYMENT_WEIGHTS) : "efectivo",
      certificateCode: code,
    });

    const ratedAt = new Date(completedAt.getTime() + int(1, 12) * HOUR).toISOString();
    ratings.push(
      {
        lotKey: lot.key,
        raterKey: generator.key,
        rateeKey: collector.key,
        stars: weighted(STAR_WEIGHTS),
        comment: rand() < 0.4 ? pick(COMMENTS_FOR_COLLECTOR) : null,
        createdAt: ratedAt,
      },
      {
        lotKey: lot.key,
        raterKey: collector.key,
        rateeKey: generator.key,
        stars: weighted(STAR_WEIGHTS),
        comment: rand() < 0.4 ? pick(COMMENTS_FOR_GENERATOR) : null,
        createdAt: ratedAt,
      },
    );
  }

  return { people, lots, pickups, ratings };
}
