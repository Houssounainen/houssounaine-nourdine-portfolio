import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { closeCorrespondence, dispatchCorrespondence, reviewCorrespondence, startIncomingCorrespondenceReview, submitCorrespondence, updateCorrespondenceDraft, uploadAdministrativeAttachment } from "../../actions";

export default async function CorrespondenceDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  const [
    {data:profile},
    {data:item},
    {data:profiles},
    {data:attachments},
  ]=await Promise.all([
    supabase.from("profiles").select("role,full_name").eq("id",user!.id).single(),
    supabase.from("correspondence_register").select("id,number,direction,category,subject,correspondent_name,correspondent_contact,body,received_on,sent_on,status,member_id,service_request_id,decision_id,assigned_to,secretary_approved_by,secretary_approved_at,presidency_approved_by,presidency_approved_at,dispatched_at,notes,created_by,created_at,updated_at").eq("id",id).maybeSingle(),
    supabase.from("profiles").select("id,full_name,role,active").eq("active",true).order("full_name"),
    supabase.from("administrative_attachments").select("id,file_name,content_type,size_bytes,created_at").eq("entity_type","correspondence").eq("entity_id",id).order("created_at",{ascending:false}),
  ]);
  if(!item||!isStaff(profile?.role)) notFound();

  const profileMap=new Map((profiles||[]).map((p:any)=>[p.id,p]));
  const canSecretariat=["admin","bureau","secretaire"].includes(profile?.role||"");
  const canPresidency=["admin","bureau"].includes(profile?.role||"");

  return <section className="page">
    <header className="page-header"><div><Link className="back-link" href="/administration">← Centre administratif</Link><span className="eyebrow">{item.direction==="incoming"?"Courrier entrant":"Courrier sortant"} · {item.number}</span><h1>{item.subject}</h1></div><div className="header-actions"><a className="button secondary" href={"/api/administration/correspondence/"+item.id}>PDF</a><span className={"status-pill status-"+item.status}>{item.status}</span></div></header>

    <div className="document-detail-grid">
      <div className="task-detail-main">
        <article className="panel correspondence-paper">
          <div className="correspondence-meta"><div><small>Correspondant</small><b>{item.correspondent_name}</b><span>{item.correspondent_contact||"—"}</span></div><div><small>Référence</small><b>{item.number}</b><span>{item.category}</span></div></div>
          <div className="article-body correspondence-body">{item.body||"Aucun contenu détaillé."}</div>
          {item.notes&&<div className="document-notes"><b>Note interne</b><p>{item.notes}</p></div>}
        </article>

        <article className="panel approval-timeline">
          <span className="eyebrow">Circuit interne</span><h2>Validations</h2>
          <div className="approval-steps">
            <div className={item.secretary_approved_at?"done":""}><b>1. Secrétariat</b><span>{item.secretary_approved_at?"Validé par "+(profileMap.get(item.secretary_approved_by||"")?.full_name||"un responsable"):"En attente"}</span></div>
            <div className={item.presidency_approved_at?"done":""}><b>2. Présidence / Bureau</b><span>{item.presidency_approved_at?"Validé par "+(profileMap.get(item.presidency_approved_by||"")?.full_name||"un responsable"):"En attente"}</span></div>
            <div className={item.dispatched_at?"done":""}><b>3. Envoi</b><span>{item.dispatched_at?"Envoyé le "+new Date(item.dispatched_at).toLocaleString("fr-FR"):"Non envoyé"}</span></div>
          </div>
        </article>

        <article className="panel attachment-panel">
          <div className="panel-head"><div><span className="eyebrow">Pièces jointes</span><h2>Documents privés</h2></div><span>{attachments?.length||0}</span></div>
          <div className="attachment-list">{(attachments||[]).map((file:any)=><a href={"/api/administration/files/"+file.id} key={file.id}><span><b>{file.file_name}</b><small>{file.content_type||"fichier"} · {Math.max(1,Math.round(Number(file.size_bytes||0)/1024))} Ko</small></span><strong>↓</strong></a>)}{!attachments?.length&&<p>Aucune pièce jointe.</p>}</div>
        </article>
      </div>

      <aside className="document-tools">
        {item.status==="draft"&&<form action={updateCorrespondenceDraft} className="panel form-stack">
          <input type="hidden" name="correspondence_id" value={item.id}/>
          <div><span className="eyebrow">Brouillon</span><h2>Modifier</h2></div>
          <label>Objet<input name="subject" defaultValue={item.subject} required/></label>
          <label>Correspondant<input name="correspondent_name" defaultValue={item.correspondent_name} required/></label>
          <label>Coordonnées<input name="correspondent_contact" defaultValue={item.correspondent_contact||""}/></label>
          <label>Catégorie<input name="category" defaultValue={item.category}/></label>
          <label>Responsable<select name="assigned_to" defaultValue={item.assigned_to||""}><option value="">— Non attribué —</option>{(profiles||[]).map((p:any)=><option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>)}</select></label>
          <label>Contenu<textarea name="body" rows={9} defaultValue={item.body||""}/></label>
          <label>Note<textarea name="notes" rows={3} defaultValue={item.notes||""}/></label>
          <button className="button secondary">Enregistrer</button>
        </form>}

        {item.direction==="incoming"&&item.status==="registered"&&<form action={startIncomingCorrespondenceReview} className="panel"><input type="hidden" name="correspondence_id" value={item.id}/><button className="button primary">Mettre en traitement</button></form>}

        {item.direction==="outgoing"&&item.status==="draft"&&<form action={submitCorrespondence} className="panel"><input type="hidden" name="correspondence_id" value={item.id}/><button className="button primary">Soumettre en validation</button></form>}

        {item.direction==="outgoing"&&item.status==="review"&&canSecretariat&&!item.secretary_approved_at&&<article className="panel"><span className="eyebrow">Validation 1</span><h2>Secrétariat</h2><div className="review-actions"><form action={reviewCorrespondence}><input type="hidden" name="correspondence_id" value={item.id}/><input type="hidden" name="stage" value="secretariat"/><button className="button primary" name="approve" value="true">Valider</button></form><form action={reviewCorrespondence}><input type="hidden" name="correspondence_id" value={item.id}/><input type="hidden" name="stage" value="secretariat"/><button className="button secondary" name="approve" value="false">Rejeter</button></form></div></article>}

        {item.direction==="outgoing"&&item.status==="review"&&item.secretary_approved_at&&canPresidency&&<article className="panel"><span className="eyebrow">Validation 2</span><h2>Présidence / Bureau</h2><div className="review-actions"><form action={reviewCorrespondence}><input type="hidden" name="correspondence_id" value={item.id}/><input type="hidden" name="stage" value="presidency"/><button className="button primary" name="approve" value="true">Approuver</button></form><form action={reviewCorrespondence}><input type="hidden" name="correspondence_id" value={item.id}/><input type="hidden" name="stage" value="presidency"/><button className="button secondary" name="approve" value="false">Rejeter</button></form></div></article>}

        {item.direction==="outgoing"&&item.status==="approved"&&<form action={dispatchCorrespondence} className="panel form-stack"><input type="hidden" name="correspondence_id" value={item.id}/><div><span className="eyebrow">Envoi</span><h2>Marquer envoyé</h2></div><label>Date d’envoi<input name="sent_on" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></label><button className="button primary">Confirmer l’envoi</button></form>}

        {((item.direction==="incoming"&&["registered","review"].includes(item.status))||(item.direction==="outgoing"&&item.status==="dispatched"))&&<form action={closeCorrespondence} className="panel"><input type="hidden" name="correspondence_id" value={item.id}/><button className="button secondary">Clôturer le dossier</button></form>}

        <form action={uploadAdministrativeAttachment} className="panel form-stack" encType="multipart/form-data">
          <input type="hidden" name="entity_type" value="correspondence"/><input type="hidden" name="entity_id" value={item.id}/>
          <div><span className="eyebrow">Pièce</span><h2>Joindre un fichier</h2></div>
          <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required/>
          <small className="muted">PDF ou image, 5 Mo maximum.</small>
          <button className="button secondary">Téléverser</button>
        </form>
      </aside>
    </div>
  </section>
}
