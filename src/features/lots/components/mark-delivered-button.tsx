"use client";

import { LoaderCircle, PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";

import { markDelivered } from "../actions";

export function MarkDeliveredButton({ pickupId, collectorName }: { pickupId: string; collectorName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        const result = await markDelivered(pickupId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Entrega registrada", { description: `${collectorName} confirmará los kg reales.` });
        router.refresh();
      } catch {
        toast.error("No se pudo registrar la entrega. Revisa la conexión e inténtalo de nuevo.");
      }
    });
  }

  return (
    <button type="button" onClick={onClick} disabled={pending} className={buttonVariants({ size: "lg", className: "h-11 px-4" })}>
      {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <PackageCheck aria-hidden="true" />}
      {pending ? "Registrando…" : "Marcar como entregado"}
    </button>
  );
}
