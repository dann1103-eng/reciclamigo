import type { SupabaseClient } from "@supabase/supabase-js";

import type { TipoValorizador } from "@/lib/domain/types";
import type { Database } from "@/types/database";

import { isUuid, viewableRole } from "./profile";

type Client = SupabaseClient<Database>;

/** Lo que cualquier usuario con sesión puede ver de otro perfil: nunca WhatsApp ni dirección (viven en profile_private). */
export type PublicProfile = {
  id: string;
  role: "generador" | "valorizador";
  displayName: string;
  orgType: string;
  municipality: string;
  zone: string;
  verified: boolean;
  tipoValorizador: TipoValorizador | null;
};

export type RatingComment = {
  id: string;
  stars: number;
  comment: string;
  createdAt: string;
  raterName: string;
};

/** null = el id no existe, está mal escrito o es de alcaldía o administración. */
export async function fetchPublicProfile(supabase: Client, id: string): Promise<PublicProfile | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, display_name, org_type, municipality, zone, verified, tipo_valorizador")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !viewableRole(data.role)) return null;
  return {
    id: data.id,
    role: data.role,
    displayName: data.display_name,
    orgType: data.org_type,
    municipality: data.municipality,
    zone: data.zone,
    verified: data.verified,
    tipoValorizador: data.tipo_valorizador,
  };
}

type RawRating = {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  rater: { display_name: string } | { display_name: string }[] | null;
};

// PostgREST devuelve la relación a uno como objeto, pero según la versión puede venir como arreglo.
const one = <T,>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null));

/** Las últimas calificaciones que traen comentario, con el nombre de quien calificó. */
export async function fetchRatingComments(supabase: Client, profileId: string, limit = 5): Promise<RatingComment[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select("id, stars, comment, created_at, rater:profiles!ratings_rater_id_fkey(display_name)")
    .eq("ratee_id", profileId)
    .not("comment", "is", null)
    .neq("comment", "")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data as unknown as RawRating[])
    .filter((r) => r.comment?.trim())
    .map((r) => ({
      id: r.id,
      stars: r.stars,
      comment: r.comment!.trim(),
      createdAt: r.created_at,
      raterName: one(r.rater)?.display_name ?? "Usuario de Reciclamigo",
    }));
}
