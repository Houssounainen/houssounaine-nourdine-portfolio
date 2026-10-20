import Link from "next/link";
import { UiIcon } from "@/components/ui-icon";

export default function NotFound(){
  return <main className="access-state-page st-page">
    <article className="access-state-card st-card">
      <div className="st-illus" aria-hidden="true">
        <span className="st-illus-big">404</span>
        <span className="icon-tile lg solid st-orb st-orb-1" style={{"--tile":"var(--gold)"} as React.CSSProperties}><UiIcon name="search"/></span>
        <span className="icon-tile lg solid st-orb st-orb-2" style={{"--tile":"var(--pink)"} as React.CSSProperties}><UiIcon name="pin"/></span>
      </div>
      <span className="eyebrow">AEDBVT</span>
      <h1>Page introuvable</h1>
      <p>Le lien demandé n’existe pas ou la ressource n’est plus disponible.</p>
      <div className="access-state-actions">
        <Link className="button primary" href="/">Retour à l’accueil</Link>
        <Link className="button secondary" href="/dashboard">Espace membre</Link>
      </div>
    </article>
  </main>;
}
