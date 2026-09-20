import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { closeMandate, createCommission, createMandate, createTask, markAllNotificationsRead, markNotificationRead } from "./actions";

const statusLabel:Record<string,string>={
  backlog:"À planifier",in_progress:"En cours",blocked:"Bloquée",done:"Terminée",cancelled:"Annulée"
};
const priorityLabel:Record<string,string>={low:"Faible",normal:"Normale",high:"Haute",urgent:"Urgente"};

export default async function OperationsPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  const [
    {data:profile},
    {data:profiles},
    {data:tasks},
    {data:decisions},
    {data:assemblies},
    {data:commissions},
    {data:commissionMembers},
    {data:mandates},
    {data:notifications},
  ]=await Promise.all([
    supabase.from("profiles").select("role,full_name").eq("id",user!.id).single(),
    supabase.from("profiles").select("id,full_name,role,active").eq("active",true).order("full_name"),
    supabase.from("operational_tasks").select("id,title,description,status,priority,progress,due_on,decision_id,assembly_id,commission_id,assignee_id,blocker_note,auto_generated,completed_at,created_at,updated_at").order("created_at",{ascending:false}),
    supabase.from("decision_register").select("id,number,title,outcome,decision_date").in("outcome",["adopted","elected"]).order("decision_date",{ascending:false}),
    supabase.from("assemblies").select("id,title,starts_at,status").order("starts_at",{ascending:false}).limit(40),
    supabase.from("commissions").select("id,name,description,mandate,status,lead_profile_id,decision_id,starts_on,ends_on").order("created_at",{ascending:false}),
    supabase.from("commission_members").select("commission_id,profile_id,role,left_at"),
    supabase.from("bureau_mandates").select("id,profile_id,title,scope,starts_on,ends_on,status,appointment_basis,decision_id").order("starts_on",{ascending:false}),
    supabase.from("internal_notifications").select("id,kind,title,message,href,source_task_id,read_at,created_at").eq("recipient_id",user!.id).order("created_at",{ascending:false}).limit(20),
  ]);

  if(!isStaff(profile?.role)) notFound();

  const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));
  const decisionMap=new Map((decisions||[]).map(d=>[d.id,d]));
  const assemblyMap=new Map((assemblies||[]).map(a=>[a.id,a]));
  const commissionMap=new Map((commissions||[]).map(c=>[c.id,c]));
  const today=new Date().toISOString().slice(0,10);
  const rows=tasks||[];
  const activeTasks=rows.filter(t=>!["done","cancelled"].includes(t.status));
  const overdue=activeTasks.filter(t=>t.due_on&&t.due_on<today);
  const blocked=activeTasks.filter(t=>t.status==="blocked");
  const unassigned=activeTasks.filter(t=>!t.assignee_id);
  const completed=rows.filter(t=>t.status==="done");
  const unread=(notifications||[]).filter(n=>!n.read_at);

  const byStatus=(status:string)=>rows.filter(t=>t.status===status);

  return <section className="page">
    <header className="page-header">
      <div><span className="eyebrow">Pilotage du Bureau</span><h1>Centre opérationnel</h1></div>
      <div className="header-actions"><span className="status-pill">{unread.length} notification(s) non lue(s)</span></div>
    </header>

    <div className="stat-grid operations-stats">
      <article><small>Actions ouvertes</small><strong>{activeTasks.length}</strong><span>toutes priorités</span></article>
      <article className={overdue.length?"attention-stat":""}><small>En retard</small><strong>{overdue.length}</strong><span>échéance dépassée</span></article>
      <article className={blocked.length?"attention-stat":""}><small>Bloquées</small><strong>{blocked.length}</strong><span>nécessitent une décision</span></article>
      <article><small>Non attribuées</small><strong>{unassigned.length}</strong><span>à affecter</span></article>
      <article><small>Terminées</small><strong>{completed.length}</strong><span>historique conservé</span></article>
    </div>

    <div className="content-grid operations-top-grid">
      <article className="panel">
        <div className="panel-head"><div><span className="eyebrow">Notifications</span><h2>À mon attention</h2></div>{unread.length>0&&<form action={markAllNotificationsRead}><button className="button secondary">Tout marquer lu</button></form>}</div>
        <div className="notification-list">
          {(notifications||[]).slice(0,8).map(n=><div className={"notification-row "+(!n.read_at?"unread":"")} key={n.id}>
            <div><span className="badge">{n.kind}</span><b>{n.title}</b>{n.message&&<small>{n.message}</small>}<time>{new Date(n.created_at).toLocaleString("fr-FR")}</time></div>
            <div>{n.href&&<Link href={n.href}>Ouvrir →</Link>}{!n.read_at&&<form action={markNotificationRead}><input type="hidden" name="notification_id" value={n.id}/><button className="button secondary">Lu</button></form>}</div>
          </div>)}
          {!notifications?.length&&<p>Aucune notification interne.</p>}
        </div>
      </article>

      <article className="panel">
        <span className="eyebrow">Décisions</span><h2>Suivi automatique</h2>
        <div className="decision-followup-list">
          {rows.filter(t=>t.auto_generated).slice(0,8).map(t=>{const d=decisionMap.get(t.decision_id||"");return <Link href={"/operations/tasks/"+t.id} key={t.id}><span><b>{d?.number||"Décision"}</b><small>{t.title}</small></span><span className={"badge task-"+t.status}>{statusLabel[t.status]}</span></Link>})}
          {!rows.some(t=>t.auto_generated)&&<p>Aucune décision nécessitant un suivi.</p>}
        </div>
      </article>
    </div>

    <div className="content-grid">
      <form action={createTask} className="panel form-stack">
        <div><span className="eyebrow">Action</span><h2>Créer une tâche</h2></div>
        <label>Titre<input name="title" required/></label>
        <label>Description<textarea name="description" rows={3}/></label>
        <label>Responsable<select name="assignee_id"><option value="">— À attribuer —</option>{(profiles||[]).map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>)}</select></label>
        <label>Commission<select name="commission_id"><option value="">— Aucune —</option>{(commissions||[]).filter(c=>c.status==="active").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Décision liée<select name="decision_id"><option value="">— Aucune —</option>{(decisions||[]).map(d=><option key={d.id} value={d.id}>{d.number} · {d.title}</option>)}</select></label>
        <label>Assemblée liée<select name="assembly_id"><option value="">— Aucune —</option>{(assemblies||[]).map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
        <label>Priorité<select name="priority"><option value="low">Faible</option><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option></select></label>
        <label>Échéance<input name="due_on" type="date"/></label>
        <button className="button primary">Créer la tâche</button>
      </form>

      <form action={createCommission} className="panel form-stack">
        <div><span className="eyebrow">Commission</span><h2>Créer un groupe de travail</h2></div>
        <label>Nom<input name="name" required/></label>
        <label>Description<textarea name="description" rows={2}/></label>
        <label>Mandat / objectif<textarea name="mandate" rows={3}/></label>
        <label>Responsable<select name="lead_profile_id"><option value="">— À désigner —</option>{(profiles||[]).map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
        <label>Décision d’origine<select name="decision_id"><option value="">— Aucune —</option>{(decisions||[]).map(d=><option key={d.id} value={d.id}>{d.number} · {d.title}</option>)}</select></label>
        <div className="form-two"><label>Début<input name="starts_on" type="date"/></label><label>Fin prévue<input name="ends_on" type="date"/></label></div>
        <button className="button secondary">Créer la commission</button>
      </form>

      <form action={createMandate} className="panel form-stack">
        <div><span className="eyebrow">Mandat</span><h2>Enregistrer une responsabilité</h2></div>
        <label>Titulaire<select name="profile_id" required><option value="">Choisir…</option>{(profiles||[]).map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>)}</select></label>
        <label>Fonction / mandat<input name="title" required placeholder="Président, coordinateur…"/></label>
        <label>Périmètre<textarea name="scope" rows={3}/></label>
        <label>Base de nomination<input name="appointment_basis" placeholder="AG, décision du Bureau…"/></label>
        <label>Décision liée<select name="decision_id"><option value="">— Aucune —</option>{(decisions||[]).map(d=><option key={d.id} value={d.id}>{d.number} · {d.title}</option>)}</select></label>
        <div className="form-two"><label>Début<input name="starts_on" type="date" required/></label><label>Fin prévue<input name="ends_on" type="date"/></label></div>
        <button className="button secondary">Enregistrer le mandat</button>
      </form>
    </div>

    <section className="operations-board-section">
      <div className="section-heading-row"><div><span className="eyebrow">Exécution</span><h2>Tableau des actions</h2></div></div>
      <div className="task-board">
        {["backlog","in_progress","blocked","done"].map(status=><div className={"task-column task-column-"+status} key={status}>
          <div className="task-column-head"><b>{statusLabel[status]}</b><span>{byStatus(status).length}</span></div>
          <div className="task-column-list">{byStatus(status).map(t=>{
            const assignee=profileMap.get(t.assignee_id||"");
            const commission=commissionMap.get(t.commission_id||"");
            const decision=decisionMap.get(t.decision_id||"");
            const late=!!t.due_on&&t.due_on<today&&!["done","cancelled"].includes(t.status);
            return <Link className={"task-card "+(late?"late":"")} href={"/operations/tasks/"+t.id} key={t.id}>
              <div className="article-meta"><span className={"badge priority-"+t.priority}>{priorityLabel[t.priority]}</span>{late&&<span className="badge overdue">Retard</span>}{t.auto_generated&&<span className="badge">Décision</span>}</div>
              <h3>{t.title}</h3>
              <p>{t.description||decision?.title||"Action opérationnelle"}</p>
              <div className="task-progress"><i style={{width:t.progress+"%"}}/></div>
              <small>{t.progress}% · {assignee?.full_name||"Non attribuée"}{commission?" · "+commission.name:""}</small>
              {t.due_on&&<time>Échéance {new Date(t.due_on+"T12:00:00").toLocaleDateString("fr-FR")}</time>}
            </Link>;
          })}{!byStatus(status).length&&<div className="empty-column">Aucune action</div>}</div>
        </div>)}
      </div>
    </section>

    <section className="governance-section">
      <div className="section-heading-row"><div><span className="eyebrow">Structure opérationnelle</span><h2>Commissions actives</h2></div></div>
      <div className="commission-grid">{(commissions||[]).map(c=>{
        const lead=profileMap.get(c.lead_profile_id||"");
        const count=(commissionMembers||[]).filter(m=>m.commission_id===c.id&&!m.left_at).length;
        return <Link className="panel commission-card" href={"/operations/commissions/"+c.id} key={c.id}><span className={"badge status-"+c.status}>{c.status}</span><h3>{c.name}</h3><p>{c.mandate||c.description||"Commission AEDBVT"}</p><small>{lead?.full_name?"Responsable : "+lead.full_name:"Responsable à désigner"} · {count} membre(s)</small><b>Ouvrir →</b></Link>
      })}{!commissions?.length&&<div className="panel empty-state">Aucune commission.</div>}</div>
    </section>

    <section className="governance-section">
      <div className="section-heading-row"><div><span className="eyebrow">Responsabilités</span><h2>Mandats du Bureau</h2></div></div>
      <div className="mandate-grid">{(mandates||[]).map(m=>{const holder=profileMap.get(m.profile_id);return <article className="panel mandate-card" key={m.id}><div className="article-meta"><span className={"badge status-"+m.status}>{m.status}</span></div><h3>{m.title}</h3><b>{holder?.full_name||"Titulaire"}</b><p>{m.scope||m.appointment_basis||"Mandat AEDBVT"}</p><small>Depuis le {new Date(m.starts_on+"T12:00:00").toLocaleDateString("fr-FR")}{m.ends_on?" · jusqu’au "+new Date(m.ends_on+"T12:00:00").toLocaleDateString("fr-FR"):""}</small>{m.status==="active"&&<form action={closeMandate} className="mandate-close"><input type="hidden" name="mandate_id" value={m.id}/><button className="button secondary" name="status" value="completed">Clôturer</button><button className="button secondary" name="status" value="revoked">Révoquer</button></form>}</article>})}</div>
    </section>
  </section>
}
