import { createClient } from "@/lib/supabase/server";
import { getPublicSettings } from "@/lib/public-settings";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { UiIcon } from "@/components/ui-icon";
import { Avatar } from "@/components/avatar";

export const dynamic="force-dynamic";

export default async function AssociationPage(){
  const settings=await getPublicSettings();
  const supabase=await createClient();
  const [{data:positions},{data:documents}]=await Promise.all([
    supabase.rpc("get_public_organization"),
    supabase.rpc("get_public_governance_documents"),
  ]);

  const tile=(color:string)=>({"--tile":color} as React.CSSProperties);
  return <main id="contenu">
    <PublicNav/>
    <header className="pub-banner">
      <span className="pub-chip"><UiIcon name="pin"/>{settings.association_city} · {settings.association_country}</span>
      <h1>{settings.association_name}</h1>
      <p>{settings.homepage_message}</p>
    </header>
    <section className="pub-page">
      <div className="pub-grid">
        <article className="pub-card"><div className="pub-card-head"><span className="icon-tile lg solid" style={tile("var(--accent)")}><UiIcon name="phone"/></span><span><small className="pub-kicker">Coordonnées</small><h2>Informations officielles</h2></span></div><p>{settings.official_address||"Adresse officielle à compléter."}</p><p>{settings.contact_email||settings.support_email||"Email à compléter."}{settings.contact_phone?" · "+settings.contact_phone:""}</p></article>
        <article className="pub-card"><div className="pub-card-head"><span className="icon-tile lg solid" style={tile("var(--orange)")}><UiIcon name="shield"/></span><span><small className="pub-kicker">Cadre institutionnel</small><h2>Statut</h2></span></div><p>{settings.legal_status_note}</p></article>
      </div>

      <div className="pub-subhead"><span className="icon-tile lg" style={tile("var(--teal)")}><UiIcon name="users"/></span><h2>Organigramme public</h2></div>
      <div className="pub-grid">
        {(positions||[]).map((position:any)=><article className="pub-card" key={position.slug}><div className="pub-card-head">{position.parent_slug?<Avatar name={position.holder_name||position.title} size={48}/>:<span className="icon-tile lg solid" style={tile("var(--teal)")}><UiIcon name="users"/></span>}<span><small className="pub-kicker">{position.parent_slug?"Fonction":"Organe"}</small><h2>{position.title}</h2></span></div>{position.mission&&<p>{position.mission}</p>}<b>{position.holder_name||"Poste non attribué"}</b></article>)}
        {!positions?.length&&<div className="pub-empty"><span className="icon-tile lg" style={tile("var(--teal)")}><UiIcon name="users"/></span><p>L’organigramme sera publié prochainement.</p></div>}
      </div>

      <div className="pub-subhead"><span className="icon-tile lg" style={tile("var(--violet)")}><UiIcon name="document"/></span><h2>Documents publiés</h2></div>
      <div className="pub-grid">
        {(documents||[]).map((doc:any)=><article className="pub-card" key={doc.id}><div className="pub-card-head"><span className="icon-tile lg" style={tile("var(--violet)")}><UiIcon name="document"/></span><span><small className="pub-kicker">{doc.category}</small><h2>{doc.title}</h2></span></div><p>Version {doc.version}</p>{doc.body&&<details><summary>Lire le document</summary><div className="article-body">{doc.body}</div></details>}</article>)}
        {!documents?.length&&<div className="pub-empty"><span className="icon-tile lg" style={tile("var(--violet)")}><UiIcon name="document"/></span><p>Aucun document institutionnel n’est encore publié.</p></div>}
      </div>
    </section>
    <PublicFooter/>
  </main>;
}
