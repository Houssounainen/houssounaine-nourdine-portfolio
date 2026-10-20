import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { saveMeetingMinutes } from "./actions";
import { AgendaCreateActions, CalendarBoard, type AgendaItem } from "@/components/agenda/calendar-board";
import { UiIcon } from "@/components/ui-icon";
import { getPeople } from "@/lib/people";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ month?: string; new?: string }> }) {
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
  const staff = isStaff(profile?.role);
  const month = /^\d{4}-\d{2}$/.test(params.month || "") ? params.month : undefined;

  const eventCount = new Map<string, number>();
  (eventRegs || []).filter((x) => x.status === "going").forEach((x) => eventCount.set(x.event_id, (eventCount.get(x.event_id) || 0) + 1));
  const meetingCount = new Map<string, number>();
  (meetingRegs || []).filter((x) => x.status === "confirmed").forEach((x) => meetingCount.set(x.meeting_id, (meetingCount.get(x.meeting_id) || 0) + 1));
  const myEvents = new Set((eventRegs || []).filter((x) => x.user_id === user!.id && x.status === "going").map((x) => x.event_id));
  const myMeetings = new Set((meetingRegs || []).filter((x) => x.user_id === user!.id && x.status === "confirmed").map((x) => x.meeting_id));

  const items: AgendaItem[] = [
    ...(events || []).map((item) => ({ id: item.id, kind: "event" as const, title: item.title, starts_at: item.starts_at, ends_at: item.ends_at, location: item.location, label: item.category || "Événement", description: item.description, mine: myEvents.has(item.id), count: eventCount.get(item.id) || 0 })),
    ...(meetings || []).map((item) => ({ id: item.id, kind: "meeting" as const, title: item.title, starts_at: item.starts_at, location: item.location, label: "Réunion · " + (item.mode || "Présentiel"), agenda: Array.isArray(item.agenda) ? item.agenda : [], mine: myMeetings.has(item.id), count: meetingCount.get(item.id) || 0 })),
  ];
  const people = await getPeople(supabase, [
    ...(eventRegs || []).filter((x) => x.status === "going").map((x) => x.user_id),
    ...(meetingRegs || []).filter((x) => x.status === "confirmed").map((x) => x.user_id),
  ]);
  const faces = (ids: string[]) => ids.map((id) => people.get(id)).filter(Boolean).map((p) => ({ name: p!.full_name, url: p!.avatar_url }));
  const eventPeople = new Map<string, string[]>();
  (eventRegs || []).filter((x) => x.status === "going").forEach((x) => eventPeople.set(x.event_id, [...(eventPeople.get(x.event_id) || []), x.user_id]));
  const meetingPeople = new Map<string, string[]>();
  (meetingRegs || []).filter((x) => x.status === "confirmed").forEach((x) => meetingPeople.set(x.meeting_id, [...(meetingPeople.get(x.meeting_id) || []), x.user_id]));
  for (const item of items) item.people = faces((item.kind === "event" ? eventPeople : meetingPeople).get(item.id) || []);
  const upcomingCount = items.filter((item) => new Date(item.starts_at) >= now).length;
  const pastMeetings = (meetings || []).filter((x) => new Date(x.starts_at) < now).reverse();

  return (
    <section className="page agenda-page">
      <header className="page-header hm-page-head">
        <span className="icon-tile solid lg" style={{ "--tile": "#f79009" } as React.CSSProperties}><UiIcon name="calendar"/></span>
        <div><h1>Agenda</h1><p>{upcomingCount} rendez-vous à venir · événements et réunions de l’association.</p></div>
        <div className="header-actions"><a className="button secondary" href="/api/agenda/ics"><UiIcon name="calendar"/>Exporter (.ics)</a>{staff && <AgendaCreateActions defaultOpen={params.new === "1"}/>}</div>
      </header>

      <CalendarBoard items={items} staff={staff} initialMonth={month}/>

      <article className="panel list-card hm-minutes" style={{ marginTop: 24 }}>
        <header><h2>Procès-verbaux des réunions</h2><span className="muted">{pastMeetings.length}</span></header>
        {pastMeetings.slice(0, 12).map((meeting) => <details className="minutes-row" key={meeting.id}>
          <summary className="list-row" style={{ gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
            <span className="date-chip"><b>{new Date(meeting.starts_at).toLocaleDateString("fr-FR", { day: "numeric", timeZone: "Indian/Antananarivo" })}</b><small>{new Date(meeting.starts_at).toLocaleDateString("fr-FR", { month: "short", timeZone: "Indian/Antananarivo" }).replace(".", "")}</small></span>
            <div><b>{meeting.title}</b><small>{meeting.minutes ? "Procès-verbal disponible" : "Procès-verbal à rédiger"}</small></div>
            <span className={"badge" + (meeting.minutes ? " ok" : "")}>{meeting.minutes ? "PV" : "À faire"}</span>
          </summary>
          <div className="minutes-body">
            {meeting.minutes ? <div className="article-body">{meeting.minutes}</div> : <p className="muted">Aucun procès-verbal publié.</p>}
            {staff && <form action={saveMeetingMinutes} className="form-stack"><input type="hidden" name="meeting_id" value={meeting.id}/><label>Procès-verbal<textarea name="minutes" rows={6} defaultValue={meeting.minutes || ""}/></label><button className="button secondary">Enregistrer le PV</button></form>}
          </div>
        </details>)}
        {!pastMeetings.length && <p className="list-empty">Aucune réunion passée.</p>}
      </article>
    </section>
  );
}
