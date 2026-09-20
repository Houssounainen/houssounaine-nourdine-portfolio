import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { createAnnouncement, toggleAnnouncementPin } from "./actions";

const rank: Record<string, number> = { urgent: 0, alert: 1, info: 2 };

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("announcements").select("id,title,message,level,pinned,published_at,created_at").order("created_at",{ascending:false}),
  ]);

  const announcements = (rows || []).slice().sort((a,b) => Number(b.pinned)-Number(a.pinned) || (rank[a.level] ?? 9)-(rank[b.level] ?? 9) || new Date(b.created_at).getTime()-new Date(a.created_at).getTime());

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Communication rapide</span><h1>Alertes & annonces</h1></div><span className="status-pill">{announcements.filter((x)=>x.pinned).length} épinglée(s)</span></header>

      {isStaff(profile?.role) && (
        <form action={createAnnouncement} className="panel editorial-form">
          <div className="form-title"><div><span className="eyebrow">Bureau</span><h2>Diffuser une annonce</h2></div><button className="button primary">Diffuser</button></div>
          <label>Titre<input name="title" required /></label>
          <label>Niveau<select name="level"><option value="info">Information</option><option value="alert">Alerte</option><option value="urgent">Urgent</option></select></label>
          <label className="wide">Message<textarea name="message" rows={4} required /></label>
          <label className="checkbox-row wide"><input type="checkbox" name="pinned" /> Épingler cette annonce</label>
        </form>
      )}

      <div className="announcement-stack">
        {announcements.map((item) => (
          <article className={"announcement-card panel level-"+item.level} key={item.id}>
            <div className="announcement-icon" aria-hidden="true">{item.level==="urgent"?"!":item.level==="alert"?"⚠":"i"}</div>
            <div className="announcement-copy">
              <div className="article-meta"><span className="badge">{item.level==="urgent"?"Urgent":item.level==="alert"?"Alerte":"Information"}</span>{item.pinned&&<span className="badge pinned">Épinglée</span>}<time>{new Date(item.published_at || item.created_at).toLocaleDateString("fr-FR")}</time></div>
              <h2>{item.title}</h2>
              <p>{item.message}</p>
            </div>
            {isStaff(profile?.role) && <form action={toggleAnnouncementPin}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="next" value={String(!item.pinned)}/><button className="button secondary">{item.pinned?"Désépingler":"Épingler"}</button></form>}
          </article>
        ))}
        {!announcements.length && <div className="panel empty-state">Aucune annonce publiée.</div>}
      </div>
    </section>
  );
}
