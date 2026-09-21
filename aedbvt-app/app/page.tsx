import Image from "next/image";
import Link from "next/link";

const modules = [
  ["Membres", "Registre, adhésions, rôles et statuts."],
  ["Finances", "Cotisations, paiements, dépenses et rapprochement."],
  ["Documents", "Devis, factures, reçus et pièces justificatives."],
  ["Gouvernance", "Statuts, règlement, PV, décisions et transparence."],
];

export default function Home() {
  return (
    <main id="contenu" className="landing">
      <section className="landing-card">
        <div className="brand-lockup">
          <Image src="/aedbvt-logo.webp" alt="Logo AEDBVT" width={110} height={110} priority />
          <div><span className="eyebrow">Tuléar · Madagascar</span><h1>AEDBVT</h1></div>
        </div>
        <h2>L’espace numérique de l’association.</h2>
        <p className="lead">Une application séparée pour gérer les membres, la vie associative, la trésorerie, les documents et la gouvernance avec des accès sécurisés.</p>
        <div className="landing-actions">
          <Link className="button primary" href="/login">Accéder à mon espace</Link>
          <Link className="button secondary" href="/join">Demander l’adhésion</Link>
          <Link className="landing-track-link" href="/application-status">Suivre une candidature</Link>
          <span className="trust">Accès contrôlé · données protégées · journal d’audit</span>
        </div>
        <div className="module-grid">
          {modules.map(([title, copy]) => <article key={title}><b>{title}</b><p>{copy}</p></article>)}
        </div>
        <p className="legal-note">Le statut juridique et les formalités réglementaires de l’association restent à valider avant toute présentation institutionnelle définitive.</p>
      </section>
    </main>
  );
}
