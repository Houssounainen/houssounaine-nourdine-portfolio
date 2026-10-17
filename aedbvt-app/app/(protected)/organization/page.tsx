import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { initials } from "@/lib/format";
import { Sheet, Tabs } from "@/components/sheet";
import { assignPosition } from "./actions";

type Position = { id: string; slug: string; title: string; mission: string | null; parent_slug: string | null; sort_order: number; member_id: string | null; holder: { full_name: string; village: string | null; member_number: string | null } | null };

export default async function OrganizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: positions }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("organization_positions").select("id,slug,title,mission,parent_slug,sort_order,member_id,members(full_name,village,member_number)").eq("active",true).order("sort_order"),
    supabase.from("members").select("id,full_name,member_number,village").eq("status","active").order("full_name"),
  ]);
  const staff = isStaff(profile?.role);
  const rows: Position[] = (positions || []).map((row: any) => ({ ...row, holder: Array.isArray(row.members) ? row.members[0] || null : row.members || null }));
  const children = (parent: string | null) => rows.filter(row => (row.parent_slug || null) === parent);
  const filled = rows.filter(row => row.member_id).length;

  function details(position: Position) {
    return <div className="org-detail">
      <p className="muted" style={{ margin: 0 }}>Mission</p>
      <p>{position.mission || "Mission à préciser."}</p>
      <div className="org-holder-card">
        <span className="avatar" aria-hidden="true">{position.holder ? initials(position.holder.full_name) : "—"}</span>
        <div><b>{position.holder?.full_name || "Poste vacant"}</b><small>{position.holder ? [position.holder.member_number, position.holder.village].filter(Boolean).join(" · ") : "Titulaire à désigner"}</small></div>
      </div>
      {children(position.slug).length > 0 && <><p className="muted" style={{ margin: "16px 0 6px" }}>Rattachés</p><ul className="org-detail-list">{children(position.slug).map(child => <li key={child.id}><b>{child.title}</b><span>{child.holder?.full_name || "Vacant"}</span></li>)}</ul></>}
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
    return <Sheet label={position.title} title={position.title} description={position.holder?.full_name || "Poste vacant"} triggerClassName={`org-chip${position.member_id ? "" : " is-vacant"}${position.parent_slug ? "" : " is-root"}`}
      trigger={<><span className="avatar" aria-hidden="true">{position.holder ? initials(position.holder.full_name) : "?"}</span><span className="org-chip-text"><b>{position.title}</b><small>{position.holder?.full_name || "Vacant"}</small></span></>}>
      {details(position)}
    </Sheet>;
  }

  function branch(parent: string | null): React.ReactNode {
    const list = children(parent);
    if (!list.length) return null;
    return <ul>{list.map(position => <li key={position.id}>{node(position)}{branch(position.slug)}</li>)}</ul>;
  }

  return (
    <section className="page">
      <header className="page-header">
        <div><h1>Organigramme</h1><p>Organes et fonctions de l’association. Sélectionnez un poste pour voir sa mission{staff ? " ou désigner un titulaire" : ""}.</p></div>
        <span className="status-pill">{filled}/{rows.length} postes pourvus</span>
      </header>
      <Tabs tabs={[
        { id: "schema", label: "Schéma", content: <div className="org-chart-scroll"><div className="org-chart">{branch(null)}</div></div> },
        { id: "liste", label: "Liste", count: rows.length, content: <article className="panel list-card">
          {rows.map(position => <div className="list-row" key={position.id} style={{ gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
            <span className="avatar" aria-hidden="true">{position.holder ? initials(position.holder.full_name) : "—"}</span>
            <div><b>{position.title}</b><small>{position.mission}</small></div>
            <span className={position.member_id ? "meta" : "badge pinned"}>{position.holder?.full_name || "Vacant"}</span>
          </div>)}
        </article> },
      ]}/>
    </section>
  );
}
