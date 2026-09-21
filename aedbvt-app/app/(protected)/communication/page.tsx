import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { sendInternalBroadcast } from "./actions";

const segmentLabels:Record<string,string>={
  all:"Tous les comptes actifs",
  staff:"Bureau & staff",
  role:"Rôle",
  village:"Village",
};

export default async function CommunicationPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:broadcasts}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("internal_broadcasts")
      .select("id,title,message,priority,segment_type,segment_value,recipient_count,sent_at,created_by")
      .order("sent_at",{ascending:false})
      .limit(50),
  ]);
  if(!can(profile?.role,"communication_manage")) notFound();

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Communication interne</span><h1>Messages ciblés</h1></div><span className="status-pill">{broadcasts?.length||0} campagne(s)</span></header>

    <div className="content-grid communication-grid">
      <form action={sendInternalBroadcast} className="panel form-stack">
        <div><span className="eyebrow">Nouvelle campagne</span><h2>Envoyer un message</h2></div>
        <label>Titre<input name="title" maxLength={120} required/></label>
        <label>Message<textarea name="message" rows={6} maxLength={1200} required/></label>
        <label>Priorité<select name="priority" defaultValue="info"><option value="info">Information</option><option value="warning">Important</option><option value="urgent">Urgent</option></select></label>
        <label>Segment<select name="segment_type" defaultValue="all"><option value="all">Tous les comptes actifs</option><option value="staff">Bureau & staff</option><option value="role">Un rôle précis</option><option value="village">Un village</option></select></label>
        <label>Rôle cible<select name="role_value" defaultValue="membre"><option value="membre">Membres</option><option value="secretaire">Secrétaires</option><option value="tresorier">Trésoriers</option><option value="bureau">Bureau</option><option value="admin">Administrateurs</option></select></label>
        <label>Village cible<select name="village_value" defaultValue="Darsalama"><option>Darsalama</option><option>Bandrani-Vouani</option></select></label>
        <p className="form-hint">Les champs Rôle/Village sont utilisés uniquement si le segment correspondant est sélectionné.</p>
        <button className="button primary">Envoyer la communication</button>
      </form>

      <article className="panel communication-help">
        <span className="eyebrow">Canaux</span><h2>Distribution</h2>
        <div className="communication-channel"><b>Notification interne</b><small>Créée pour chaque destinataire sélectionné.</small></div>
        <div className="communication-channel"><b>Notification push</b><small>Envoyée aux appareils abonnés qui autorisent les annonces.</small></div>
        <div className="communication-channel"><b>Historique</b><small>La campagne, le segment et le nombre de destinataires sont conservés.</small></div>
        <div className="notice">Les messages ciblés ne sont pas publiés comme actualités publiques.</div>
      </article>
    </div>

    <article className="panel">
      <div className="panel-head"><div><span className="eyebrow">Traçabilité</span><h2>Historique des campagnes</h2></div></div>
      <div className="broadcast-list">
        {(broadcasts||[]).map((item)=><div key={item.id}>
          <span className={"badge broadcast-"+item.priority}>{item.priority}</span>
          <div><b>{item.title}</b><p>{item.message}</p><small>{segmentLabels[item.segment_type]||item.segment_type}{item.segment_value?" · "+item.segment_value:""} · {item.recipient_count} destinataire(s)</small></div>
          <time>{new Date(item.sent_at).toLocaleString("fr-FR")}</time>
        </div>)}
        {!broadcasts?.length&&<p>Aucune campagne interne envoyée.</p>}
      </div>
    </article>
  </section>;
}
