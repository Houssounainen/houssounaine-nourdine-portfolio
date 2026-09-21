import { createClient } from "@/lib/supabase/server";
import { getPublicSettings } from "@/lib/public-settings";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const dynamic="force-dynamic";

export default async function AssociationPage(){
  const settings=await getPublicSettings();
  const supabase=await createClient();
  const [{data:positions},{data:documents}]=await Promise.all([
    supabase.rpc("get_public_organization"),
    supabase.rpc("get_public_governance_documents"),
  ]);

  return <main id="contenu">
    <PublicNav/>
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">{settings.association_city} · {settings.association_country}</span><h1>{settings.association_name}</h1><p className="lead">{settings.homepage_message}</p></div></header>

      <div className="content-grid">
        <article className="panel"><span className="eyebrow">Coordonnées</span><h2>Informations officielles</h2><p>{settings.official_address||"Adresse officielle à compléter."}</p><p>{settings.contact_email||settings.support_email||"Email à compléter."}{settings.contact_phone?" · "+settings.contact_phone:""}</p></article>
        <article className="panel"><span className="eyebrow">Cadre institutionnel</span><h2>Statut</h2><p>{settings.legal_status_note}</p></article>
      </div>

      <section style={{marginTop:28}}>
        <div className="section-heading"><span className="eyebrow">Structure</span><h2>Organigramme public</h2></div>
        <div className="governance-grid">
          {(positions||[]).map((position:any)=><article className="panel gov-card" key={position.slug}><span className="eyebrow">{position.parent_slug?"Fonction":"Organe"}</span><h2>{position.title}</h2><p>{position.mission}</p><small>{position.holder_name||"Poste non attribué"}</small></article>)}
        </div>
      </section>

      <section style={{marginTop:28}}>
        <div className="section-heading"><span className="eyebrow">Transparence</span><h2>Documents publiés</h2></div>
        <div className="governance-grid">
          {(documents||[]).map((doc:any)=><article className="panel gov-card" key={doc.id}><span className="eyebrow">{doc.category}</span><h2>{doc.title}</h2><p>Version {doc.version}</p>{doc.body&&<details><summary>Lire le document</summary><div className="article-body">{doc.body}</div></details>}</article>)}
          {!documents?.length&&<div className="panel empty-state">Aucun document institutionnel n’est encore publié.</div>}
        </div>
      </section>
    </section>
    <PublicFooter/>
  </main>;
}
