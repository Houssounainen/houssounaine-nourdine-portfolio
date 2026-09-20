import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DecisionRegisterPage(){
  const supabase=await createClient();
  const {data:decisions}=await supabase.from("decision_register").select("id,number,decision_type,title,summary,outcome,decision_date,assembly_id,motion_id,election_id,document_id,document_version_id,published").order("decision_date",{ascending:false}).order("created_at",{ascending:false});

  return <section className="page">
    <header className="page-header"><div><Link className="back-link" href="/governance">← Gouvernance</Link><span className="eyebrow">Traçabilité institutionnelle</span><h1>Registre des décisions</h1></div><span className="status-pill">{decisions?.length||0} décision(s)</span></header>
    <div className="decision-register">
      {(decisions||[]).map((d)=><article className="panel decision-row" key={d.id}>
        <div className="decision-number"><small>Référence</small><b>{d.number}</b><span>{new Date(d.decision_date).toLocaleDateString("fr-FR")}</span></div>
        <div className="decision-copy"><div className="article-meta"><span className="badge">{d.decision_type}</span><span className={"badge decision-"+d.outcome}>{d.outcome}</span></div><h2>{d.title}</h2>{d.summary&&<p>{d.summary}</p>}</div>
        <div className="decision-links"><a className="button secondary" href={"/api/governance/decisions/"+d.id}>PDF</a>{d.assembly_id&&<Link href={"/governance/assemblies/"+d.assembly_id}>Assemblée →</Link>}{d.document_id&&<Link href={"/governance/documents/"+d.document_id}>Document →</Link>}</div>
      </article>)}
      {!decisions?.length&&<div className="panel empty-state">Aucune décision enregistrée pour le moment.</div>}
    </div>
  </section>
}
