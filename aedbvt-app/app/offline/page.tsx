import Image from "next/image";
import Link from "next/link";
import { UiIcon } from "@/components/ui-icon";

export default function OfflinePage(){
  return <main id="contenu" className="offline-page st-page">
    <article className="offline-card st-card">
      <div className="st-illus tone-sky" aria-hidden="true">
        <span className="st-illus-big st-illus-logo"><Image src="/aedbvt-logo.webp" alt="" width={88} height={88}/></span>
        <span className="icon-tile lg solid st-orb st-orb-1" style={{"--tile":"var(--coral)"} as React.CSSProperties}><UiIcon name="bolt"/></span>
        <span className="icon-tile lg solid st-orb st-orb-2" style={{"--tile":"var(--teal)"} as React.CSSProperties}><UiIcon name="shield"/></span>
      </div>
      <span className="eyebrow">Mode hors ligne</span>
      <h1>Connexion indisponible</h1>
      <p>Les données privées de l’association ne sont volontairement pas enregistrées dans le cache du téléphone. Reconnectez-vous pour accéder aux membres, finances, documents, décisions et autres espaces sécurisés.</p>
      <div className="offline-actions">
        <a className="button primary" href="/dashboard">Réessayer</a>
        <Link className="button secondary" href="/">Accueil public</Link>
      </div>
      <small>Les ressources visuelles de base restent disponibles afin que l’application puisse afficher cet écran en toute sécurité.</small>
    </article>
  </main>;
}
