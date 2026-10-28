import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/shell/app-header";
import { AreaNav } from "@/components/shell/area-nav";
import { getSessionProfile } from "@/lib/auth";

export default async function AreasLayout({ children }: { children: ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/entrar");
  return (
    <>
      <AppHeader profile={profile} />
      <AreaNav role={profile.role} tipoValorizador={profile.tipoValorizador} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </>
  );
}
