/** Hueco temporal de una sección que construye otro track. */
export function Placeholder({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="rounded-xl border border-dashed border-input px-5 py-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </section>
  );
}
