import Link from "next/link";
import type { ReactNode } from "react";
import { UiIcon, type IconName } from "@/components/ui-icon";
import type { Tone } from "@/lib/governance-labels";

/** Pastille de statut colorée. */
export function Pill({ tone = "muted", icon, children }: { tone?: Tone; icon?: IconName; children: ReactNode }) {
  return <span className={`gv-pill tone-${tone}`}>{icon && <UiIcon name={icon}/>}{children}</span>;
}

/** Bandeau d’en-tête des fiches (assemblée, élection, document, dossier…). */
export function DetailHero({ back, kicker, title, icon, color = "#2453d6", meta, status, actions, children }: {
  back?: { href: string; label: string };
  kicker?: ReactNode;
  title: ReactNode;
  icon: IconName;
  color?: string;
  meta?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return <header className="gv-hero" style={{ "--hero": color } as React.CSSProperties}>
    <div className="gv-hero-top">
      {back ? <Link className="gv-back" href={back.href}><UiIcon name="arrow"/>{back.label}</Link> : <span/>}
      {status}
    </div>
    <div className="gv-hero-main">
      <span className="gv-hero-icon" aria-hidden="true"><UiIcon name={icon}/></span>
      <div className="gv-hero-text">
        {kicker && <p className="gv-kicker">{kicker}</p>}
        <h1>{title}</h1>
        {meta && <div className="gv-hero-meta">{meta}</div>}
      </div>
      {actions && <div className="gv-hero-actions">{actions}</div>}
    </div>
    {children}
  </header>;
}

/** En-tête de carte : tuile d’icône, sur-titre, titre et élément aligné à droite. */
export function CardHead({ icon, color = "#2453d6", eyebrow, title, aside }: { icon: IconName; color?: string; eyebrow?: ReactNode; title: ReactNode; aside?: ReactNode }) {
  return <div className="gv-card-head">
    <span className="icon-tile lg" style={{ "--tile": color } as React.CSSProperties}><UiIcon name={icon}/></span>
    <div>{eyebrow && <small>{eyebrow}</small>}<h2>{title}</h2></div>
    {aside && <div className="gv-card-aside">{aside}</div>}
  </div>;
}

/** État vide illustré. */
export function EmptyCard({ icon, color = "#2453d6", title, text, children }: { icon: IconName; color?: string; title: string; text?: string; children?: ReactNode }) {
  return <div className="gv-empty">
    <span className="icon-tile lg solid" style={{ "--tile": color } as React.CSSProperties}><UiIcon name={icon}/></span>
    <b>{title}</b>{text && <small>{text}</small>}{children}
  </div>;
}
