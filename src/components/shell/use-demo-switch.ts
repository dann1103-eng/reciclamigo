"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { DemoRole } from "@/lib/demo/accounts";
import { switchDemoRole } from "@/lib/demo/actions";

const NETWORK_ERROR = "No se pudo cambiar de cuenta. Revisa la conexión e inténtalo de nuevo.";

/** Cambia de cuenta demo sin que una falla de red tumbe la página: devuelve el error para mostrarlo. */
export function useDemoSwitch() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const switchTo = (role: DemoRole) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await switchDemoRole(role);
        if (result.error || !result.home) {
          setError(result.error ? `No se pudo cambiar de cuenta. ${result.error}` : NETWORK_ERROR);
          return;
        }
        router.replace(result.home);
        router.refresh();
      } catch {
        setError(NETWORK_ERROR);
      }
    });
  };

  return { switchTo, pending, error, clearError: () => setError(null) };
}
