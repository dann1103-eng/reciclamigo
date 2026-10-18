"use client";

import { LoaderCircle, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ratePickup } from "../actions";
import { MAX_COMMENT } from "../schemas";

/** Calificación de la otra parte (1 a 5 estrellas y comentario opcional), una sola vez. */
export function RatePickup({
  pickupId,
  otherName,
  myRating,
}: {
  pickupId: string;
  otherName: string;
  myRating: number | null;
}) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (myRating) {
    return (
      <p className="tabular text-sm text-muted-foreground">
        Calificaste a {otherName} con {myRating} ★
      </p>
    );
  }

  function submit() {
    if (!stars) return setError("Elige de 1 a 5 estrellas");
    setError(null);
    startTransition(async () => {
      try {
        const result = await ratePickup({ pickupId, stars, comment: comment.trim() || undefined });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success("Gracias por calificar");
        router.refresh();
      } catch {
        setError("No se pudo enviar la calificación. Revisa la conexión e inténtalo de nuevo.");
      }
    });
  }

  const shown = hover || stars;
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-paper-2 p-3">
      <p className="text-sm font-semibold">¿Cómo te fue con {otherName}?</p>
      <div role="radiogroup" aria-label={`Calificación para ${otherName}`} className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
            onClick={() => setStars(n)}
            onMouseEnter={() => setHover(n)}
            className="grid size-11 place-items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Star
              aria-hidden="true"
              className={cn("size-7 transition-colors duration-150", n <= shown ? "fill-accent-warm text-accent-warm-ink" : "text-input")}
            />
          </button>
        ))}
      </div>
      {stars ? (
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Comentario (opcional)
          <textarea
            value={comment}
            maxLength={MAX_COMMENT}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="rounded-lg border border-input bg-card px-3 py-2 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {stars ? (
        <button type="button" onClick={submit} disabled={pending} className={buttonVariants({ size: "lg", className: "h-11 w-fit px-4" })}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          {pending ? "Enviando…" : "Enviar calificación"}
        </button>
      ) : null}
    </div>
  );
}
