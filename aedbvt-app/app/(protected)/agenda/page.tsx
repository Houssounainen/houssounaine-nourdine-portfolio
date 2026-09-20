import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { createEvent, createMeeting, saveMeetingMinutes, toggleEventRegistration, toggleMeetingAttendance } from "./actions";

const monthNames = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

function monthKey(date: Date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function monthHref(date: Date) {
  return "/agenda?month=" + monthKey(date);
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: events }, { data: meetings }, { data: eventRegs }, { data: meetingRegs }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("events").select("id,title,description,location,category,starts_at,ends_at").order("starts_at"),
    supabase.from("meetings").select("id,title,starts_at,location,mode,agenda,minutes").order("starts_at"),
    supabase.from("event_registrations").select("event_id,user_id,status"),
    supabase.from("meeting_attendance").select("meeting_id,user_id,status"),
  ]);

  const now = new Date();
  const parsed = /^\d{4}-\d{2}$/.test(params.month || "") ? new Date((params.month as string) + "-01T00:00:00+03:00") : now;
  const viewDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  const prev = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
  const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  const days = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const offset = (new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() + 6) % 7;

  const marks = new Map<string, { event: boolean; meeting: boolean }>();
  (events || []).forEach((item) => {
    const d = new Date(item.starts_at);
    const key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    marks.set(key, { event: true, meeting: marks.get(key)?.meeting || false });
  });
  (meetings || []).forEach((item) => {
    const d = new Date(item.starts_at);
    const key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    marks.set(key, { event: marks.get(key)?.event || false, meeting: true });
  });

  const eventCount = new Map<string, number>();
  (eventRegs || []).filter((x) => x.status === "going").forEach((x) => eventCount.set(x.event_id, (eventCount.get(x.event_id) || 0) + 1));
  const meetingCount = new Map<string, number>();
  (meetingRegs || []).filter((x) => x.status === "confirmed").forEach((x) => meetingCount.set(x.meeting_id, (meetingCount.get(x.meeting_id) || 0) + 1));
  const myEvents = new Set((eventRegs || []).filter((x) => x.user_id === user!.id && x.status === "going").map((x) => x.event_id));
  const myMeetings = new Set((meetingRegs || []).filter((x) => x.user_id === user!.id && x.status === "confirmed").map((x) => x.meeting_id));

  const upcomingEvents = (events || []).filter((x) => new Date(x.starts_at) >= now);
  const upcomingMeetings = (meetings || []).filter((x) => new Date(x.starts_at) >= now);
  const pastMeetings = (meetings || []).filter((x) => new Date(x.starts_at) < now).reverse();

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Calendrier associatif</span><h1>Agenda</h1></div><span className="status-pill">{upcomingEvents.length + upcomingMeetings.length} rendez-vous à venir</span></header>

      {isStaff(profile?.role) && (
        <div className="content-grid">
          <form action={createEvent} className="panel form-stack compact-form">
            <div><span className="eyebrow">Événement</span><h2>Ajouter au calendrier</h2></div>
            <label>Titre<input name="title" required /></label>
            <label>Catégorie<select name="category"><option>Vie associative</option><option>Académique</option><option>Culturel</option><option>Sport</option><option>Solidarité</option><option>Assemblée</option></select></label>
            <label>Date et heure<input name="starts_at" type="datetime-local" required /></label>
            <label>Lieu<input name="location" /></label>
            <label>Description<textarea name="description" rows={3} /></label>
            <button className="button primary">Publier l’événement</button>
          </form>
          <form action={createMeeting} className="panel form-stack compact-form">
            <div><span className="eyebrow">Réunion</span><h2>Planifier une réunion</h2></div>
            <label>Titre<input name="title" required /></label>
            <label>Mode<select name="mode"><option>Présentiel</option><option>Visio</option><option>Hybride</option></select></label>
            <label>Date et heure<input name="starts_at" type="datetime-local" required /></label>
            <label>Lieu / lien<input name="location" /></label>
            <label>Ordre du jour<textarea name="agenda" rows={3} placeholder={"Un point par ligne"} /></label>
            <button className="button secondary">Planifier la réunion</button>
          </form>
        </div>
      )}

      <div className="agenda-layout">
        <article className="panel calendar-panel">
          <div className="calendar-head"><Link href={monthHref(prev)} aria-label="Mois précédent">‹</Link><b>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</b><Link href={monthHref(next)} aria-label="Mois suivant">›</Link></div>
          <div className="calendar-grid">
            {["L","M","M","J","V","S","D"].map((d,i)=><span className="day-name" key={d+i}>{d}</span>)}
            {Array.from({length:offset}).map((_,i)=><span key={"blank-"+i} />)}
            {Array.from({length:days}).map((_,i)=>{
              const day=i+1;
              const key=viewDate.getFullYear()+"-"+String(viewDate.getMonth()+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
              const mark=marks.get(key);
              const todayKey=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
              return <span className={"calendar-day "+(key===todayKey?"today":"")} key={key}>{day}{mark && <i className="calendar-dots">{mark.event&&<b />}{mark.meeting&&<b className="meeting-dot" />}</i>}</span>;
            })}
          </div>
          <div className="calendar-legend"><span><i />Événement</span><span><i className="meeting-dot" />Réunion</span></div>
        </article>

        <div className="agenda-feed">
          <h2>Prochains rendez-vous</h2>
          {[...upcomingEvents.map((item)=>({kind:"event" as const,item})),...upcomingMeetings.map((item)=>({kind:"meeting" as const,item}))].sort((a,b)=>new Date(a.item.starts_at).getTime()-new Date(b.item.starts_at).getTime()).slice(0,8).map((entry)=>{
            const date=new Date(entry.item.starts_at);
            if(entry.kind==="event"){
              const item=entry.item;
              const on=myEvents.has(item.id);
              return <article className="panel agenda-card" key={"e-"+item.id}><div className="date-block"><b>{date.getDate()}</b><span>{monthNames[date.getMonth()].slice(0,3)}</span></div><div className="agenda-copy"><span className="badge">{item.category}</span><h3>{item.title}</h3><p>{date.toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})} · {item.location || "Lieu à confirmer"}</p>{item.description&&<small>{item.description}</small>}</div><form action={toggleEventRegistration}><input type="hidden" name="event_id" value={item.id}/><input type="hidden" name="current" value={on?"on":"off"}/><button className={"button "+(on?"secondary":"primary")}>{on?"✓ Inscrit":"Participer"} · {eventCount.get(item.id)||0}</button></form></article>;
            }
            const item=entry.item;
            const on=myMeetings.has(item.id);
            return <article className="panel agenda-card" key={"m-"+item.id}><div className="date-block meeting"><b>{date.getDate()}</b><span>{monthNames[date.getMonth()].slice(0,3)}</span></div><div className="agenda-copy"><span className="badge">{item.mode}</span><h3>{item.title}</h3><p>{date.toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})} · {item.location || "Lieu à confirmer"}</p>{Array.isArray(item.agenda)&&item.agenda.length>0&&<ol>{item.agenda.map((point:string)=><li key={point}>{point}</li>)}</ol>}</div><form action={toggleMeetingAttendance}><input type="hidden" name="meeting_id" value={item.id}/><input type="hidden" name="current" value={on?"on":"off"}/><button className={"button "+(on?"secondary":"primary")}>{on?"✓ Présence confirmée":"Confirmer"} · {meetingCount.get(item.id)||0}</button></form></article>;
          })}
        </div>
      </div>

      <h2 className="section-title">Réunions passées & procès-verbaux</h2>
      <div className="meeting-history">
        {pastMeetings.slice(0,8).map((meeting)=>{
          const date=new Date(meeting.starts_at);
          return <article className="panel" key={meeting.id}><div className="article-meta"><span className="badge ok">Réunion passée</span><time>{date.toLocaleDateString("fr-FR")}</time></div><h2>{meeting.title}</h2>{meeting.minutes?<details><summary>Lire le procès-verbal</summary><div className="article-body">{meeting.minutes}</div></details>:<p>Aucun procès-verbal publié.</p>}{isStaff(profile?.role)&&<form action={saveMeetingMinutes} className="form-stack"><input type="hidden" name="meeting_id" value={meeting.id}/><label>Procès-verbal<textarea name="minutes" rows={5} defaultValue={meeting.minutes||""}/></label><button className="button secondary">Enregistrer le PV</button></form>}</article>;
        })}
      </div>
    </section>
  );
}
