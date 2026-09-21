import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { getPublicSettings } from "@/lib/public-settings";

export default async function TermsPage(){
  const settings=await getPublicSettings();

  return <main id="contenu" className="public-info-page">
    <article className="public-info-card">
      <Link href="/" className="public-back-link">← {settings.association_short_name}</Link>
      <span className="eyebrow">Utilisation</span><h1>Conditions d’utilisation</h1>
      <p className="public-info-lead">AEDBVT est un espace numérique associatif destiné aux membres, responsables et candidats autorisés.</p>

      <section><h2>Comptes et accès</h2><p>Les comptes sécurisés sont créés ou invités par l’administration. Chaque utilisateur doit protéger ses identifiants et utiliser uniquement les fonctions correspondant à ses responsabilités.</p></section>
      <section><h2>Données et documents</h2><p>Les informations affichées dans l’application doivent être utilisées uniquement dans le cadre des activités de l’association. Les reçus, attestations, décisions et autres documents conservent leurs règles propres de validation.</p></section>
      <section><h2>Traçabilité</h2><p>Les opérations administratives et métier peuvent être journalisées afin de protéger l’intégrité des registres et faciliter les contrôles internes.</p></section>
      <section><h2>Disponibilité</h2><p>L’association peut faire évoluer l’application, corriger des données, suspendre un accès compromis ou interrompre temporairement un service pour maintenance ou sécurité.</p></section>
      <section><h2>Statut institutionnel</h2><p>{settings.legal_status_note}</p></section>
      <p className="public-info-note">Ces conditions constituent un cadre d’utilisation de l’application et ne remplacent pas les statuts, le règlement intérieur ou les textes officiels approuvés de l’association.</p>
    </article>
    <PublicFooter/>
  </main>;
}
