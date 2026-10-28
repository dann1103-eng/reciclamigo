import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProfileView } from "@/features/reputation/components/profile-view";
import { fetchPublicProfile, fetchRatingComments } from "@/features/reputation/load";
import { getSessionProfile, ROLE_HOME } from "@/lib/auth";
import { getProfileImpact } from "@/lib/data/profile-impact";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Perfil" };

/** Perfil de un comercio o reciclador. Cualquier usuario con sesión lo ve; el detalle del lote en el mapa enlaza aquí. */
export default async function PerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionProfile();
  if (!session) redirect("/entrar");

  const supabase = await createClient();
  const profile = await fetchPublicProfile(supabase, id);
  if (!profile) notFound();

  const [impact, comments] = await Promise.all([getProfileImpact(supabase, id), fetchRatingComments(supabase, id)]);
  return (
    <ProfileView
      profile={profile}
      impact={impact}
      comments={comments}
      isSelf={session.id === profile.id}
      backHref={ROLE_HOME[session.role]}
    />
  );
}
