import type { ReactNode } from "react";

/** Título de cada pantalla de administración, con una línea que dice para qué sirve. */
export function AdminHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex max-w-prose flex-col gap-1.5">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      {children ? <div className="leading-relaxed text-muted-foreground">{children}</div> : null}
    </div>
  );
}
