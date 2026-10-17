"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";
import { createEvent, createMeeting, toggleEventRegistration, toggleMeetingAttendance } from "@/app/(protected)/agenda/actions";

export type AgendaItem = {
  id: string; kind: "event" | "meeting"; title: string; starts_at: string; ends_at?: string | null;
  location?: string | null; label: string; description?: string | null; agenda?: string[]; mine: boolean; count: number;
};

const TZ = "Indian/Antananarivo";
const MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const DAYS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const keyOf = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: TZ });
const fromKey = (key: string) => new Date(key + "T12:00:00+03:00");
const addDays = (key: string, days: number) => keyOf(new Date(fromKey(key).getTime() + days * 864e5));
const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const longDay = (key: string) => { const s = fromKey(key).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }); return s.charAt(0).toUpperCase() + s.slice(1); };
const mondayOf = (key: string) => { const day = (fromKey(key).getUTCDay() + 6) % 7; return addDays(key, -day); };

function RsvpForm({ item }: { item: AgendaItem }) {
  const action = item.kind === "event" ? toggleEventRegistration : toggleMeetingAttendance;
  return <form action={action}>
    <input type="hidden" name={item.kind === "event" ? "event_id" : "meeting_id"} value={item.id}/>
    <input type="hidden" name="current" value={item.mine ? "on" : "off"}/>
    <button className={`button ${item.mine ? "secondary" : "primary"}`}>{item.mine ? <><UiIcon name="check"/>{item.kind === "event" ? "Inscrit" : "Présent"}</> : item.kind === "event" ? "Participer" : "Confirmer"}<span className="rsvp-count">{item.count}</span></button>
  </form>;
}

function ItemCard({ item, past }: { item: AgendaItem; past: boolean }) {
  return <article className={`agenda-item kind-${item.kind}${past ? " is-past" : ""}`}>
    <div className="agenda-item-time"><b>{time(item.starts_at)}</b>{item.ends_at && <small>{time(item.ends_at)}</small>}</div>
    <div className="agenda-item-body">
      <p className="agenda-item-meta"><i aria-hidden="true"/>{item.label}{item.location ? ` · ${item.location}` : ""}</p>
      <h3>{item.title}</h3>
      {item.description && <p className="agenda-item-desc">{item.description}</p>}
      {!!item.agenda?.length && <ol>{item.agenda.map(point => <li key={point}>{point}</li>)}</ol>}
      <div className="agenda-item-actions">
        {!past && <RsvpForm item={item}/>}
        <a className="button secondary" href={`/api/agenda/ics?kind=${item.kind}&id=${item.id}`}><UiIcon name="download"/>Ajouter à mon calendrier</a>
      </div>
    </div>
  </article>;
}

function EventForm({ date }: { date?: string }) {
  return <form action={createEvent} className="form-stack">
    <label>Titre<input name="title" required maxLength={160}/></label>
    <div className="form-two">
      <label>Début<input name="starts_at" type="datetime-local" required defaultValue={date ? `${date}T18:00` : undefined}/></label>
      <label>Fin (facultatif)<input name="ends_at" type="datetime-local" defaultValue={date ? `${date}T20:00` : undefined}/></label>
    </div>
    <div className="form-two">
      <label>Catégorie<select name="category"><option>Vie associative</option><option>Académique</option><option>Culturel</option><option>Sport</option><option>Solidarité</option><option>Fête</option><option>Assemblée</option></select></label>
      <label>Lieu<input name="location"/></label>
    </div>
    <label>Description<textarea name="description" rows={3}/></label>
    <button className="button primary">Publier l’événement</button>
  </form>;
}

function MeetingForm({ date }: { date?: string }) {
  return <form action={createMeeting} className="form-stack">
    <label>Titre<input name="title" required maxLength={160}/></label>
    <div className="form-two">
      <label>Date et heure<input name="starts_at" type="datetime-local" required defaultValue={date ? `${date}T17:00` : undefined}/></label>
      <label>Mode<select name="mode"><option>Présentiel</option><option>Visio</option><option>Hybride</option></select></label>
    </div>
    <label>Lieu ou lien<input name="location"/></label>
    <label>Ordre du jour<textarea name="agenda" rows={4} placeholder="Un point par ligne"/></label>
    <button className="button primary">Planifier la réunion</button>
  </form>;
}

