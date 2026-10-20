import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { getPeople } from "@/lib/people";
import { relativeTime } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { Sheet } from "@/components/sheet";
import { UiIcon, type IconName } from "@/components/ui-icon";
import { createAnnouncement, toggleAnnouncementPin } from "./actions";

const rank: Record<string, number> = { urgent: 0, alert: 1, info: 2 };
const LEVELS: Record<string, { label: string; color: string; icon: IconName }> = {
  urgent: { label: "Urgent", color: "#f04438", icon: "shield" },
  alert: { label: "Alerte", color: "#f79009", icon: "bell" },
  info: { label: "Information", color: "#2453d6", icon: "info" },
};

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("announcements").select("id,title,message,level,pinned,published_at,created_at,created_by").order("created_at",{ascending:false}),
  ]);
  const staff = isStaff(profile?.role);

  const announcements = (rows || []).slice().sort((a,b) => Number(b.pinned)-Number(a.pinned) || (rank[a.level] ?? 9)-(rank[b.level] ?? 9) || new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
  const people = await getPeople(supabase, announcements.map((item) => (item as { created_by?: string | null }).created_by));
  const pinnedCount = announcements.filter((x)=>x.pinned).length;
  const counts = announcements.reduce((acc, item) => { acc[item.level] = (acc[item.level] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <section className="page hm-ann-page">
      <header className="page-header hm-page-head">
        <span className="icon-tile solid lg" style={{ "--tile": "#f79009" } as React.CSSProperties}><UiIcon name="bell"/></span>
        <div><h1>Annonces</h1><p>Informations officielles du Bureau. {pinnedCount} épinglée{pinnedCount>1?"s":""}.</p></div>
        {staff && <div className="header-actions"><Sheet label="Diffuser une annonce" title="Diffuser une annonce" description="Les membres reçoivent une notification." icon="send" defaultOpen={params.new === "1"} successMessage="Annonce diffusée">
          <form action={createAnnouncement} className="form-stack">
            <label>Titre<input name="title" required /></label>
            <fieldset className="hm-level-pick">
              <legend>Niveau</legend>
              {Object.entries(LEVELS).reverse().map(([value, level]) => <label key={value} style={{ "--lvl": level.color } as React.CSSProperties}>
                <input type="radio" name="level" value={value} defaultChecked={value === "info"}/>
                <span className="icon-tile solid" style={{ "--tile": level.color } as React.CSSProperties}><UiIcon name={level.icon}/></span>{level.label}
              </label>)}
            </fieldset>
            <label>Message<textarea name="message" rows={5} required /></label>
            <label className="checkbox-row"><input type="checkbox" name="pinned" /> Épingler cette annonce</label>
            <button className="button primary">Diffuser</button>
          </form>
        </Sheet></div>}
      </header>

      {announcements.length > 0 && <div className="hm-ann-summary">
        {Object.entries(LEVELS).map(([value, level]) => <span key={value} style={{ "--lvl": level.color } as React.CSSProperties}><i/>{level.label}<b>{counts[value] || 0}</b></span>)}
      </div>}

      <div className="hm-ann-list">
        {announcements.map((item) => {
          const level = LEVELS[item.level] || LEVELS.info;
          const author = (item as { created_by?: string | null }).created_by ? people.get((item as { created_by: string }).created_by) : undefined;
          const date = item.published_at || item.created_at;
          return <article className={"hm-ann level-"+item.level+(item.pinned?" is-pinned":"")} key={item.id} style={{ "--lvl": level.color } as React.CSSProperties}>
            <span className="icon-tile solid lg" style={{ "--tile": level.color } as React.CSSProperties}><UiIcon name={level.icon}/></span>
            <div className="hm-ann-copy">
              <p className="hm-ann-meta"><span className="hm-ann-level">{level.label}</span>{item.pinned&&<span className="hm-ann-pin"><UiIcon name="pin"/>Épinglée</span>}<time dateTime={date}>{relativeTime(date)}</time></p>
              <h2>{item.title}</h2>
              <p className="hm-ann-msg">{item.message}</p>
              <p className="hm-ann-author"><Avatar name={author?.full_name || "Bureau AEDBVT"} url={author?.avatar_url || null} size={24}/><span>{author?.full_name || "Bureau AEDBVT"}</span></p>
            </div>
            {staff && <form action={toggleAnnouncementPin} className="hm-ann-action"><input type="hidden" name="id" value={item.id}/><input type="hidden" name="next" value={String(!item.pinned)}/><button className="button secondary"><UiIcon name="pin"/>{item.pinned?"Désépingler":"Épingler"}</button></form>}
          </article>;
        })}
        {!announcements.length && <div className="hm-empty is-column"><span className="icon-tile solid lg" style={{ "--tile": "#f79009" } as React.CSSProperties}><UiIcon name="bell"/></span><div><b>Aucune annonce publiée</b><small>Les communications officielles du Bureau apparaîtront ici.</small></div></div>}
      </div>
    </section>
  );
}
