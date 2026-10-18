import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { whatsappLink } from "../whatsapp";

/** Abre WhatsApp con el mensaje prellenado. Sin número, no se muestra. */
export function WhatsAppButton({ phone, text, className }: { phone: string | null; text: string; className?: string }) {
  if (!phone) return null;
  return (
    <a
      href={whatsappLink(phone, text)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold outline-none transition-colors duration-200 hover:bg-paper-2 focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <MessageCircle className="size-4 text-brand" aria-hidden="true" />
      Contactar por WhatsApp
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </a>
  );
}
