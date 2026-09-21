import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { getPublicSettings } from "@/lib/public-settings";

export default async function SupportPage(){
  const settings=await getPublicSettings();
  const email=settings.support_email||settings.contact_email;

  return <main id="contenu" className="public-info-page">
    <article className="public-info-card">
      <Link href="/" className="public-back-link">← {settings.association_short_name}</Link>
      <span className="eyebrow">Aide</span><h1>Support AEDBVT</h1>
      <p className="public-info-lead">Besoin d’aide pour votre compte, votre candidature ou un document ? Utilisez le canal correspondant ci-dessous.</p>

      <div className="support-grid">
        <section><h2>Compte</h2><p>Si vous avez oublié votre mot de passe, utilisez la récupération depuis l’écran de connexion. Pour une invitation non reçue ou un compte suspendu, contactez l’administration.</p><Link className="button secondary" href="/forgot-password">Réinitialiser mon mot de passe</Link></section>
        <section><h2>Candidature</h2><p>La page de suivi permet de consulter votre dossier avec la référence et le code privés fournis lors du dépôt.</p><Link className="button secondary" href="/application-status">Suivre ma candidature</Link></section>
        <section><h2>Membre connecté</h2><p>Depuis Mon espace, vous pouvez consulter vos cotisations, reçus, documents et demandes personnelles.</p><Link className="button secondary" href="/login">Accéder à mon espace</Link></section>
      </div>

      {(email||settings.contact_phone||settings.official_address)&&<section className="support-contact"><h2>Contacter l’association</h2>{email&&<p>Email : <a href={"mailto:"+email}>{email}</a></p>}{settings.contact_phone&&<p>Téléphone : {settings.contact_phone}</p>}{settings.official_address&&<p>Adresse : {settings.official_address}</p>}</section>}
    </article>
    <PublicFooter/>
  </main>;
}
