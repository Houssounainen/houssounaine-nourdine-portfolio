import Link from "next/link";
import type { ReactNode } from "react";
import { AvatarStack } from "@/components/avatar";
import { UiIcon } from "@/components/ui-icon";

const TZ = "Indian/Antananarivo";

/** Couleur stable d’une catégorie d’événement (calendrier, billets, légende). */
const CATEGORY_COLORS: [RegExp, string][] = [
  [/r[ée]union/i, "#f79009"],
  [/assembl|^ag$|gouvern/i, "#0ba5ec"],
  [/acad|cours|examen|soutenance/i, "#7a5af8"],
  [/cultur/i, "#ee46bc"],
  [/sport/i, "#15b79e"],
  [/solidar/i, "#f97316"],
  [/f[êe]te|soir[ée]e|int[ée]gration/i, "#f2545b"],
  [/[ée]tudiant/i, "#12b76a"],
];
export function categoryColor(label?: string | null) {
  const value = (label || "").trim();
  for (const [pattern, color] of CATEGORY_COLORS) if (pattern.test(value)) return color;
  return "#2453d6";
}

export type TicketPerson = { name?: string | null; url?: string | null };

/** Carte « billet » : talon coloré avec la date en gros, détails et participants. */
export function EventTicket({ title, startsAt, endsAt, location, label, href, people = [], count, mine, past, children, className = "" }: {
  title: string; startsAt: string; endsAt?: string | null; location?: string | null; label: string; href?: string;
  people?: TicketPerson[]; count?: number; mine?: boolean; past?: boolean; children?: ReactNode; className?: string;
}) {
  const date = new Date(startsAt);
  const weekday = date.toLocaleDateString("fr-FR", { weekday: "short", timeZone: TZ }).replace(".", "");
  const day = date.toLocaleDateString("fr-FR", { day: "numeric", timeZone: TZ });
  const month = date.toLocaleDateString("fr-FR", { month: "short", timeZone: TZ }).replace(".", "");
  const hour = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const total = count ?? people.length;
  const style = { "--cat": categoryColor(label) } as React.CSSProperties;
  const titleNode = href ? <Link href={href} className="hm-ticket-link">{title}</Link> : title;
  return <article className={`hm-ticket${past ? " is-past" : ""}${mine ? " is-mine" : ""} ${className}`.trim()} style={style}>
    <div className="hm-ticket-stub" aria-hidden="true">
      <small>{weekday}</small>
      <b>{day}</b>
      <small>{month}</small>
    </div>
    <div className="hm-ticket-body">
      <p className="hm-ticket-label"><span>{label}</span>{mine && <em><UiIcon name="check"/>Inscrit</em>}</p>
      <h3>{titleNode}</h3>
      <p className="hm-ticket-meta">
        <span><UiIcon name="clock"/>{hour(startsAt)}{endsAt ? ` – ${hour(endsAt)}` : ""}</span>
        <span><UiIcon name="pin"/>{location || "Lieu à confirmer"}</span>
      </p>
      {(total > 0 || children) && <div className="hm-ticket-foot">
        {total > 0 && <span className="hm-ticket-people">{people.length > 0 && <AvatarStack people={people} max={4} size={26}/>}<small>{total} participant{total > 1 ? "s" : ""}</small></span>}
        {children && <div className="hm-ticket-actions">{children}</div>}
      </div>}
    </div>
  </article>;
}
