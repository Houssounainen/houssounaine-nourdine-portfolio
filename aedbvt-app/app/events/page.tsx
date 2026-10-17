import { createClient } from "@/lib/supabase/server";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const dynamic="force-dynamic";

export default async function PublicEventsPage(){
  const supabase=await createClient();
  const {data:rows}=await supabase.rpc("get_public_events");
  const now=Date.now();
  const events=(rows||[]).filter((e:any)=>new Date(e.ends_at||e.starts_at).getTime()>=now);
  const TZ="Indian/Antananarivo";
  return <main id="contenu">
    <PublicNav/>
    <section className="page">
      <header className="page-header"><div><h1>Événements</h1><p>Rendez-vous publics organisés par l’AEDBVT.</p></div><span className="status-pill">{events.length} à venir</span></header>
      {events.length?<ul className="site-list">
        {events.map((event:any)=><li key={event.id}>
          <time dateTime={event.starts_at}>{new Date(event.starts_at).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",timeZone:TZ})}</time>
          <div><h3>{event.title}</h3><p>{new Date(event.starts_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:TZ})} · {event.location||"Lieu à confirmer"}{event.category?" · "+event.category:""}</p>{event.description&&<p>{event.description}</p>}</div>
        </li>)}
      </ul>:<p className="site-empty">Aucun événement public n’est programmé pour l’instant.</p>}
    </section>
    <PublicFooter/>
  </main>;
}
