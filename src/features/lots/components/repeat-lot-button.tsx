"use client";

import { LoaderCircle, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";

import { repeatLot } from "../actions";

/** Vuelve a publicar un lote igual con un toque (la ventana de retiro pasa a un día futuro). */
export function RepeatLotButton({ lotId, className }: { lotId: string; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function repeat() {
    startTransition(async () => {
      try {
        const result = await repeatLot(lotId);
        if (!result.ok) {
          toast.error(result.error, result.code === "limite_gratis" ? { action: { label: "Ver el plan", onClick: () => router.push("/comercio/plan") } } : undefined);
          return;
        }
        toast.success("Lote publicado de nuevo", { description: "Revisa la fecha de retiro en Mis lotes." });
        router.push("/comercio");
        router.refresh();
      } catch {
        toast.error("No se pudo repetir el lote. Revisa la conexión e inténtalo de nuevo.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={repeat}
      disabled={pending}
      className={buttonVariants({ variant: "outline", className: `h-11 px-4 ${className ?? ""}` })}
    >
      {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Repeat aria-hidden="true" />}
      Repetir lote
    </button>
  );
}
