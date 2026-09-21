import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";

export default async function ExportsPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user!.id).single();
  if(!can(profile?.role,"exports_manage")) notFound();

  const finance=can(profile?.role,"finance_manage");
  const admin=can(profile?.role,"admin_manage");

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Données & archivage</span><h1>Centre d’exports</h1></div><span className="status-pill">Accès contrôlé</span></header>

    <div className="export-grid">
      <article className="panel export-card">
        <span className="eyebrow">Registre</span><h2>Membres</h2><p>Numéro, identité, village, études, contact, statut et état d’activation du compte.</p>
        <div><a className="button secondary" href="/api/exports/members?format=csv">CSV</a><a className="button primary" href="/api/exports/members?format=excel">Excel XML</a></div>
      </article>

      {finance&&<article className="panel export-card">
        <span className="eyebrow">Adhésions</span><h2>Cotisations</h2><p>Exercices, montants dus, remises, paiements, soldes et statuts.</p>
        <div><a className="button secondary" href="/api/exports/dues?format=csv">CSV</a><a className="button primary" href="/api/exports/dues?format=excel">Excel XML</a></div>
      </article>}

      {finance&&<article className="panel export-card">
        <span className="eyebrow">Comptabilité</span><h2>Grand livre</h2><p>Écritures de recettes, règlements et dépenses avec catégories et comptes.</p>
        <div><a className="button secondary" href="/api/exports/ledger?format=csv">CSV</a><a className="button primary" href="/api/exports/ledger?format=excel">Excel XML</a></div>
      </article>}

      <article className="panel export-card">
        <span className="eyebrow">Patrimoine</span><h2>Équipements & stock</h2><p>Registre des biens durables et quantités disponibles du stock consommable.</p>
        <div><a className="button secondary" href="/api/exports/assets?format=csv">CSV</a><a className="button primary" href="/api/exports/assets?format=excel">Excel XML</a></div>
      </article>

      <article className="panel export-card">
        <span className="eyebrow">Pilotage</span><h2>Rapport synthétique</h2><p>Résumé PDF des membres, onboarding, activités, tâches et, si autorisé, cotisations/finances.</p>
        <div><a className="button primary" href="/api/exports/report">Télécharger le PDF</a></div>
      </article>

      {admin&&<article className="panel export-card export-card-warning">
        <span className="eyebrow">Administrateur</span><h2>Snapshot de sauvegarde</h2><p>Export JSON des principales tables métier. Les comptes Auth, mots de passe et secrets serveur ne sont jamais inclus.</p>
        <div><a className="button secondary" href="/api/exports/backup">Télécharger le snapshot</a></div>
      </article>}
    </div>

    <article className="panel export-note"><h2>À propos des exports</h2><p>Le format « Excel XML » est un classeur XML compatible avec Microsoft Excel et LibreOffice. Il évite d’ajouter une bibliothèque XLSX supplémentaire au serveur. Tous les exports sont générés à la demande et ne sont pas stockés publiquement.</p></article>
  </section>;
}
