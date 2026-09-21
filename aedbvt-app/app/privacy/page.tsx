import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { getPublicSettings } from "@/lib/public-settings";

export default async function PrivacyPage(){
  const settings=await getPublicSettings();
  const privacyContact=settings.privacy_email||settings.contact_email;

  return <main id="contenu" className="public-info-page">
    <article className="public-info-card">
      <Link href="/" className="public-back-link">← {settings.association_short_name}</Link>
      <span className="eyebrow">Données personnelles</span><h1>Politique de confidentialité</h1>
      <p className="public-info-lead">Cette page décrit la manière dont l’application AEDBVT utilise les informations nécessaires au fonctionnement de l’association.</p>

      <section><h2>Données concernées</h2><p>L’application peut traiter les informations de candidature et de membre, les coordonnées, les données d’études, les cotisations et reçus, les participations associatives, ainsi que les opérations administratives liées au rôle de l’utilisateur.</p></section>
      <section><h2>Finalités</h2><p>Ces informations sont utilisées pour gérer l’adhésion, la vie associative, la trésorerie, les documents, la gouvernance, les communications internes, la sécurité des accès et la traçabilité des opérations.</p></section>
      <section><h2>Accès aux données</h2><p>Les accès sont limités selon les rôles. Un membre ne dispose pas des mêmes droits que le Bureau, le Secrétariat, la Trésorerie ou l’Administrateur. Les opérations sensibles sont protégées par des règles d’accès en base de données et un journal d’audit.</p></section>
      <section><h2>Conservation et sécurité</h2><p>Les données sont conservées aussi longtemps qu’elles sont utiles à la gestion associative ou à la traçabilité requise. Les mots de passe ne sont pas stockés par l’application AEDBVT : l’authentification est gérée par le fournisseur d’authentification configuré pour le service.</p></section>
      <section><h2>Vos demandes</h2><p>Un membre peut contacter l’association pour demander la vérification ou la correction des données le concernant. Certaines informations historiques peuvent devoir être conservées lorsqu’elles correspondent à des opérations financières, administratives ou de gouvernance.</p>{privacyContact&&<p><a href={"mailto:"+privacyContact}>{privacyContact}</a></p>}</section>
      <p className="public-info-note">Cette politique décrit le fonctionnement actuel de l’application. Les obligations juridiques définitives doivent être adaptées au statut officiel et aux règles applicables à l’association.</p>
    </article>
    <PublicFooter/>
  </main>;
}
