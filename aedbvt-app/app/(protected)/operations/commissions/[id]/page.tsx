import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { addCommissionMember, closeCommission, removeCommissionMember } from "../../actions";

export default async function CommissionPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  const [
    {data:profile},
    {data:commission},
    {data:members},
    {data:profiles},
    {data:tasks},
  ]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("commissions").select("id,name,description,mandate,status,lead_profile_id,decision_id,starts_on,ends_on,created_at").eq("id",id).maybeSingle(),
    supabase.from("commission_members").select("commission_id,profile_id,role,joined_at,left_at").eq("commission_id",id).order("joined_at"),
    supabase.from("profiles").select("id,full_name,role,active").eq("active",true).order("full_name"),
    supabase.from("operational_tasks").select("id,title,status,priority,progress,due_on,assignee_id").eq("commission_id",id).order("created_at",{ascending:false}),
  ]);

  if(!commission||!isStaff(profile?.role)) notFound();
  const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));
  const activeMembers=(members||[]).filter(m=>!m.left_at);
  const lead=profileMap.get(commission.lead_profile_id||"");
  const openTasks=(tasks||[]).filter(t=>!["done","cancelled"].includes(t.status));

  return <section className="page">
    <header className="page-header"><div><Link className="back-link" href="/operations">← Centre opérationnel</Link><span className="eyebrow">Commission</span><h1>{commission.name}</h1></div><span className={"status-pill status-"+commission.status}>{commission.status}</span></header>

    <div className="commission-summary-grid">
      <article className="panel"><small>Responsable</small><strong>{lead?.full_name||"À désigner"}</strong><span>{lead?.role||"—"}</span></article>
      <article className="panel"><small>Membres actifs</small><strong>{activeMembers.length}</strong><span>équipe de travail</span></article>
      <article className="panel"><small>Actions ouvertes</small><strong>{openTasks.length}</strong><span>{(tasks||[]).filter(t=>t.status==="blocked").length} bloquée(s)</span></article>
      <article className="panel"><small>Période</small><strong>{commission.starts_on?new Date(commission.starts_on+"T12:00:00").toLocaleDateString("fr-FR"):"Non définie"}</strong><span>{commission.ends_on?"Fin : "+new Date(commission.ends_on+"T12:00:00").toLocaleDateString("fr-FR"):"Sans date de fin"}</span></article>
    </div>

    <article className="panel commission-mandate"><span className="eyebrow">Mission</span><h2>{commission.description||"Commission AEDBVT"}</h2><p>{commission.mandate||"Mandat opérationnel à préciser."}</p></article>

    <div className="content-grid">
      <article className="panel">
        <div className="panel-head"><div><span className="eyebrow">Équipe</span><h2>Membres de la commission</h2></div><span>{activeMembers.length}</span></div>
        <div className="commission-member-list">{activeMembers.map(member=>{const p=profileMap.get(member.profile_id);return <div key={member.profile_id}><span className="avatar small">{p?.full_name?p.full_name.split(" ").map((x:string)=>x[0]).slice(0,2).join("").toUpperCase():"—"}</span><span><b>{p?.full_name||"Membre"}</b><small>{member.role} · {p?.role||"membre"}</small></span><form action={removeCommissionMember}><input type="hidden" name="commission_id" value={commission.id}/><input type="hidden" name="profile_id" value={member.profile_id}/><button className="button secondary">Retirer</button></form></div>})}{!activeMembers.length&&<p>Aucun membre affecté.</p>}</div>
      </article>

      <form action={addCommissionMember} className="panel form-stack">
        <input type="hidden" name="commission_id" value={commission.id}/>
        <div><span className="eyebrow">Équipe</span><h2>Ajouter un membre</h2></div>
        <label>Utilisateur<select name="profile_id" required><option value="">Choisir…</option>{(profiles||[]).filter(p=>!activeMembers.some(m=>m.profile_id===p.id)).map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>)}</select></label>
        <label>Rôle dans la commission<input name="role" defaultValue="membre"/></label>
        <button className="button primary">Ajouter</button>
      </form>
    </div>

    <section className="operations-board-section">
      <div className="section-heading-row"><div><span className="eyebrow">Actions</span><h2>Tâches de la commission</h2></div></div>
      <div className="commission-task-list">{(tasks||[]).map(task=><Link className="panel commission-task-row" href={"/operations/tasks/"+task.id} key={task.id}><div><span className={"badge priority-"+task.priority}>{task.priority}</span><h3>{task.title}</h3><small>{profileMap.get(task.assignee_id||"")?.full_name||"Non attribuée"}{task.due_on?" · échéance "+new Date(task.due_on+"T12:00:00").toLocaleDateString("fr-FR"):""}</small></div><div><strong>{task.progress}%</strong><span className={"badge task-"+task.status}>{task.status}</span></div></Link>)}{!tasks?.length&&<div className="panel empty-state">Aucune tâche rattachée.</div>}</div>
    </section>

    {commission.status==="active"&&<form action={closeCommission} className="panel close-commission"><input type="hidden" name="commission_id" value={commission.id}/><div><span className="eyebrow">Clôture</span><h2>Terminer la commission</h2><p>La commission restera dans l’historique et ses tâches conserveront leur rattachement.</p></div><label>Date de fin<input name="ends_on" type="date"/></label><button className="button secondary">Clôturer la commission</button></form>}
  </section>
}
