import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { UiIcon } from "@/components/ui-icon";
import { DetailHero, EmptyCard, Pill } from "@/components/gov-ui";
import { DECISION_OUTCOME, DECISION_TYPE, TASK_STATUS, dateOnly, label, plural } from "@/lib/governance-labels";

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
  const count=decisions?.length||0;

  return <section className="page gv-page">
    <DetailHero
      back={{href:"/governance#decisions",label:"Gouvernance"}}
      kicker="Registre officiel"
      title="Registre des décisions"
      icon="list"
      color="#12b76a"
      meta={<span><UiIcon name="check"/>{plural(count,"décision consignée","décisions consignées")}</span>}
      actions={<Link className="button secondary" href="/governance/documents"><UiIcon name="book"/>Textes officiels</Link>}
    />
    <div className="gv-decisions">
      {(decisions||[]).map((d)=>{
        const task=taskMap.get(d.id);
        const [outText,outTone]=label(DECISION_OUTCOME,d.outcome);
        const date=d.decision_date?new Date(d.decision_date+"T12:00:00"):null;
        return <article className="gv-decision" key={d.id}>
          <div className="gv-decision-date" aria-label={dateOnly(d.decision_date,"long")}>{date?<><b>{date.getDate()}</b><small>{date.toLocaleDateString("fr-FR",{month:"short"}).replace(".","")} {date.getFullYear()}</small></>:<b>—</b>}</div>
          <div className="gv-decision-copy">
            <div className="gv-tags"><Pill tone={outTone}>{outText}</Pill><Pill>{DECISION_TYPE[d.decision_type]||d.decision_type}</Pill>{task&&<Pill tone="info" icon="clock">Suivi : {TASK_STATUS[task.status]||task.status}</Pill>}</div>
            <h3>{d.title}</h3>
            <code>{d.number}</code>
            {d.summary&&<p>{d.summary}</p>}
            {task&&<div className="gv-result-row"><span>Exécution</span><div className="gv-meter"><i style={{width:Number(task.progress||0)+"%"}}/></div><b>{task.progress}%</b></div>}
          </div>
          <div className="gv-decision-links">
            <a className="button secondary" href={"/api/governance/decisions/"+d.id}><UiIcon name="download"/>PDF</a>
            {task&&<Link href={"/operations/tasks/"+task.id}>Suivi opérationnel<UiIcon name="chevron"/></Link>}
            {d.assembly_id&&<Link href={"/governance/assemblies/"+d.assembly_id}>Assemblée<UiIcon name="chevron"/></Link>}
            {d.election_id&&<Link href={"/governance/elections/"+d.election_id}>Élection<UiIcon name="chevron"/></Link>}
            {d.document_id&&<Link href={"/governance/documents/"+d.document_id}>Texte<UiIcon name="chevron"/></Link>}
          </div>
        </article>;
      })}
      {!count&&<EmptyCard icon="list" color="#12b76a" title="Registre vide" text="Les décisions adoptées en assemblée ou par le Bureau seront consignées ici."/>}
    </div>
  </section>
}
