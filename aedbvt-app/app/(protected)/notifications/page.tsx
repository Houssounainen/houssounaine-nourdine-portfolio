import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isPushConfigured } from "@/lib/push";
import { PushControls } from "@/components/push-controls";
import { markAllNotificationsRead, markNotificationRead, updateNotificationPreferences } from "./actions";

export default async function NotificationsPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  const [
    {data:notifications},
    {data:announcements},
    {data:preferences},
    {data:subscriptions},
  ]=await Promise.all([
    supabase.from("internal_notifications").select("id,kind,title,message,href,read_at,created_at").eq("recipient_id",user!.id).order("created_at",{ascending:false}).limit(60),
    supabase.from("announcements").select("id,title,message,level,pinned,published_at,created_at").not("published_at","is",null).order("created_at",{ascending:false}).limit(20),
    supabase.from("notification_preferences").select("announcements,agenda,operations,administration,cases").eq("profile_id",user!.id).maybeSingle(),
    supabase.from("push_subscriptions").select("id").eq("profile_id",user!.id).eq("enabled",true),
  ]);

  const prefs=preferences||{announcements:true,agenda:true,operations:true,administration:true,cases:true};
  const unread=(notifications||[]).filter((n)=>!n.read_at);
  const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||"";

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Alertes & appareils</span><h1>Notifications</h1></div><span className="status-pill">{unread.length} non lue(s)</span></header>

    <div className="content-grid notification-settings-grid">
      <PushControls publicKey={publicKey} configured={isPushConfigured()} deviceCount={subscriptions?.length||0}/>

      <form action={updateNotificationPreferences} className="panel notification-preferences">
        <div><span className="eyebrow">Préférences</span><h2>Ce que je veux recevoir</h2></div>
        <label><input type="checkbox" name="announcements" defaultChecked={prefs.announcements}/> <span><b>Annonces</b><small>Informations, alertes et communications générales.</small></span></label>
        <label><input type="checkbox" name="agenda" defaultChecked={prefs.agenda}/> <span><b>Agenda</b><small>Nouveaux événements et réunions publiés.</small></span></label>
        <label><input type="checkbox" name="operations" defaultChecked={prefs.operations}/> <span><b>Pilotage</b><small>Tâches attribuées et alertes opérationnelles vous concernant.</small></span></label>
        <label><input type="checkbox" name="administration" defaultChecked={prefs.administration}/> <span><b>Secrétariat</b><small>Documents délivrés et suivis administratifs vous concernant.</small></span></label>
        <label><input type="checkbox" name="cases" defaultChecked={prefs.cases}/> <span><b>Dossiers confidentiels</b><small>Alertes génériques lorsqu’un signalement confidentiel reçoit une mise à jour. Aucun contenu sensible n’apparaît dans le push.</small></span></label>
        <button className="button secondary">Enregistrer mes préférences</button>
      </form>
    </div>

    <div className="content-grid notifications-content">
      <article className="panel">
        <div className="panel-head"><div><span className="eyebrow">Personnel</span><h2>Mes alertes internes</h2></div>{unread.length>0&&<form action={markAllNotificationsRead}><button className="button secondary">Tout marquer lu</button></form>}</div>
        <div className="notification-center-list">
          {(notifications||[]).map((item)=><div className={!item.read_at?"unread":""} key={item.id}>
            <span className="notification-kind">{item.kind}</span>
            <div><b>{item.title}</b>{item.message&&<p>{item.message}</p>}<small>{new Date(item.created_at).toLocaleString("fr-FR")}</small></div>
            <div>{item.href&&<Link href={item.href}>Ouvrir →</Link>}{!item.read_at&&<form action={markNotificationRead}><input type="hidden" name="notification_id" value={item.id}/><button>Marquer lu</button></form>}</div>
          </div>)}
          {!notifications?.length&&<p>Aucune notification personnelle.</p>}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><span className="eyebrow">Association</span><h2>Dernières annonces</h2></div><Link href="/announcements">Toutes les annonces →</Link></div>
        <div className="notification-announcement-list">
          {(announcements||[]).map((item)=><Link href="/announcements" key={item.id}><span className={"badge level-"+item.level}>{item.level}</span><div><b>{item.title}</b><p>{item.message}</p><small>{new Date(item.published_at||item.created_at).toLocaleString("fr-FR")}</small></div></Link>)}
          {!announcements?.length&&<p>Aucune annonce.</p>}
        </div>
      </article>
    </div>
  </section>
}
