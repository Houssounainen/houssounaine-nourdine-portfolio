import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isPushConfigured } from "@/lib/push";
import { PushControls } from "@/components/push-controls";
import { UiIcon, type IconName } from "@/components/ui-icon";
import { relativeTime } from "@/lib/format";
import { markAllNotificationsRead, markNotificationRead, updateNotificationPreferences } from "./actions";

const KIND_STYLE: Record<string,{icon:IconName;color:string;label:string}>={
  info:{icon:"info",color:"#2453d6",label:"Information"},
  task:{icon:"check",color:"#7a5af8",label:"Tâche"},
  deadline:{icon:"clock",color:"#f79009",label:"Échéance"},
  decision:{icon:"shield",color:"#15b79e",label:"Décision"},
  warning:{icon:"bell",color:"#f2545b",label:"Alerte"},
};
const LEVEL_COLOR: Record<string,string>={alert:"#f2545b",warning:"#f79009",urgent:"#f2545b",info:"#0ba5ec",success:"#12b76a"};

function dayGroup(date:string){
  const d=new Date(date); const now=new Date();
  const days=Math.floor((new Date(now.toDateString()).getTime()-new Date(d.toDateString()).getTime())/864e5);
  return days<=0?"Aujourd’hui":days===1?"Hier":days<7?"Cette semaine":"Plus tôt";
}

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

  return <section className="page soc-notifs">
    <header className="page-header"><div><h1>Notifications</h1><p>Vos alertes personnelles et la vie de l’association.</p></div></header>

    <div className="soc-notif-layout">
      <article className="panel soc-notif-panel">
        <div className="soc-notif-head">
          <div><h2>Mes alertes</h2><p>{unread.length?`${unread.length} non lue${unread.length>1?"s":""}`:"Vous êtes à jour"}</p></div>
          {unread.length>0&&<form action={markAllNotificationsRead}><button className="button secondary"><UiIcon name="check"/>Tout marquer lu</button></form>}
        </div>
        <div className="soc-notif-list">
          {(notifications||[]).map((item,index,list)=>{
            const style=KIND_STYLE[item.kind]||KIND_STYLE.info;
            const group=dayGroup(item.created_at);
            const showGroup=index===0||dayGroup(list[index-1].created_at)!==group;
            const body=<><span className="icon-tile lg solid" style={{"--tile":style.color} as React.CSSProperties}><UiIcon name={style.icon}/></span>
              <span className="soc-notif-text"><b>{item.title}</b>{item.message&&<span>{item.message}</span>}<small><em style={{color:style.color}}>{style.label}</em> · <time dateTime={item.created_at} title={new Date(item.created_at).toLocaleString("fr-FR")}>{relativeTime(item.created_at)}</time></small></span></>;
            return <div key={item.id}>
              {showGroup&&<p className="soc-notif-group">{group}</p>}
              <div className={`soc-notif${!item.read_at?" is-unread":""}`}>
                {item.href?<Link className="soc-notif-main" href={item.href}>{body}</Link>:<div className="soc-notif-main">{body}</div>}
                {!item.read_at&&<form action={markNotificationRead}><input type="hidden" name="notification_id" value={item.id}/><button className="soc-notif-read" aria-label={`Marquer « ${item.title} » comme lue`} title="Marquer comme lue"><i aria-hidden="true"/></button></form>}
              </div>
            </div>;
          })}
          {!notifications?.length&&<div className="soc-empty"><span className="icon-tile lg solid" style={{"--tile":"#2453d6"} as React.CSSProperties}><UiIcon name="bell"/></span><h3>Aucune notification</h3><p>Les tâches, échéances et décisions vous concernant apparaîtront ici.</p></div>}
        </div>
      </article>

      <aside className="soc-notif-side">
        <article className="panel soc-side-card">
          <header><h2>Dernières annonces</h2><Link href="/announcements">Tout voir</Link></header>
          {(announcements||[]).map((item)=><Link className="soc-notif-announce" href="/announcements" key={item.id}>
            <span className="icon-tile" style={{"--tile":LEVEL_COLOR[item.level]||"#0ba5ec"} as React.CSSProperties}><UiIcon name={item.pinned?"pin":"bell"}/></span>
            <span><b>{item.title}</b><span>{item.message}</span><small>{relativeTime(item.published_at||item.created_at)}</small></span>
          </Link>)}
          {!announcements?.length&&<p className="soc-notif-none">Aucune annonce.</p>}
        </article>
      </aside>
    </div>

    <h2 className="soc-notif-settings-title"><UiIcon name="filter"/>Réglages</h2>
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

  </section>
}
