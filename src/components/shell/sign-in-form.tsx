"use client";

import { useActionState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { signInWithEmail, type SignInState } from "@/lib/demo/actions";

const initial: SignInState = { error: null };

export function SignInForm() {
  const [state, action, pending] = useActionState(signInWithEmail, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Correo
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 rounded-lg border border-input bg-card px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 rounded-lg border border-input bg-card px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={buttonVariants({ size: "xl", variant: "outline" })}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
