import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { addTaskUpdate, updateTaskAssignment, updateTaskState } from "../../actions";

const statusLabel:Record<string,string>={
  backlog:"À planifier",in_progress:"En cours",blocked:"Bloquée",done:"Terminée",cancelled:"Annulée"
};

export default async function OperationalTaskPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  const [
    {data:profile},
    {data:task},
    {data:updates},
    {data:commissions},
    {data:profiles},
  ]=await Promise.all([
    supabase.from("profiles").select("id,role,full_name").eq("id",user!.id).single(),
    supabase.from("operational_tasks").select("id,title,description,status,priority,progress,due_on,decision_id,assembly_id,commission_id,assignee_id,blocker_note,auto_generated,completed_at,created_at,updated_at").eq("id",id).maybeSingle(),
    supabase.from("task_updates").select("id,update_type,body,created_by,created_at").eq("task_id",id).order("created_at",{ascending:false}),
    supabase.from("commissions").select("id,name,status").eq("status","active").order("name"),
    supabase.from("profiles").select("id,full_name,role,active").eq("active",true).order("full_name"),
  ]);

  if(!task) notFound();
  const staff=isStaff(profile?.role);
  const visibleProfiles=staff?(profiles||[]):((profiles||[]).filter(p=>p.id===user!.id));
  const profileMap=new Map(visibleProfiles.map(p=>[p.id,p]));

  const [{data:decision},{data:assembly}]=await Promise.all([
    task.decision_id?supabase.from("decision_register").select("id,number,title,summary,outcome,decision_date").eq("id",task.decision_id).maybeSingle():Promise.resolve({data:null}),
    task.assembly_id?supabase.from("assemblies").select("id,title,starts_at,status").eq("id",task.assembly_id).maybeSingle():Promise.resolve({data:null}),
  ]);

  const late=!!task.due_on&&task.due_on<new Date().toISOString().slice(0,10)&&!["done","cancelled"].includes(task.status);

  return <section className="page">
    <header className="page-header">
      <div><Link className="back-link" href="/operations">← Centre opérationnel</Link><span className="eyebrow">Action AEDBVT</span><h1>{task.title}</h1></div>
      <div className="header-actions"><span className={"badge priority-"+task.priority}>{task.priority}</span>{late&&<span className="badge overdue">En retard</span>}<span className={"status-pill task-"+task.status}>{statusLabel[task.status]}</span></div>
    </header>

    <div className="task-detail-grid">
      <div className="task-detail-main">
        <article className="panel task-overview">
          <div className="task-progress-large"><div><span>Progression</span><strong>{task.progress}%</strong></div><div className="task-progress"><i style={{width:task.progress+"%"}}/></div></div>
          {task.description&&<div className="article-body">{task.description}</div>}
          <dl className="task-meta-list">
            <div><dt>Échéance</dt><dd>{task.due_on?new Date(task.due_on+"T12:00:00").toLocaleDateString("fr-FR"):"Non définie"}</dd></div>
            <div><dt>Responsable</dt><dd>{task.assignee_id===user!.id?"Vous":profileMap.get(task.assignee_id||"")?.full_name||"Non attribué"}</dd></div>
            <div><dt>Commission</dt><dd>{(commissions||[]).find(c=>c.id===task.commission_id)?.name||"Aucune"}</dd></div>
            <div><dt>Créée le</dt><dd>{new Date(task.created_at).toLocaleString("fr-FR")}</dd></div>
          </dl>
          {task.blocker_note&&<div className="task-blocker"><b>Blocage signalé</b><p>{task.blocker_note}</p></div>}
        </article>

        {decision&&<article className="panel linked-decision"><span className="eyebrow">Décision d’origine</span><h2>{decision.number} · {decision.title}</h2>{decision.summary&&<p>{decision.summary}</p>}<Link href="/governance/decisions">Voir le registre →</Link></article>}
        {assembly&&<article className="panel linked-decision"><span className="eyebrow">Assemblée liée</span><h2>{assembly.title}</h2><p>{new Date(assembly.starts_at).toLocaleString("fr-FR")} · {assembly.status}</p><Link href={"/governance/assemblies/"+assembly.id}>Ouvrir l’assemblée →</Link></article>}

        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">Journal</span><h2>Mises à jour</h2></div><span>{updates?.length||0}</span></div>
          <form action={addTaskUpdate} className="task-update-form">
            <input type="hidden" name="task_id" value={task.id}/>
            <select name="update_type"><option value="comment">Commentaire</option><option value="progress">Avancement</option><option value="blocker">Blocage</option><option value="resolution">Résolution</option></select>
            <textarea name="body" rows={3} required placeholder="Ajouter une note de suivi…"/>
            <button className="button secondary">Ajouter au journal</button>
          </form>
          <div className="task-update-list">{(updates||[]).map(update=><div key={update.id}><span className={"badge update-"+update.update_type}>{update.update_type}</span><p>{update.body}</p><small>{update.created_by===user!.id?"Vous":profileMap.get(update.created_by||"")?.full_name||"Membre du projet"} · {new Date(update.created_at).toLocaleString("fr-FR")}</small></div>)}{!updates?.length&&<p>Aucune mise à jour.</p>}</div>
        </article>
      </div>

      <aside className="task-detail-side">
        <form action={updateTaskState} className="panel form-stack">
          <input type="hidden" name="task_id" value={task.id}/>
          <div><span className="eyebrow">Avancement</span><h2>Mettre à jour</h2></div>
          <label>Statut<select name="status" defaultValue={task.status}><option value="backlog">À planifier</option><option value="in_progress">En cours</option><option value="blocked">Bloquée</option><option value="done">Terminée</option><option value="cancelled">Annulée</option></select></label>
          <label>Progression (%)<input name="progress" type="number" min="0" max="100" defaultValue={task.progress}/></label>
          <label>Motif de blocage<textarea name="blocker_note" rows={3} defaultValue={task.blocker_note||""}/></label>
          <button className="button primary">Enregistrer l’état</button>
        </form>

        {staff&&<form action={updateTaskAssignment} className="panel form-stack">
          <input type="hidden" name="task_id" value={task.id}/>
          <div><span className="eyebrow">Pilotage</span><h2>Affectation</h2></div>
          <label>Responsable<select name="assignee_id" defaultValue={task.assignee_id||""}><option value="">— Non attribuée —</option>{(profiles||[]).map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>)}</select></label>
          <label>Commission<select name="commission_id" defaultValue={task.commission_id||""}><option value="">— Aucune —</option>{(commissions||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Priorité<select name="priority" defaultValue={task.priority}><option value="low">Faible</option><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option></select></label>
          <label>Échéance<input name="due_on" type="date" defaultValue={task.due_on||""}/></label>
          <button className="button secondary">Mettre à jour l’affectation</button>
        </form>}
      </aside>
    </div>
  </section>
}
