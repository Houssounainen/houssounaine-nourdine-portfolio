import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { processRequest } from "./actions";

const labels: Record<string,string>={attestation:"Attestation",information:"Information",correction:"Correction",aide:"Aide",document:"Document",autre:"Autre"};
const statusLabels: Record<string,string>={pending:"Reçue",in_review:"En traitement",completed:"Terminée",rejected:"Refusée"};

export default async function RequestsPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:requests}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("member_service_requests").select("id,request_type,subject,details,status,response,created_at,updated_at,members(full_name,member_number,village)").order("created_at",{ascending:false})
  ]);
  if(!isStaff(profile?.role)) notFound();

  const rows=requests||[];
  const pending=rows.filter((x)=>x.status==="pending").length;
  const inReview=rows.filter((x)=>x.status==="in_review").length;

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Secrétariat</span><h1>Demandes des membres</h1></div><span className="status-pill">{pending} reçue(s) · {inReview} en traitement</span></header>

    <div className="request-admin-grid">
      {rows.map((request:any)=>{
        const member=Array.isArray(request.members)?request.members[0]:request.members;
        return <article className="panel request-admin-card" key={request.id}>
          <div className="article-meta"><span className="badge">{labels[request.request_type]||request.request_type}</span><span className={"badge request-"+request.status}>{statusLabels[request.status]||request.status}</span><time>{new Date(request.created_at).toLocaleDateString("fr-FR")}</time></div>
          <h2>{request.subject}</h2>
          <p>{request.details||"Aucun détail fourni."}</p>
          <div className="request-member"><b>{member?.full_name||"Membre"}</b><small>{[member?.member_number,member?.village].filter(Boolean).join(" · ")}</small></div>
          <form action={processRequest} className="form-stack">
            <input type="hidden" name="id" value={request.id}/>
            <label>Statut<select name="status" defaultValue={request.status}><option value="pending">Reçue</option><option value="in_review">En traitement</option><option value="completed">Terminée</option><option value="rejected">Refusée</option></select></label>
            <label>Réponse<textarea name="response" rows={4} defaultValue={request.response||""}/></label>
            <button className="button secondary">Mettre à jour</button>
          </form>
        </article>;
      })}
      {!rows.length&&<div className="panel empty-state">Aucune demande reçue.</div>}
    </div>
  </section>
}
