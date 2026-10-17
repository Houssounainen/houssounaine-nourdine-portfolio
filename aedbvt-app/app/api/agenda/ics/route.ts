import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, match => "\\" + match);

// Export iCalendar (Google Agenda, Apple Calendrier, Outlook) d’un rendez-vous ou de tout l’agenda à venir.
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Connexion requise", { status: 401 });
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id");
  const since = new Date(Date.now() - 864e5).toISOString();

  const [events, meetings] = await Promise.all([
    kind === "meeting" ? Promise.resolve({ data: [] }) : (id ? supabase.from("events").select("id,title,description,location,starts_at,ends_at").eq("id", id) : supabase.from("events").select("id,title,description,location,starts_at,ends_at").gte("starts_at", since)),
    kind === "event" ? Promise.resolve({ data: [] }) : (id ? supabase.from("meetings").select("id,title,location,starts_at,agenda").eq("id", id) : supabase.from("meetings").select("id,title,location,starts_at,agenda").gte("starts_at", since)),
  ]);

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AEDBVT//Agenda//FR", "CALSCALE:GREGORIAN", "X-WR-CALNAME:AEDBVT"];
  for (const event of (events.data || []) as { id: string; title: string; description?: string; location?: string; starts_at: string; ends_at?: string | null }[]) {
    const end = event.ends_at || new Date(new Date(event.starts_at).getTime() + 2 * 3600e3).toISOString();
    lines.push("BEGIN:VEVENT", `UID:event-${event.id}@aedbvt`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(event.starts_at)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(event.title)}`);
    if (event.location) lines.push(`LOCATION:${escape(event.location)}`);
    if (event.description) lines.push(`DESCRIPTION:${escape(event.description)}`);
    lines.push("END:VEVENT");
  }
  for (const meeting of (meetings.data || []) as { id: string; title: string; location?: string; starts_at: string; agenda?: string[] }[]) {
    const end = new Date(new Date(meeting.starts_at).getTime() + 2 * 3600e3).toISOString();
    lines.push("BEGIN:VEVENT", `UID:meeting-${meeting.id}@aedbvt`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(meeting.starts_at)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape("Réunion · " + meeting.title)}`);
    if (meeting.location) lines.push(`LOCATION:${escape(meeting.location)}`);
    if (meeting.agenda?.length) lines.push(`DESCRIPTION:${escape("Ordre du jour :\n" + meeting.agenda.join("\n"))}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), { headers: {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `attachment; filename="${id ? "rendez-vous" : "agenda"}-aedbvt.ics"`,
    "Cache-Control": "private, no-store",
  } });
}
