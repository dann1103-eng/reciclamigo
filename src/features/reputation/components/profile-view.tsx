import { ArrowLeft, BadgeCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { profileStatsFromRow, reputationFromRow, type ProfileImpactRow } from "@/lib/data/profile-impact";
import { computeBadges } from "@/lib/domain/badges";
import { isPrioritized, reputationLine } from "@/lib/domain/reputation";
import { formatLb } from "@/lib/domain/units";

import type { PublicProfile, RatingComment } from "../load";
import { profileSubtitle, ratingsLabel, starsLabel, valorizadorKindLabel } from "../profile";

import { BadgeList } from "./badge-list";

const shortDate = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function Stars({ stars }: { stars: number }) {
  return (
    <span role="img" aria-label={starsLabel(stars)} className="text-accent-warm-ink">
      {"★".repeat(stars)}
      <span className="text-border">{"★".repeat(Math.max(0, 5 - stars))}</span>
    </span>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Perfil de un comercio o reciclador, visible para cualquier usuario con sesión.
 * Nunca muestra WhatsApp, dirección ni dinero: solo identidad, reputación y totales en libras.
 */
export function ProfileView({
  profile,
  impact,
  comments,
  isSelf,
  backHref,
}: {
  profile: PublicProfile;
  impact: ProfileImpactRow | null;
  comments: RatingComment[];
  isSelf: boolean;
  backHref: string;
}) {
  const reputation = reputationFromRow(impact);
  const kind = profile.role === "valorizador" ? valorizadorKindLabel(profile.tipoValorizador) : null;
  // La verificación ya sale arriba, junto al nombre: no se repite como insignia.
  const stats = impact ? { ...profileStatsFromRow(impact), verified: false } : null;
  const hasBadges = stats ? computeBadges(stats).length > 0 : false;
  const lb = Number(impact?.completed_lb ?? 0);
  const deliveries = Number(impact?.completed_count ?? 0);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href={backHref}
          className="inline-flex h-11 w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-semibold">
            {profile.role === "generador" ? "Comercio" : (kind ?? "Reciclador")}
          </span>
          {profile.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              Verificado
            </span>
          ) : null}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight break-words">{profile.displayName}</h1>
        <p className="text-muted-foreground">{profileSubtitle(profile)}</p>
        {isSelf ? <p className="text-sm text-muted-foreground">Así te ven los demás usuarios.</p> : null}
      </header>

      <Section id="reputacion" title="Reputación">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-lg font-semibold">{reputationLine(reputation)}</p>
          <p className="text-sm text-muted-foreground">
            Crece solo con entregas confirmadas en la app y buenas calificaciones.
            {profile.role === "valorizador" && isPrioritized(reputation.tier)
              ? " Con esta reputación recibe los avisos de lotes antes."
              : ""}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-card px-5 py-4">
            <dt className="text-sm text-muted-foreground">
              {profile.role === "generador" ? "Plástico entregado" : "Plástico recolectado"}
            </dt>
            <dd className="tabular text-xl font-bold">{formatLb(lb)}</dd>
          </div>
          <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-card px-5 py-4">
            <dt className="text-sm text-muted-foreground">Entregas confirmadas</dt>
            <dd className="tabular text-xl font-bold">{deliveries}</dd>
          </div>
        </dl>
      </Section>

      {stats ? (
        <Section id="insignias" title="Insignias">
          {hasBadges ? (
            <BadgeList stats={stats} showDescriptions />
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no tiene insignias. Se ganan con entregas confirmadas.</p>
          )}
        </Section>
      ) : null}

      <Section id="comentarios" title="Comentarios">
        <p className="text-sm text-muted-foreground">{ratingsLabel(reputation.ratingAvg, reputation.ratingCount)}</p>
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-input px-5 py-5">
            <p className="font-semibold">Todavía no hay comentarios</p>
            <p className="text-sm text-muted-foreground">Aparecen cuando alguien califica una entrega y deja un comentario.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => (
              <li key={c.id} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <Stars stars={c.stars} />
                  <span className="tabular text-xs text-muted-foreground">{shortDate.format(new Date(c.createdAt))}</span>
                </div>
                <p>{c.comment}</p>
                <p className="text-sm text-muted-foreground">{c.raterName}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </article>
  );
}
