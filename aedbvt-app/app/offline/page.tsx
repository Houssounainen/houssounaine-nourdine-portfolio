import Image from "next/image";
import Link from "next/link";

export default function OfflinePage(){
  return <main id="contenu" className="offline-page">
    <article className="offline-card">
      <Image src="/aedbvt-logo.webp" alt="AEDBVT" width={88} height={88}/>
      <span className="eyebrow">Mode hors ligne</span>
      <h1>Connexion indisponible</h1>
      <p>Les données privées de l’association ne sont volontairement pas enregistrées dans le cache du téléphone. Reconnectez-vous pour accéder aux membres, finances, documents, décisions et autres espaces sécurisés.</p>
      <div className="offline-actions">
        <button className="button primary" onClick={undefined}>Réessayer depuis le navigateur</button>
        <Link className="button secondary" href="/">Accueil public</Link>
      </div>
      <small>Les ressources visuelles de base restent disponibles afin que l’application puisse afficher cet écran en toute sécurité.</small>
    </article>
  </main>;
}
