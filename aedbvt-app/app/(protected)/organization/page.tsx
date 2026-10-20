import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { getPeople } from "@/lib/people";
import { Avatar } from "@/components/avatar";
import { UiIcon } from "@/components/ui-icon";
import { Sheet, Tabs } from "@/components/sheet";
import { assignPosition } from "./actions";

type Holder = { full_name: string; village: string | null; member_number: string | null; profile_id: string | null };
type Position = { id: string; slug: string; title: string; mission: string | null; parent_slug: string | null; sort_order: number; member_id: string | null; holder: Holder | null };

/** Couleurs des pôles : chaque fonction du Bureau a sa teinte, héritée par ses rattachés. */
const POLE_COLORS = ["#2453d6", "#7a5af8", "#15b79e", "#f79009", "#ee46bc", "#0ba5ec", "#f2545b", "#12b76a"];
const ROOT_COLOR = "#101828";

export default async function OrganizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: positions }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("organization_positions").select("id,slug,title,mission,parent_slug,sort_order,member_id,members(full_name,village,member_number,profile_id)").eq("active",true).order("sort_order"),
    supabase.from("members").select("id,full_name,member_number,village").eq("status","active").order("full_name"),
  ]);
  const staff = isStaff(profile?.role);
  const rows: Position[] = (positions || []).map((row: any) => ({ ...row, holder: Array.isArray(row.members) ? row.members[0] || null : row.members || null }));
  const children = (parent: string | null) => rows.filter(row => (row.parent_slug || null) === parent);
  const filled = rows.filter(row => row.member_id).length;

  // Photos de profil des titulaires (members.profile_id → profiles.avatar_url)
  const people = await getPeople(supabase, rows.map(row => row.holder?.profile_id));
  const photoOf = (position: Position) => position.holder?.profile_id ? people.get(position.holder.profile_id)?.avatar_url || null : null;
  const profileHref = (position: Position) => position.holder?.profile_id ? `/people/${position.holder.profile_id}` : undefined;

  // Couleur par pôle selon la profondeur dans l’arbre
  const colors = new Map<string, string>();
  let next = 0;
  const paint = (parent: string | null, depth: number, inherited: string) => {
    for (const position of children(parent)) {
      const color = depth === 0 ? ROOT_COLOR : depth <= 2 ? POLE_COLORS[next++ % POLE_COLORS.length] : inherited;
      colors.set(position.slug, color);
      paint(position.slug, depth + 1, color);
    }
  };
  paint(null, 0, POLE_COLORS[0]);
  for (const row of rows) if (!colors.has(row.slug)) colors.set(row.slug, POLE_COLORS[next++ % POLE_COLORS.length]);
  const colorOf = (position: Position) => ({ "--pole": colors.get(position.slug) } as React.CSSProperties);

  function details(position: Position) {
    return <div className="org-detail hm-org-detail" style={colorOf(position)}>
      <div className="hm-org-holder">
        <Avatar name={position.holder?.full_name || "?"} url={photoOf(position)} size={64} href={profileHref(position)}/>
        <div><b>{position.holder?.full_name || "Poste vacant"}</b><small>{position.holder ? [position.holder.member_number, position.holder.village].filter(Boolean).join(" · ") || "Titulaire" : "Titulaire à désigner"}</small></div>
      </div>
      <p className="hm-org-label">Mission</p>
      <p className="hm-org-mission">{position.mission || "Mission à préciser."}</p>
      {children(position.slug).length > 0 && <><p className="hm-org-label">Rattachés</p><ul className="hm-org-sublist">{children(position.slug).map(child => <li key={child.id} style={colorOf(child)}>
        <Avatar name={child.holder?.full_name || child.title} url={photoOf(child)} size={34}/>
        <span><b>{child.title}</b><small>{child.holder?.full_name || "Vacant"}</small></span>
      </li>)}</ul></>}
      {staff && <form action={assignPosition} className="form-stack" style={{ marginTop: 20 }}>
        <input type="hidden" name="slug" value={position.slug}/>
        <label>Titulaire<select name="member_id" defaultValue={position.member_id || ""}>
          <option value="">Aucun titulaire</option>
          {(members || []).map(member => <option key={member.id} value={member.id}>{member.full_name} · {member.member_number || "sans n°"}</option>)}
        </select></label>
        <button className="button primary">Enregistrer</button>
      </form>}
    </div>;
  }

  function node(position: Position) {
    return <Sheet label={position.title} title={position.title} description={position.holder?.full_name || "Poste vacant"} successMessage="Titulaire enregistré"
      triggerClassName={`org-chip hm-org-chip${position.member_id ? "" : " is-vacant"}${position.parent_slug ? "" : " is-root"}`}
      trigger={<span className="hm-org-chip-in" style={colorOf(position)}>
        {position.holder
          ? <Avatar name={position.holder.full_name} url={photoOf(position)} size={40}/>
          : <span className="hm-org-vacant-av" aria-hidden="true"><UiIcon name="user"/></span>}
        <span className="org-chip-text"><b>{position.title}</b><small>{position.holder?.full_name || "Poste vacant"}</small></span>
      </span>}>
      {details(position)}
    </Sheet>;
  }

  function branch(parent: string | null): React.ReactNode {
    const list = children(parent);
    if (!list.length) return null;
    return <ul>{list.map(position => <li key={position.id} style={colorOf(position)}>{node(position)}{branch(position.slug)}</li>)}</ul>;
  }

  const leaders = rows.filter(row => row.holder && row.parent_slug);
  const percent = rows.length ? Math.round(filled / rows.length * 100) : 0;

  return (
    <section className="page hm-org">
      <header className="page-header hm-page-head">
        <span className="icon-tile solid lg" style={{ "--tile": "#0ba5ec" } as React.CSSProperties}><UiIcon name="users"/></span>
        <div><h1>Organigramme</h1><p>Organes et fonctions de l’association. Sélectionnez un poste pour voir sa mission{staff ? " ou désigner un titulaire" : ""}.</p></div>
        <span className="hm-org-meter" aria-label={`${filled} postes pourvus sur ${rows.length}`}><span style={{ "--p": percent + "%" } as React.CSSProperties}/><b>{filled}/{rows.length}</b> postes pourvus</span>
      </header>

      {leaders.length > 0 && <section className="hm-org-team" aria-label="Responsables">
        {leaders.map(position => <article key={position.id} className="hm-org-card" style={colorOf(position)}>
          <span className="hm-org-card-band" aria-hidden="true"/>
          <Avatar name={position.holder!.full_name} url={photoOf(position)} size={72} href={profileHref(position)} ring/>
          <b>{position.holder!.full_name}</b>
          <span className="hm-org-card-role">{position.title}</span>
          {position.holder!.village && <small><UiIcon name="pin"/>{position.holder!.village}</small>}
        </article>)}
      </section>}

      {!rows.length ? <div className="hm-empty is-column"><span className="icon-tile solid lg" style={{ "--tile": "#0ba5ec" } as React.CSSProperties}><UiIcon name="users"/></span><div><b>Organigramme à construire</b><small>Les postes de l’association apparaîtront ici.</small></div></div>
      : <Tabs tabs={[
        { id: "schema", label: "Schéma", content: <div className="org-chart-scroll hm-org-scroll"><div className="org-chart hm-org-chart">{branch(null)}</div></div> },
        { id: "liste", label: "Liste", count: rows.length, content: <div className="hm-org-list">
          {rows.map(position => <div className="hm-org-row" key={position.id} style={colorOf(position)}>
            {position.holder ? <Avatar name={position.holder.full_name} url={photoOf(position)} size={44}/> : <span className="hm-org-vacant-av is-lg" aria-hidden="true"><UiIcon name="user"/></span>}
            <div><b>{position.title}</b><small>{position.mission}</small></div>
            <span className={position.member_id ? "hm-org-name" : "badge pinned"}>{position.holder?.full_name || "Vacant"}</span>
          </div>)}
        </div> },
      ]}/>}
    </section>
  );
}
