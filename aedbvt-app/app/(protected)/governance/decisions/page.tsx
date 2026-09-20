import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";

export default async function DecisionRegisterPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:decisions}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("decision_register").select("id,number,decision_type,title,summary,outcome,decision_date,assembly_id,motion_id,election_id,document_id,document_version_id,published").order("decision_date",{ascending:false}).order("created_at",{ascending:false}),
  ]);
  const staff=isStaff(profile?.role);
  const decisionIds=(decisions||[]).map(d=>d.id);
  const tasks=staff&&decisionIds.length
    ? (await supabase.from("operational_tasks").select("id,decision_id,title,status,progress,due_on").in("decision_id",decisionIds).order("created_at")).data||[]
    : [];
  const taskMap=new Map(tasks.map(t=>[t.decision_id,t]));

  return <section className="page">
    <header className="page-header"><div><Link className="back-link" href="/governance">← Gouvernance</Link><span className="eyebrow">Traçabilité institutionnelle</span><h1>Registre des décisions</h1></div><span className="status-pill">{decisions?.length||0} décision(s)</span></header>
    <div className="decision-register">
      {(decisions||[]).map((d)=>{
        const task=taskMap.get(d.id);
        return <article className="panel decision-row" key={d.id}>
          <div className="decision-number"><small>Référence</small><b>{d.number}</b><span>{new Date(d.decision_date).toLocaleDateString("fr-FR")}</span></div>
          <div className="decision-copy"><div className="article-meta"><span className="badge">{d.decision_type}</span><span className={"badge decision-"+d.outcome}>{d.outcome}</span>{task&&<span className={"badge task-"+task.status}>Suivi : {task.status}</span>}</div><h2>{d.title}</h2>{d.summary&&<p>{d.summary}</p>}{task&&<div className="decision-task-progress"><div className="task-progress"><i style={{width:task.progress+"%"}}/></div><small>{task.progress}%{task.due_on?" · échéance "+new Date(task.due_on+"T12:00:00").toLocaleDateString("fr-FR"):""}</small></div>}</div>
          <div className="decision-links"><a className="button secondary" href={"/api/governance/decisions/"+d.id}>PDF</a>{task&&<Link href={"/operations/tasks/"+task.id}>Suivi opérationnel →</Link>}{d.assembly_id&&<Link href={"/governance/assemblies/"+d.assembly_id}>Assemblée →</Link>}{d.document_id&&<Link href={"/governance/documents/"+d.document_id}>Document →</Link>}</div>
        </article>;
      })}
      {!decisions?.length&&<div className="panel empty-state">Aucune décision enregistrée pour le moment.</div>}
    </div>
  </section>
}
