import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { assignPosition } from "./actions";

export default async function OrganizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: positions }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("organization_positions").select("id,slug,title,mission,parent_slug,sort_order,member_id,members(full_name,village,member_number)").eq("active",true).order("sort_order"),
    supabase.from("members").select("id,full_name,member_number,village").eq("status","active").order("full_name"),
  ]);

  const rows = positions || [];
  const byParent = new Map<string, typeof rows>();
  rows.forEach((row) => {
    const key = row.parent_slug || "root";
    byParent.set(key, [...(byParent.get(key) || []), row]);
  });

  function renderBranch(parent: string) {
    return (byParent.get(parent) || []).map((position) => {
      const related = Array.isArray(position.members) ? position.members[0] : position.members;
      return (
        <article className="org-node panel" key={position.id}>
          <span className="eyebrow">{position.slug === "ag" ? "Organe souverain" : "Fonction"}</span>
          <h2>{position.title}</h2>
          <p>{position.mission}</p>
          <div className="org-holder">
            <span className="avatar small">{related?.full_name ? related.full_name.split(" ").map((x:string)=>x[0]).slice(0,2).join("").toUpperCase() : "—"}</span>
            <div><b>{related?.full_name || "Poste non attribué"}</b><small>{related ? [related.member_number,related.village].filter(Boolean).join(" · ") : "À désigner"}</small></div>
          </div>
          {isStaff(profile?.role) && (
            <form action={assignPosition} className="inline-assign">
              <input type="hidden" name="slug" value={position.slug}/>
              <select name="member_id" defaultValue={position.member_id || ""}>
                <option value="">— Aucun titulaire —</option>
                {(members||[]).map((member)=><option key={member.id} value={member.id}>{member.full_name} · {member.member_number || "sans n°"}</option>)}
              </select>
              <button className="button secondary">Attribuer</button>
            </form>
          )}
          {(byParent.get(position.slug) || []).length > 0 && <div className="org-children">{renderBranch(position.slug)}</div>}
        </article>
      );
    });
  }

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Structure & responsabilités</span><h1>Organigramme</h1></div><span className="status-pill">{rows.filter((x)=>x.member_id).length}/{rows.length} postes attribués</span></header>
      <div className="org-tree">{renderBranch("root")}</div>
    </section>
  );
}
