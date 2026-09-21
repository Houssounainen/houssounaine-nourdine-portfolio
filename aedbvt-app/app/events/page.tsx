import { createClient } from "@/lib/supabase/server";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const dynamic="force-dynamic";

export default async function PublicEventsPage(){
  const supabase=await createClient();
  const {data:rows}=await supabase.rpc("get_public_events");
  const now=Date.now();
  const events=(rows||[]).filter((e:any)=>new Date(e.ends_at||e.starts_at).getTime()>=now);
  return <main id="contenu">
    <PublicNav/>
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Agenda public</span><h1>Événements</h1><p className="lead">Les rendez-vous publiés par l’AEDBVT.</p></div><span className="status-pill">{events.length} à venir</span></header>
      <div className="article-grid">
        {events.map((event:any)=><article className="panel article-card" key={event.id}>
          <div className="article-meta"><span className="badge">{event.category||"Événement"}</span><time>{new Date(event.starts_at).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})}</time></div>
          <h2>{event.title}</h2>
          <p>{event.location||"Lieu à confirmer"}</p>
          {event.description&&<p className="article-excerpt">{event.description}</p>}
        </article>)}
        {!events.length&&<div className="panel empty-state">Aucun événement public à venir.</div>}
      </div>
    </section>
    <PublicFooter/>
  </main>;
}