export function CalendarBoard({ items, staff, initialMonth }: { items: AgendaItem[]; staff: boolean; initialMonth?: string }) {
  const today = keyOf(new Date());
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [cursor, setCursor] = useState(initialMonth ? `${initialMonth}-01` : today);
  const [selected, setSelected] = useState(today);
  const [filter, setFilter] = useState<"all" | "event" | "meeting" | "mine">("all");

  const visible = useMemo(() => items.filter(item => filter === "all" || (filter === "mine" ? item.mine : item.kind === filter)), [items, filter]);
  const byDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const item of visible) { const key = keyOf(new Date(item.starts_at)); map.set(key, [...(map.get(key) || []), item]); }
    for (const list of map.values()) list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return map;
  }, [visible]);

  const [year, month] = cursor.split("-").map(Number);
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const gridStart = mondayOf(first);
  const monthCells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const weekStart = mondayOf(cursor);
  const weekCells = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  function shift(direction: number) {
    if (view === "week") { const next = addDays(cursor, direction * 7); setCursor(next); setSelected(next); return; }
    const date = new Date(Date.UTC(year, month - 1 + direction, 1));
    setCursor(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`);
  }
  const title = view === "week"
    ? `Semaine du ${fromKey(weekStart).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: TZ })}`
    : `${MONTHS[month - 1].charAt(0).toUpperCase() + MONTHS[month - 1].slice(1)} ${year}`;
  const upcoming = visible.filter(item => keyOf(new Date(item.starts_at)) >= today).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const dayItems = byDay.get(selected) || [];

  return <div className="calendar-board">
    <div className="calendar-toolbar">
      <div className="calendar-nav">
        <button type="button" className="icon-button" onClick={() => shift(-1)} aria-label="Période précédente" disabled={view === "list"}><UiIcon name="chevron" style={{ transform: "rotate(180deg)" }}/></button>
        <button type="button" className="button secondary" onClick={() => { setCursor(today); setSelected(today); }}>Aujourd’hui</button>
        <button type="button" className="icon-button" onClick={() => shift(1)} aria-label="Période suivante" disabled={view === "list"}><UiIcon name="chevron"/></button>
        <h2 aria-live="polite">{view === "list" ? "À venir" : title}</h2>
      </div>
      <div className="calendar-controls">
        <div className="segmented" role="group" aria-label="Affichage">
          {([["month","Mois"],["week","Semaine"],["list","Liste"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)}>{label}</button>)}
        </div>
        <select value={filter} onChange={event => setFilter(event.target.value as typeof filter)} aria-label="Filtrer">
          <option value="all">Tout</option><option value="event">Événements</option><option value="meeting">Réunions</option><option value="mine">Mes inscriptions</option>
        </select>
      </div>
    </div>

    {view !== "list" && <div className="calendar-split">
      <div className={`calendar-grid-view view-${view}`}>
        <div className="calendar-weekdays">{DAYS.map(day => <span key={day}>{day}</span>)}</div>
        <div className="calendar-cells">
          {(view === "month" ? monthCells : weekCells).map(key => {
            const list = byDay.get(key) || [];
            const outside = view === "month" && !key.startsWith(first.slice(0, 7));
            return <button type="button" key={key} onClick={() => setSelected(key)} aria-pressed={selected === key} aria-label={`${longDay(key)}, ${list.length} rendez-vous`}
              className={`calendar-cell${outside ? " is-outside" : ""}${key === today ? " is-today" : ""}${selected === key ? " is-selected" : ""}`}>
              <span className="calendar-cell-day">{Number(key.slice(8))}</span>
              <span className="calendar-cell-items">
                {list.slice(0, view === "week" ? 6 : 2).map(item => <span key={item.kind + item.id} className={`calendar-pill kind-${item.kind}${item.mine ? " is-mine" : ""}`}>{view === "week" && <b>{time(item.starts_at)}</b>}{item.title}</span>)}
                {list.length > (view === "week" ? 6 : 2) && <span className="calendar-more">+{list.length - (view === "week" ? 6 : 2)}</span>}
              </span>
              {list.length > 0 && <span className="calendar-dot" aria-hidden="true"/>}
            </button>;
          })}
        </div>
      </div>
      <aside className="calendar-day-panel" aria-live="polite">
        <header><h3>{longDay(selected)}</h3>{selected === today && <span className="badge">Aujourd’hui</span>}</header>
        {dayItems.map(item => <ItemCard key={item.kind + item.id} item={item} past={selected < today}/>)}
        {!dayItems.length && <p className="list-empty">Rien de prévu ce jour.</p>}
        {staff && selected >= today && <div className="calendar-day-add">
          <Sheet label="Événement ce jour" title="Nouvel événement" description={longDay(selected)} variant="secondary"><EventForm date={selected}/></Sheet>
          <Sheet label="Réunion" title="Nouvelle réunion" description={longDay(selected)} variant="secondary"><MeetingForm date={selected}/></Sheet>
        </div>}
      </aside>
    </div>}

    {view === "list" && <div className="calendar-list">
      {upcoming.map((item, index) => {
        const key = keyOf(new Date(item.starts_at));
        const showDay = index === 0 || keyOf(new Date(upcoming[index - 1].starts_at)) !== key;
        return <div key={item.kind + item.id}>{showDay && <h3 className="calendar-list-day">{longDay(key)}</h3>}<ItemCard item={item} past={false}/></div>;
      })}
      {!upcoming.length && <p className="panel empty-state">Aucun rendez-vous à venir.</p>}
    </div>}
  </div>;
}

export function AgendaCreateActions() {
  return <>
    <Sheet label="Réunion" title="Nouvelle réunion" variant="secondary"><MeetingForm/></Sheet>
    <Sheet label="Événement" title="Nouvel événement"><EventForm/></Sheet>
  </>;
}
