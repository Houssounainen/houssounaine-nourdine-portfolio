import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { addConfidentialCaseMessage, updateConfidentialCase } from "../actions";

const categoryLabels:Record<string,string>={
  conduct:"Comportement / conduite",
  harassment:"Harcèlement",
  discrimination:"Discrimination",
  finance:"Finances",
  governance:"Gouvernance",
  safety:"Sécurité",
  other:"Autre",
};

const statusLabels:Record<string,string>={
  received:"Reçu",
  in_review:"En examen",
  action_required:"Action requise",
  resolved:"Résolu",
  closed:"Clôturé",
  dismissed:"Classé sans suite",
};

export default async function CaseDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:item},{data:updates}]=await Promise.all([
    supabase.from("profiles").select("role,full_name").eq("id",user!.id).single(),
    supabase.from("confidential_cases")
      .select("id,case_number,submitted_by,member_id,category,subject,details,desired_outcome,priority,status,assigned_to,resolution_summary,resolved_at,closed_at,created_at,updated_at")
      .eq("id",id).maybeSingle(),
    supabase.from("confidential_case_updates")
      .select("id,author_id,message,visibility,event_type,created_at")
      .eq("case_id",id).order("created_at",{ascending:true}),
  ]);

  if(!item) notFound();
  const manager=can(profile?.role,"case_manage");

  const authorIds=[...new Set([
    item.submitted_by,
    item.assigned_to,
    ...(updates||[]).map((update)=>update.author_id),
  ].filter((value):value is string=>Boolean(value)))];

  const [{data:people},{data:managers}]=await Promise.all([
    authorIds.length
      ? supabase.from("profiles").select("id,full_name,role").in("id",authorIds)
      : Promise.resolve({data:[] as any[]}),
    manager
      ? supabase.from("profiles").select("id,full_name,role").eq("active",true).in("role",["admin","bureau"]).order("full_name")
      : Promise.resolve({data:[] as any[]}),
  ]);

  const peopleMap=new Map((people||[]).map((person)=>[person.id,person]));
  const submitter=peopleMap.get(item.submitted_by);
  const assigned= item.assigned_to?peopleMap.get(item.assigned_to):null;
  const closed=["closed","dismissed"].includes(item.status);

  return <section className="page">
    <header className="page-header">
      <div><span className="eyebrow">Dossier confidentiel</span><h1>{item.case_number}</h1></div>
      <Link className="button secondary" href="/cases">← Signalements</Link>
    </header>

    <div className="case-confidentiality-notice">
      <b>Contenu confidentiel</b>
      <span>Ne transférez pas le contenu de ce dossier hors des personnes autorisées sans nécessité légitime.</span>
    </div>

    <div className="case-detail-grid">
      <article className="panel case-file">
        <div className="case-file-head">
          <div>
            <span className={"badge case-priority-"+item.priority}>{item.priority}</span>
            <span className={"badge case-status-"+item.status}>{statusLabels[item.status]||item.status}</span>
          </div>
          <time>{new Date(item.created_at).toLocaleString("fr-FR")}</time>
        </div>
        <span className="eyebrow">{categoryLabels[item.category]||item.category}</span>
        <h2>{item.subject}</h2>
        <div className="case-text"><b>Description</b><p>{item.details}</p></div>
        {item.desired_outcome&&<div className="case-text"><b>Aide ou résultat souhaité</b><p>{item.desired_outcome}</p></div>}
        {item.resolution_summary&&<div className="case-resolution"><b>Conclusion / résolution</b><p>{item.resolution_summary}</p></div>}
        {manager&&<div className="case-admin-meta">
          <span><small>Déposé par</small><b>{submitter?.full_name||"Compte membre"}</b></span>
          <span><small>Responsable</small><b>{assigned?.full_name||"Non attribué"}</b></span>
          <span><small>Dernière mise à jour</small><b>{new Date(item.updated_at).toLocaleString("fr-FR")}</b></span>
        </div>}
      </article>

      {manager&&<form action={updateConfidentialCase} className="panel form-stack case-management">
        <input type="hidden" name="case_id" value={item.id}/>
        <div><span className="eyebrow">Admin / Bureau</span><h2>Prise en charge</h2></div>
        <label>Statut<select name="status" defaultValue={item.status}>
          <option value="received">Reçu</option>
          <option value="in_review">En examen</option>
          <option value="action_required">Action requise</option>
          <option value="resolved">Résolu</option>
          <option value="closed">Clôturé</option>
          <option value="dismissed">Classé sans suite</option>
        </select></label>
        <label>Responsable<select name="assigned_to" defaultValue={item.assigned_to||""}><option value="">Non attribué</option>{(managers||[]).map((person)=><option value={person.id} key={person.id}>{person.full_name} · {person.role}</option>)}</select></label>
        <label>Conclusion / résolution<textarea name="resolution_summary" rows={4} defaultValue={item.resolution_summary||""}/></label>
        <label>Note de mise à jour<textarea name="message" rows={4} placeholder="Facultatif"/></label>
        <label className="checkbox-line"><input type="checkbox" name="visible_to_member" defaultChecked/> <span>Cette mise à jour est visible par le membre</span></label>
        <button className="button primary" disabled={closed}>Enregistrer la prise en charge</button>
        {closed&&<small>Ce dossier est clôturé. Aucune modification supplémentaire n’est autorisée.</small>}
      </form>}
    </div>

    <article className="panel">
      <div className="panel-head"><div><span className="eyebrow">Chronologie</span><h2>Suivi du dossier</h2></div><span>{updates?.length||0}</span></div>
      <div className="case-timeline">
        {(updates||[]).map((update)=>{
          const author=update.author_id?peopleMap.get(update.author_id):null;
          return <div className={"case-update "+(update.visibility==="staff"?"internal":"")} key={update.id}>
            <span className="case-update-dot"/>
            <div>
              <div className="case-update-meta">
                <b>{author?.full_name||"AEDBVT"}</b>
                <span>{update.event_type}</span>
                {update.visibility==="staff"&&<span className="badge case-internal">Note interne</span>}
                <time>{new Date(update.created_at).toLocaleString("fr-FR")}</time>
              </div>
              <p>{update.message}</p>
            </div>
          </div>;
        })}
        {!updates?.length&&<p>Aucune mise à jour.</p>}
      </div>
    </article>

    {!closed&&<form action={addConfidentialCaseMessage} className="panel form-stack case-message-form">
      <input type="hidden" name="case_id" value={item.id}/>
      <div><span className="eyebrow">Ajouter un message</span><h2>{manager?"Commentaire au dossier":"Compléter mon signalement"}</h2></div>
      <label>Message<textarea name="message" rows={5} minLength={2} maxLength={4000} required/></label>
      {manager&&<label>Visibilité<select name="visibility" defaultValue="member"><option value="member">Visible par le membre</option><option value="staff">Note interne Admin/Bureau</option></select></label>}
      {!manager&&<input type="hidden" name="visibility" value="member"/>}
      <button className="button primary">Ajouter au dossier</button>
    </form>}
  </section>;
}
