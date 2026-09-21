import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { processRequest } from "./actions";
import { createIssuanceFromRequest } from "../administration/actions";

const labels: Record<string,string>={attestation:"Attestation",information:"Information",correction:"Correction",aide:"Aide",document:"Document",autre:"Autre"};
const statusLabels: Record<string,string>={pending:"Reçue",in_review:"En traitement",completed:"Terminée",rejected:"Refusée"};

export default async function RequestsPage({
  searchParams,
}:{searchParams:Promise<{q?:string;status?:string;type?:string}>}){
  const filters=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:requests},{data:issuances}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("member_service_requests").select("id,request_type,subject,details,status,response,created_at,updated_at,members(full_name,member_number,village)").order("created_at",{ascending:false}),
    supabase.from("administrative_issuances").select("id,service_request_id,status").not("service_request_id","is",null)
  ]);
  if(!can(profile?.role,"requests_manage")) notFound();

  const rows=requests||[];
  const pending=rows.filter((x)=>x.status==="pending").length;
  const inReview=rows.filter((x)=>x.status==="in_review").length;
  const issuanceByRequest=new Map((issuances||[]).map((x:any)=>[x.service_request_id,x]));

  const query=(filters.q||"").trim().toLocaleLowerCase("fr");
  const status=filters.status||"all";
  const type=filters.type||"all";
  const filtered=rows.filter((request:any)=>{
    if(status!=="all"&&request.status!==status) return false;
    if(type!=="all"&&request.request_type!==type) return false;
    if(!query) return true;
    const member=Array.isArray(request.members)?request.members[0]:request.members;
    return [
      request.subject,
      request.details,
      request.response,
      member?.full_name,
      member?.member_number,
      member?.village,
    ].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(query);
  });

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Secrétariat</span><h1>Demandes des membres</h1></div><span className="status-pill">{pending} reçue(s) · {inReview} en traitement</span></header>

    <form className="panel request-filter-bar" method="get">
      <label className="request-filter-search"><span className="sr-only">Rechercher</span><input name="q" defaultValue={filters.q||""} placeholder="Nom, numéro membre, objet…"/></label>
      <label><span className="sr-only">Filtrer par statut</span><select name="status" defaultValue={status}><option value="all">Tous les statuts</option>{Object.entries(statusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <label><span className="sr-only">Filtrer par type</span><select name="type" defaultValue={type}><option value="all">Tous les types</option>{Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <button className="button secondary">Filtrer</button>
      {(filters.q||status!=="all"||type!=="all")&&<a className="button secondary" href="/requests">Réinitialiser</a>}
      <span className="directory-count">{filtered.length} / {rows.length}</span>
    </form>

    <div className="request-admin-grid">
      {filtered.map((request:any)=>{
        const member=Array.isArray(request.members)?request.members[0]:request.members;
        return <article className="panel request-admin-card" key={request.id}>
          <div className="article-meta"><span className="badge">{labels[request.request_type]||request.request_type}</span><span className={"badge request-"+request.status}>{statusLabels[request.status]||request.status}</span><time>{new Date(request.created_at).toLocaleDateString("fr-FR")}</time></div>
          <h2>{request.subject}</h2>
          <p>{request.details||"Aucun détail fourni."}</p>
          <div className="request-member"><b>{member?.full_name||"Membre"}</b><small>{[member?.member_number,member?.village].filter(Boolean).join(" · ")}</small></div>
          {request.request_type==="attestation"&&!issuanceByRequest.has(request.id)&&!["completed","rejected"].includes(request.status)&&<form action={createIssuanceFromRequest} className="request-document-action"><input type="hidden" name="request_id" value={request.id}/><button className="button primary">Préparer l’attestation</button></form>}
          {issuanceByRequest.has(request.id)&&<a className="button secondary" href={"/administration/issuances/"+issuanceByRequest.get(request.id)?.id}>Ouvrir le document</a>}
          <form action={processRequest} className="form-stack">
            <input type="hidden" name="id" value={request.id}/>
            <label>Statut<select name="status" defaultValue={request.status}><option value="pending">Reçue</option><option value="in_review">En traitement</option><option value="completed">Terminée</option><option value="rejected">Refusée</option></select></label>
            <label>Réponse<textarea name="response" rows={4} defaultValue={request.response||""}/></label>
            <button className="button secondary">Mettre à jour</button>
          </form>
        </article>;
      })}
      {!filtered.length&&<div className="panel empty-state">Aucune demande ne correspond aux filtres sélectionnés.</div>}
    </div>
  </section>
}
