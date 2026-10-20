import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { Sheet, Tabs } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";
import { FilterList } from "@/components/manage/filter-list";
import { closeMandate, createCommission, createMandate, createTask, markAllNotificationsRead, markNotificationRead } from "./actions";
import "@/app/manage.css";
import { PageIcon } from "@/components/manage/page-icon";
import { Avatar } from "@/components/avatar";
import { getPeople } from "@/lib/people";

const statusLabel:Record<string,string>={
  backlog:"À planifier",in_progress:"En cours",blocked:"Bloquée",done:"Terminée",cancelled:"Annulée"
};
const priorityLabel:Record<string,string>={low:"Faible",normal:"Normale",high:"Haute",urgent:"Urgente"};
const groupStatus:Record<string,string>={active:"Active",closed:"Clôturée",completed:"Terminée",suspended:"Suspendue",revoked:"Révoqué"};
const mandateStatus:Record<string,string>={active:"En cours",completed:"Terminé",revoked:"Révoqué"};
const day=(value:string)=>new Date(value+"T12:00:00").toLocaleDateString("fr-FR");
const shortDay=(value:string)=>new Date(value+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"});

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
  const people=await getPeople(supabase,(profiles||[]).map(p=>p.id));
  const face=(id:string|null|undefined,size=22)=>{const person=id?profileMap.get(id):null;return person?<Avatar name={person.full_name} url={people.get(person.id)?.avatar_url} size={size}/>:null;};
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
  const followUps=rows.filter(t=>t.auto_generated);
  const activeCommissions=(commissions||[]).filter(c=>c.status==="active");
  const activeMandates=(mandates||[]).filter(m=>m.status==="active");

  const byStatus=(status:string)=>rows.filter(t=>t.status===status);
  const isLate=(t:{due_on:string|null;status:string})=>!!t.due_on&&t.due_on<today&&!["done","cancelled"].includes(t.status);
  const listRows=[...rows].sort((a,b)=>{
    const aOpen=["done","cancelled"].includes(a.status)?1:0, bOpen=["done","cancelled"].includes(b.status)?1:0;
    if(aOpen!==bOpen) return aOpen-bOpen;
    return (a.due_on||"9999-12-31").localeCompare(b.due_on||"9999-12-31");
  });

  /* ———— Formulaires (mêmes actions et champs qu’avant) ———— */
  const taskForm=<form action={createTask} className="form-stack">
    <p className="form-section">Tâche</p>
    <label>Titre<input name="title" required/></label>
    <label>Description<textarea name="description" rows={3}/></label>
    <p className="form-section">Affectation</p>
    <label>Responsable<select name="assignee_id"><option value="">— À attribuer —</option>{(profiles||[]).map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>)}</select></label>
    <div className="form-two">
      <label>Priorité<select name="priority"><option value="low">Faible</option><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option></select></label>
      <label>Échéance<input name="due_on" type="date"/></label>
    </div>
    <p className="form-section">Rattachement</p>
    <label>Commission<select name="commission_id"><option value="">— Aucune —</option>{activeCommissions.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label>Décision liée<select name="decision_id"><option value="">— Aucune —</option>{(decisions||[]).map(d=><option key={d.id} value={d.id}>{d.number} · {d.title}</option>)}</select></label>
    <label>Assemblée liée<select name="assembly_id"><option value="">— Aucune —</option>{(assemblies||[]).map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
    <button className="button primary">Créer la tâche</button>
  </form>;

  const commissionForm=<form action={createCommission} className="form-stack">
    <p className="form-section">Commission</p>
    <label>Nom<input name="name" required/></label>
    <label>Description<textarea name="description" rows={2}/></label>
    <label>Mandat / objectif<textarea name="mandate" rows={3}/></label>
    <p className="form-section">Pilotage</p>
    <label>Responsable<select name="lead_profile_id"><option value="">— À désigner —</option>{(profiles||[]).map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
    <label>Décision d’origine<select name="decision_id"><option value="">— Aucune —</option>{(decisions||[]).map(d=><option key={d.id} value={d.id}>{d.number} · {d.title}</option>)}</select></label>
    <div className="form-two"><label>Début<input name="starts_on" type="date"/></label><label>Fin prévue<input name="ends_on" type="date"/></label></div>
    <button className="button primary">Créer la commission</button>
  </form>;

  const mandateForm=<form action={createMandate} className="form-stack">
    <p className="form-section">Titulaire</p>
    <label>Titulaire<select name="profile_id" required><option value="">Choisir…</option>{(profiles||[]).map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>)}</select></label>
    <label>Fonction / mandat<input name="title" required placeholder="Président, coordinateur…"/></label>
    <label>Périmètre<textarea name="scope" rows={3}/></label>
    <p className="form-section">Base et durée</p>
    <label>Base de nomination<input name="appointment_basis" placeholder="AG, décision du Bureau…"/></label>
    <label>Décision liée<select name="decision_id"><option value="">— Aucune —</option>{(decisions||[]).map(d=><option key={d.id} value={d.id}>{d.number} · {d.title}</option>)}</select></label>
    <div className="form-two"><label>Début<input name="starts_on" type="date" required/></label><label>Fin prévue<input name="ends_on" type="date"/></label></div>
    <button className="button primary">Enregistrer le mandat</button>
  </form>;

  const taskSheet=(variant:"primary"|"secondary"="primary")=><Sheet label="Nouvelle tâche" title="Nouvelle tâche" description="Action à suivre, avec responsable et échéance." variant={variant}>{taskForm}</Sheet>;
  const commissionSheet=(variant:"primary"|"secondary"="secondary")=><Sheet label="Commission" title="Nouvelle commission" description="Groupe de travail avec responsable et mandat." icon="users" variant={variant}>{commissionForm}</Sheet>;
  const mandateSheet=(variant:"primary"|"secondary"="secondary")=><Sheet label="Mandat" title="Nouveau mandat" description="Responsabilité confiée à un membre du Bureau." icon="shield" variant={variant}>{mandateForm}</Sheet>;

  /* ———— Vues ———— */
  const board=<div className="task-board">
    {["backlog","in_progress","blocked","done"].map(status=><div className={"task-column task-column-"+status} key={status}>
      <div className="task-column-head"><b>{statusLabel[status]}</b><span>{byStatus(status).length}</span></div>
      <div className="task-column-list">{byStatus(status).map(t=>{
        const assignee=profileMap.get(t.assignee_id||"");
        const commission=commissionMap.get(t.commission_id||"");
        const decision=decisionMap.get(t.decision_id||"");
        const late=isLate(t);
        return <Link className={"task-card "+(late?"late":"")} href={"/operations/tasks/"+t.id} key={t.id}>
          <div className="article-meta"><span className={"badge priority-"+t.priority}>{priorityLabel[t.priority]}</span>{late&&<span className="badge overdue">Retard</span>}{t.auto_generated&&<span className="badge">Décision</span>}</div>
          <h3>{t.title}</h3>
          {(t.description||decision?.title)&&<p>{t.description||decision?.title}</p>}
          {status!=="backlog"&&<div className="task-progress"><i style={{width:t.progress+"%"}}/></div>}
          <div className="card-foot"><span className="mg-person">{face(t.assignee_id)}{assignee?.full_name||"Non attribuée"}{commission?" · "+commission.name:""}</span>{t.due_on&&<time>{shortDay(t.due_on)}</time>}</div>
        </Link>;
      })}{!byStatus(status).length&&<div className="empty-column">Aucune action</div>}</div>
    </div>)}
  </div>;

  const list=<FilterList
    placeholder="Rechercher une tâche, un responsable, une commission…"
    filters={[
      {key:"priority",label:"Priorité",options:Object.entries(priorityLabel).map(([value,label])=>({value,label}))},
      {key:"status",label:"Statut",mode:"select",options:Object.entries(statusLabel).map(([value,label])=>({value,label}))},
    ]}
    table={<tr><th>Tâche</th><th>Priorité</th><th>Statut</th><th>Responsable</th><th>Échéance</th><th>Avancement</th></tr>}
    empty={<div className="panel empty-state mg-empty-auto"><p>Aucune tâche pour le moment.</p>{taskSheet()}</div>}
    items={listRows.map(t=>{
      const assignee=profileMap.get(t.assignee_id||"");
      const commission=commissionMap.get(t.commission_id||"");
      const decision=decisionMap.get(t.decision_id||"");
      const assembly=assemblyMap.get(t.assembly_id||"");
      const context=[commission?.name,decision?.number,assembly?.title].filter(Boolean).join(" · ");
      const late=isLate(t);
      return {
        id:t.id,
        text:[t.title,t.description,assignee?.full_name,commission?.name,decision?.number,decision?.title].filter(Boolean).join(" "),
        facets:{priority:t.priority,status:t.status},
        node:<tr>
          <td><Link href={"/operations/tasks/"+t.id}>{t.title}</Link>{context&&<small>{context}</small>}</td>
          <td><span className={"badge priority-"+t.priority}>{priorityLabel[t.priority]}</span></td>
          <td>{statusLabel[t.status]||t.status}</td>
          <td>{assignee?<span className="mg-person">{face(t.assignee_id,28)}<b>{assignee.full_name}</b></span>:<span className="muted">Non attribuée</span>}</td>
          <td>{t.due_on?<>{day(t.due_on)}{late&&<> <span className="badge overdue">Retard</span></>}</>:<span className="muted">—</span>}</td>
          <td><span className="progress-mini"><i style={{width:t.progress+"%"}}/></span><span className="muted">{t.progress}%</span></td>
        </tr>,
      };
    })}
  />;

  const commissionView=(commissions||[]).length
    ? <div className="manage-grid">{(commissions||[]).map(c=>{
      const lead=profileMap.get(c.lead_profile_id||"");
      const count=(commissionMembers||[]).filter(m=>m.commission_id===c.id&&!m.left_at).length;
      const open=rows.filter(t=>t.commission_id===c.id&&!["done","cancelled"].includes(t.status)).length;
      return <Link className="panel manage-card" href={"/operations/commissions/"+c.id} key={c.id}>
        <div className="card-top"><h3>{c.name}</h3><span className={"badge"+(c.status==="active"?" ok":"")}>{groupStatus[c.status]||c.status}</span></div>
        {(c.mandate||c.description)&&<p>{c.mandate||c.description}</p>}
        <small>{lead?.full_name?"Responsable : "+lead.full_name:"Responsable à désigner"} · {count} membre(s) · {open} action(s) ouverte(s)</small>
      </Link>;
    })}</div>
    : <div className="panel empty-state mg-empty-auto"><p>Aucune commission.</p>{commissionSheet("primary")}</div>;

  const mandateView=(mandates||[]).length
    ? <div className="panel list-card">{(mandates||[]).map(m=>{
      const holder=profileMap.get(m.profile_id);
      return <div className="list-row is-static stack-sm" key={m.id}>
        {face(m.profile_id,40)||<span className="row-icon"><UiIcon name="shield"/></span>}
        <div><b>{m.title} · {holder?.full_name||"Titulaire"}</b><small>Depuis le {day(m.starts_on)}{m.ends_on?" · jusqu’au "+day(m.ends_on):""}{m.scope||m.appointment_basis?" · "+(m.scope||m.appointment_basis):""}</small></div>
        <div className="row-end">
          <span className={"badge"+(m.status==="active"?" ok":"")}>{mandateStatus[m.status]||m.status}</span>
          {m.status==="active"&&<form action={closeMandate}><input type="hidden" name="mandate_id" value={m.id}/><button className="button secondary" name="status" value="completed">Clôturer</button><button className="button secondary" name="status" value="revoked">Révoquer</button></form>}
        </div>
      </div>;
    })}</div>
    : <div className="panel empty-state mg-empty-auto"><p>Aucun mandat enregistré.</p>{mandateSheet("primary")}</div>;

  const followUpView=followUps.length
    ? <div className="panel list-card">{followUps.map(t=>{
      const d=decisionMap.get(t.decision_id||"");
      const assignee=profileMap.get(t.assignee_id||"");
      return <Link className="list-row stack-sm" href={"/operations/tasks/"+t.id} key={t.id}>
        <span className="row-icon"><UiIcon name="check"/></span>
        <div><b>{t.title}</b><small>{d?.number||"Décision"}{d?.title?" · "+d.title:""}</small></div>
        <div className="row-end"><span className="mg-person">{face(t.assignee_id)}{assignee?.full_name||"Non attribuée"}</span><span className="badge">{statusLabel[t.status]||t.status}</span></div>
      </Link>;
    })}</div>
    : <div className="panel empty-state mg-empty-auto">Aucune décision nécessitant un suivi. Les décisions adoptées génèrent ici leurs actions.</div>;

  const notificationView=<>
    {unread.length>0&&<div className="tab-head"><p>{unread.length} non lue(s)</p><form action={markAllNotificationsRead}><button className="button secondary">Tout marquer lu</button></form></div>}
    {(notifications||[]).length
      ? <div className="panel list-card">{(notifications||[]).map(n=><div className={"list-row is-static stack-sm"+(!n.read_at?" unread":"")} key={n.id}>
        <span className="row-icon"><UiIcon name="bell"/></span>
        <div><b>{n.title}</b><small>{n.message?n.message+" · ":""}{new Date(n.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</small></div>
        <div className="row-end">
          {n.href&&<Link className="button secondary" href={n.href}>Ouvrir</Link>}
          {!n.read_at&&<form action={markNotificationRead}><input type="hidden" name="notification_id" value={n.id}/><button className="button secondary">Lu</button></form>}
        </div>
      </div>)}</div>
      : <div className="panel empty-state mg-empty-auto">Aucune notification interne.</div>}
  </>;

  return <section className="page manage-page">
    <header className="page-header">
      <div><PageIcon href="/operations"/><h1>Pilotage</h1><p>{activeTasks.length} action(s) ouverte(s), {activeCommissions.length} commission(s) active(s), {activeMandates.length} mandat(s) en cours.</p></div>
      <div className="header-actions">{commissionSheet()}{mandateSheet()}{taskSheet()}</div>
    </header>

    <div className="mg-stats stat-grid manage-stats">
      <article><a className="stat-link" href="#liste"><span className="icon-tile" style={{"--tile":"var(--accent)"} as React.CSSProperties}><UiIcon name="list"/></span><small>Actions ouvertes</small><strong>{activeTasks.length}</strong><span>{completed.length} terminée(s)</span></a></article>
      <article className={overdue.length?"attention-stat":""}><a className="stat-link" href="#liste"><span className="icon-tile" style={{"--tile":"var(--coral)"} as React.CSSProperties}><UiIcon name="clock"/></span><small>En retard</small><strong>{overdue.length}</strong><span>échéance dépassée</span></a></article>
      <article className={blocked.length?"attention-stat":""}><a className="stat-link" href="#tableau"><span className="icon-tile" style={{"--tile":"var(--orange)"} as React.CSSProperties}><UiIcon name="lock"/></span><small>Bloquées</small><strong>{blocked.length}</strong><span>à débloquer</span></a></article>
      <article><a className="stat-link" href="#liste"><span className="icon-tile" style={{"--tile":"var(--violet)"} as React.CSSProperties}><UiIcon name="user"/></span><small>Non attribuées</small><strong>{unassigned.length}</strong><span>à affecter</span></a></article>
      <article><a className="stat-link" href="#notifications"><span className="icon-tile" style={{"--tile":"var(--pink)"} as React.CSSProperties}><UiIcon name="bell"/></span><small>Notifications</small><strong>{unread.length}</strong><span>non lue(s)</span></a></article>
    </div>

    <Tabs tabs={[
      {id:"tableau",label:"Tableau",count:activeTasks.length,content:rows.length?board:<div className="panel empty-state mg-empty-auto"><p>Aucune tâche pour le moment.</p>{taskSheet()}</div>},
      {id:"liste",label:"Liste",count:rows.length,content:list},
      {id:"commissions",label:"Commissions",count:(commissions||[]).length,content:commissionView},
      {id:"mandats",label:"Mandats",count:activeMandates.length,content:mandateView},
      {id:"decisions",label:"Décisions à suivre",count:followUps.filter(t=>!["done","cancelled"].includes(t.status)).length,content:followUpView},
      {id:"notifications",label:"Notifications",count:unread.length,content:notificationView},
    ]}/>
  </section>;
}
