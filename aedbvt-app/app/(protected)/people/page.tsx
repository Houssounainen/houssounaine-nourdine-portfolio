import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/server-access";
import { normalizeRole, ROLE_LABELS } from "@/lib/access";
import { Avatar, AvatarStack } from "@/components/avatar";
import { UiIcon } from "@/components/ui-icon";
import { ROLE_COLORS } from "@/lib/social";

export const dynamic = "force-dynamic";
export const metadata = { title: "Annuaire" };

type PersonRow = { id: string; full_name: string; avatar_url: string | null; role: string; village: string | null; program: string | null; study_level: string | null; member_number: string | null; joined_at: string | null };


function hrefWith(params: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...patch })) if (value) next.set(key, value);
  const query = next.toString();
  return query ? `/people?${query}` : "/people";
}

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; village?: string; program?: string }> }) {
  const params = await searchParams;
  const context = await getAccessContext();
  if (!context.user) redirect("/login?next=/people");
  if (!context.allowed) redirect("/access-denied");

  const q = (params.q || "").trim().slice(0, 80);
  const { data, error } = await context.supabase.rpc("list_people", { p_query: null, p_limit: 500 });
  const everyone = (Array.isArray(data) ? data : []) as PersonRow[];
  const villages = [...new Set(everyone.map(person => person.village).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fr"));
  const programs = [...new Set(everyone.map(person => person.program).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fr"));
  const needle = q.toLocaleLowerCase("fr");
  const people = everyone.filter(person =>
    (!params.village || person.village === params.village)
    && (!params.program || person.program === params.program)
    && (!needle || [person.full_name, person.program, person.village, person.study_level].some(value => value?.toLocaleLowerCase("fr").includes(needle))));
  const filtered = Boolean(q || params.village || params.program);
  const current = { q: q || undefined, village: params.village, program: params.program };

  return <section className="page soc-people">
    <header className="soc-people-hero">
      <div>
        <span className="soc-hero-kicker"><UiIcon name="users"/>Annuaire des membres</span>
        <h1>Les étudiants de Bandrélé à Tuléar</h1>
        <p>Retrouvez un membre, son village et sa filière, puis consultez son profil.</p>
      </div>
      {everyone.length > 0 && <div className="soc-people-hero-stack">
        <AvatarStack people={everyone.map(person => ({ name: person.full_name, url: person.avatar_url }))} max={7} size={40}/>
        <small><b>{everyone.length}</b> membre{everyone.length > 1 ? "s" : ""} actif{everyone.length > 1 ? "s" : ""}</small>
      </div>}
    </header>

    <form className="soc-people-search" action="/people" role="search">
      <label className="sr-only" htmlFor="people-q">Rechercher un membre</label>
      <UiIcon name="search"/>
      <input id="people-q" name="q" defaultValue={q} placeholder="Nom, filière, village…" autoComplete="off"/>
      {params.village && <input type="hidden" name="village" value={params.village}/>}
      <label className="sr-only" htmlFor="people-program">Filière</label>
      <select id="people-program" name="program" defaultValue={params.program || ""}>
        <option value="">Toutes les filières</option>
        {programs.map(program => <option key={program} value={program}>{program}</option>)}
      </select>
      <button className="button primary" type="submit">Rechercher</button>
    </form>

    {villages.length > 0 && <nav className="soc-people-villages" aria-label="Filtrer par village">
      <Link href={hrefWith(current, { village: undefined })} className={`soc-cat-chip${!params.village ? " is-active" : ""}`} style={{ "--cat": "#101828" } as React.CSSProperties} aria-current={!params.village ? "page" : undefined}><UiIcon name="mapPin"/>Tous les villages</Link>
      {villages.map(village => <Link key={village} href={hrefWith(current, { village })} className={`soc-cat-chip${params.village === village ? " is-active" : ""}`} style={{ "--cat": "#15b79e" } as React.CSSProperties} aria-current={params.village === village ? "page" : undefined}><UiIcon name="mapPin"/>{village}</Link>)}
    </nav>}

    {error && <p className="notice">L’annuaire n’a pas pu être chargé. Actualisez la page.</p>}
    {filtered && <p className="soc-people-count">{people.length} résultat{people.length > 1 ? "s" : ""} · <Link href="/people">Effacer les filtres</Link></p>}

    <div className="soc-people-grid">
      {people.map(person => {
        const role = normalizeRole(person.role);
        const color = ROLE_COLORS[role];
        return <Link className="soc-person-card" key={person.id} href={`/people/${person.id}`}>
          <span className="soc-person-cover" aria-hidden="true"/>
          <Avatar name={person.full_name} url={person.avatar_url} size={76} ring/>
          <b>{person.full_name}{person.id === context.user!.id && <small> · vous</small>}</b>
          <span className="soc-role-badge" style={{ "--role": color } as React.CSSProperties}>{ROLE_LABELS[role]}</span>
          <span className="soc-person-meta">
            {(person.program || person.study_level) && <span><UiIcon name="cap"/>{[person.program, person.study_level].filter(Boolean).join(" · ")}</span>}
            {person.village && <span><UiIcon name="mapPin"/>{person.village}</span>}
          </span>
          <span className="soc-person-cta">Voir le profil</span>
        </Link>;
      })}
    </div>
    {!people.length && !error && <div className="panel soc-empty">
      <span className="icon-tile lg solid" style={{ "--tile": "#2453d6" } as React.CSSProperties}><UiIcon name="users"/></span>
      <h2>Aucun membre trouvé</h2>
      <p>{filtered ? "Essayez un autre nom, une autre filière ou un autre village." : "Les membres actifs apparaîtront ici."}</p>
      {filtered && <Link className="button secondary" href="/people">Voir tout l’annuaire</Link>}
    </div>}
  </section>;
}
