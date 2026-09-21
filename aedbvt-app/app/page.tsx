import Image from "next/image";
import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { getPublicSettings } from "@/lib/public-settings";

const modules = [
  ["Membres", "Registre, adhésions, rôles et statuts."],
  ["Finances", "Cotisations, paiements, dépenses et rapprochement."],
  ["Documents", "Devis, factures, reçus et pièces justificatives."],
  ["Gouvernance", "Statuts, règlement, PV, décisions et transparence."],
];

export default async function Home() {
  const settings=await getPublicSettings();

  return (
    <main id="contenu" className="landing">
      <section className="landing-card">
        <div className="brand-lockup">
          <Image src="/aedbvt-logo.webp" alt={"Logo "+settings.association_short_name} width={110} height={110} priority />
          <div><span className="eyebrow">{settings.association_city} · {settings.association_country}</span><h1>{settings.association_short_name}</h1></div>
        </div>
        <h2>L’espace numérique de l’association.</h2>
        <p className="lead">{settings.homepage_message}</p>
        <div className="landing-actions">
          <Link className="button primary" href="/login">Accéder à mon espace</Link>
          <Link className="button secondary" href="/join">Demander l’adhésion</Link>
          <Link className="landing-track-link" href="/application-status">Suivre une candidature</Link>
          <span className="trust">Accès contrôlé · données protégées · journal d’audit</span>
        </div>
        <div className="module-grid">
          {modules.map(([title, copy]) => <article key={title}><b>{title}</b><p>{copy}</p></article>)}
        </div>
        <p className="legal-note">{settings.legal_status_note}</p>
      </section>
      <PublicFooter/>
    </main>
  );
}
