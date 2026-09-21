import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPublicSettings } from "@/lib/public-settings";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const dynamic="force-dynamic";

export default async function Home() {
  const settings=await getPublicSettings();
  const supabase=await createClient();

  const [
    {data:articles},
    {data:events},
    {data:positions},
    {data:documents},
    {data:partners},
  ]=await Promise.all([
    supabase.rpc("get_public_articles"),
    supabase.rpc("get_public_events"),
    supabase.rpc("get_public_organization"),
    supabase.rpc("get_public_governance_documents"),
    supabase.rpc("get_public_partners"),
  ]);

  const featured=(articles||[]).find((article:any)=>article.featured) || (articles||[])[0] || null;
  const now=Date.now();
  const upcoming=(events||[]).filter((event:any)=>new Date(event.ends_at||event.starts_at).getTime()>=now);
  const nextEvent=upcoming[0]||null;

  return (
    <main id="contenu" className="public-home">
      <PublicNav/>

      <section className="public-home-shell">
        <section className="public-hero">
          <div>
            <span className="eyebrow">Association officielle · {settings.association_city}</span>
            <h1>{settings.association_short_name}</h1>
            <h2>{settings.association_name}</h2>
            <p className="lead">{settings.homepage_message}</p>
            <div className="public-hero-actions">
              <Link className="button primary" href="/join">Demander l’adhésion</Link>
              <Link className="button secondary" href="/news">Voir les actualités</Link>
              <Link className="public-text-link" href="/application-status">Suivre une candidature →</Link>
            </div>
          </div>

          <aside className="panel public-hero-card">
            <span className="eyebrow">Informations publiques</span>
            <h3>Tout ce qui concerne la vie publique de l’AEDBVT est accessible ici.</h3>
            <p>Actualités, événements, présentation de l’association, organigramme, documents publiés et partenaires.</p>
            <div className="public-mini-stats">
              <span><b>{articles?.length||0}</b><small>actualité(s)</small></span>
              <span><b>{upcoming.length}</b><small>événement(s)</small></span>
              <span><b>{positions?.length||0}</b><small>fonction(s)</small></span>
              <span><b>{partners?.length||0}</b><small>partenaire(s)</small></span>
            </div>
          </aside>
        </section>

        {featured&&<section className="public-featured-section">
          <div className="section-heading-row">
            <div><span className="eyebrow">À la une</span><h2>Dernière actualité mise en avant</h2></div>
            <Link className="public-text-link" href="/news">Toutes les actualités →</Link>
          </div>
          <Link className="public-featured-card" href={"/news/"+featured.slug}>
            <span className="badge featured">À la une</span>
            <small>{featured.category||"Actualité"} · {featured.published_at?new Date(featured.published_at).toLocaleDateString("fr-FR"):""}</small>
            <h3>{featured.title}</h3>
            <p>{featured.excerpt||featured.body?.slice(0,220)}</p>
            <b>Lire l’article →</b>
          </Link>
        </section>}

        <section className="public-section">
          <div className="section-heading-row">
            <div><span className="eyebrow">Explorer</span><h2>Informations publiques AEDBVT</h2></div>
          </div>

          <div className="public-home-grid">
            <Link className="public-home-card panel" href="/news">
              <span className="public-card-kicker">Actualités</span>
              <h3>Les publications officielles</h3>
              <p>Communiqués, vie associative, gouvernance et annonces publiées par l’administration.</p>
              <b>{articles?.length||0} publication(s) →</b>
            </Link>

            <Link className="public-home-card panel" href="/events">
              <span className="public-card-kicker">Événements</span>
              <h3>Agenda public</h3>
              <p>{nextEvent?<>Prochain rendez-vous : <strong>{nextEvent.title}</strong>, le {new Date(nextEvent.starts_at).toLocaleDateString("fr-FR")}.</>:"Les prochains événements publics apparaîtront ici dès leur publication."}</p>
              <b>{upcoming.length} événement(s) à venir →</b>
            </Link>

            <Link className="public-home-card panel" href="/association">
              <span className="public-card-kicker">Association</span>
              <h3>Présentation et gouvernance publique</h3>
              <p>Informations officielles, organigramme actif et documents institutionnels rendus publics.</p>
              <b>{positions?.length||0} fonction(s) · {documents?.length||0} document(s) →</b>
            </Link>

            <Link className="public-home-card panel" href="/soutiens">
              <span className="public-card-kicker">Partenaires</span>
              <h3>Nos soutiens publics</h3>
              <p>Découvrez les organisations et partenaires que l’AEDBVT a choisi de présenter publiquement.</p>
              <b>{partners?.length||0} partenaire(s) →</b>
            </Link>
          </div>
        </section>

        <section className="public-membership panel">
          <div>
            <span className="eyebrow">Adhésion</span>
            <h2>Vous souhaitez rejoindre l’AEDBVT ?</h2>
            <p>La demande d’adhésion se fait en ligne. Après dépôt, vous recevez une référence et un code privé pour suivre votre dossier.</p>
          </div>
          <div className="public-membership-actions">
            <Link className="button primary" href="/join">Déposer une candidature</Link>
            <Link className="button secondary" href="/application-status">Suivre mon dossier</Link>
          </div>
        </section>

        <p className="public-legal-note">{settings.legal_status_note}</p>
      </section>

      <PublicFooter/>
    </main>
  );
}
