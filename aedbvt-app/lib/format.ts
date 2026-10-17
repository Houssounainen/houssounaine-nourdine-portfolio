export const TZ = "Indian/Antananarivo";

export function relativeTime(date: string | Date, now = Date.now()) {
  const value = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.round((now - value.getTime()) / 1000);
  if (seconds < 60) return "à l’instant";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "hier" : `il y a ${days} j`;
  return value.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: value.getFullYear() === new Date(now).getFullYear() ? undefined : "numeric", timeZone: TZ });
}

export function initials(name?: string | null) {
  return (name || "?").split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase();
}

export function isMissingTable(error: { code?: string } | null | undefined) {
  return Boolean(error && ["42P01", "PGRST205", "PGRST200"].includes(error.code || ""));
}

export function publicMediaPrefix() {
  return `${(process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "")}/storage/v1/object/public/community-media/`;
}

/** Ne conserve que des URL d’images de notre propre stockage public. */
export function safeImageUrls(values: FormDataEntryValue[], max: number) {
  const prefix = publicMediaPrefix();
  return values.map(String).filter(url => url.startsWith(prefix) && !url.includes("..")).slice(0, max);
}
