import Link from "next/link";

export default function NotFound(){
  return <main className="access-state-page">
    <article className="access-state-card">
      <span className="access-state-mark" aria-hidden="true">404</span>
      <span className="eyebrow">AEDBVT</span>
      <h1>Page introuvable</h1>
      <p>Le lien demandé n’existe pas ou la ressource n’est plus disponible.</p>
      <Link className="button primary" href="/">Retour à l’accueil</Link>
    </article>
  </main>;
}
