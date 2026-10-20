import { createClient } from "@/lib/supabase/server";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { UiIcon } from "@/components/ui-icon";

export const dynamic="force-dynamic";

export default async function PublicEventsPage(){
  const supabase=await createClient();
  const {data:rows}=await supabase.rpc("get_public_events");
  const now=Date.now();
  const events=(rows||[]).filter((e:any)=>new Date(e.ends_at||e.starts_at).getTime()>=now);
  const TZ="Indian/Antananarivo";
  const fmt=(date:string,options:Intl.DateTimeFormatOptions)=>new Date(date).toLocaleDateString("fr-FR",{...options,timeZone:TZ});
  return <main id="contenu">
    <PublicNav/>
    <header className="pub-banner tone-coral">
      <span className="pub-chip"><UiIcon name="calendar"/>Agenda public</span>
      <h1>Événements</h1>
      <p>Rendez-vous publics organisés par l’AEDBVT.</p>
      <span className="pub-count">{events.length} à venir</span>
    </header>
    <section className="pub-page">
      {events.length?<ul className="pub-timeline">
        {events.map((event:any)=><li key={event.id} className="pub-event-card">
          <time className="pub-date-chip" dateTime={event.starts_at}><b>{fmt(event.starts_at,{day:"numeric"})}</b><small>{fmt(event.starts_at,{month:"short"})}</small></time>
          <div>
            <small>{fmt(event.starts_at,{weekday:"long",day:"numeric",month:"long"})} · {new Date(event.starts_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:TZ})}{event.category?" · "+event.category:""}</small>
            <h3>{event.title}</h3>
            <p><UiIcon name="pin"/>{event.location||"Lieu à confirmer"}</p>
            {event.description&&<p className="pub-desc">{event.description}</p>}
          </div>
        </li>)}
      </ul>:<div className="pub-empty"><span className="icon-tile lg" style={{"--tile":"var(--coral)"} as React.CSSProperties}><UiIcon name="calendar"/></span><p>Aucun événement public n’est programmé pour l’instant.</p></div>}
    </section>
    <PublicFooter/>
  </main>;
}
