import type { Database } from "@/types/database";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type NearbyLot = Database["public"]["Functions"]["nearby_lots"]["Returns"][number];

export const RADIUS_OPTIONS = [1000, 3000, 5000] as const;
export type RadiusM = (typeof RADIUS_OPTIONS)[number];
export const DEFAULT_RADIUS: RadiusM = 3000;
