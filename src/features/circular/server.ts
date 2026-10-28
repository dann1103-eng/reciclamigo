import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { loadCircular } from "./load";

/** Insignia pública por slug, memorizada por request (la usan la página y sus metadatos). */
export const getCircular = cache(async (slug: string) => loadCircular(await createClient(), slug));
