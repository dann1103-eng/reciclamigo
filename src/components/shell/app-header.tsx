import Link from "next/link";
import { LogOut } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ROLE_HOME, type SessionProfile } from "@/lib/auth";
import type { DemoRole } from "@/lib/demo/accounts";
import { signOut } from "@/lib/demo/actions";
import type { UserRole } from "@/lib/domain/types";

import { ReportsButton } from "./reports-button";
import { RoleSwitcher } from "./role-switcher";

const DEMO_ROLE: Record<UserRole, DemoRole> = {
  generador: "comercio",
  valorizador: "reciclador",
  municipalidad: "alcaldia",
  administrador: "admin",
};

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function AppHeader({ profile }: { profile: SessionProfile }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-8">
        <Link
          href={ROLE_HOME[profile.role]}
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo className="hidden md:inline-flex" />
          <Logo markOnly className="md:hidden" />
        </Link>

        {demoMode ? <RoleSwitcher current={DEMO_ROLE[profile.role]} /> : null}

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          {demoMode ? <ReportsButton active={profile.role === "municipalidad"} /> : null}

          <div className="hidden flex-col items-end leading-tight lg:flex">
            <span className="text-sm font-semibold">{profile.displayName}</span>
            <span className="text-xs text-muted-foreground">{profile.orgType}</span>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 outline-none hover:bg-paper-2 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="sr-only">Salir</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
