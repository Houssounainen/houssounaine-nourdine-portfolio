import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { issueDocument, reviewIssuance, submitIssuance, updateIssuanceDraft, uploadAdministrativeAttachment } from "../../actions";

export default async function IssuanceDetailPage({params}:{params:Promise<{id:string}>}){
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
    supabase.from("administrative_issuances").select("id,number,document_type,member_id,template_id,service_request_id,subject,purpose,body_snapshot,status,secretary_approved_by,secretary_approved_at,presidency_approved_by,presidency_approved_at,issued_at,verification_token,created_at,members(full_name,member_number,village,program,study_level)").eq("id",id).maybeSingle(),
    supabase.from("profiles").select("id,full_name,role,active").eq("active",true).order("full_name"),
    supabase.from("administrative_attachments").select("id,file_name,content_type,size_bytes,created_at").eq("entity_type","issuance").eq("entity_id",id).order("created_at",{ascending:false}),
  ]);
  if(!item||!isStaff(profile?.role)) notFound();

  const member=Array.isArray(item.members)?item.members[0]:item.members;
  const profileMap=new Map((profiles||[]).map((p:any)=>[p.id,p]));
  const canSecretariat=["admin","bureau","secretaire"].includes(profile?.role||"");
  const canPresidency=["admin","bureau"].includes(profile?.role||"");

  return <section className="page">
    <header className="page-header"><div><Link className="back-link" href="/administration">← Centre administratif</Link><span className="eyebrow">{item.document_type} · {item.number}</span><h1>{item.subject}</h1></div><div className="header-actions"><a className="button secondary" href={"/api/administration/issuances/"+item.id}>PDF</a><span className={"status-pill status-"+item.status}>{item.status}</span></div></header>

    <div className="document-detail-grid">
      <div className="task-detail-main">
        <article className="panel administrative-document-paper">
          <div className="document-paper-head"><div><span className="eyebrow">AEDBVT</span><h2>{item.document_type.toUpperCase()}</h2></div><div><b>{item.number}</b><small>{member?.full_name||"Membre"}</small><small>{member?.member_number||"sans n°"}</small></div></div>
          <h3 className="document-subject">{item.subject}</h3>
          <div className="document-body-preview">{item.body_snapshot}</div>
          {item.purpose&&<div className="document-notes"><b>Usage indiqué</b><p>{item.purpose}</p></div>}
          {item.status==="issued"&&<div className="verification-strip"><span>Vérification publique</span><code>{item.verification_token}</code><Link href={"/verify/admin/"+item.verification_token}>Tester la vérification →</Link></div>}
        </article>

        <article className="panel approval-timeline">
          <span className="eyebrow">Circuit interne</span><h2>Validations</h2>
          <div className="approval-steps">
            <div className={item.secretary_approved_at?"done":""}><b>1. Secrétariat</b><span>{item.secretary_approved_at?"Validé par "+(profileMap.get(item.secretary_approved_by||"")?.full_name||"un responsable"):"En attente"}</span></div>
            <div className={item.presidency_approved_at?"done":""}><b>2. Présidence / Bureau</b><span>{item.presidency_approved_at?"Validé par "+(profileMap.get(item.presidency_approved_by||"")?.full_name||"un responsable"):"En attente"}</span></div>
            <div className={item.issued_at?"done":""}><b>3. Délivrance</b><span>{item.issued_at?"Délivré le "+new Date(item.issued_at).toLocaleString("fr-FR"):"Non délivré"}</span></div>
          </div>
        </article>

        <article className="panel attachment-panel">
          <div className="panel-head"><div><span className="eyebrow">Pièces jointes</span><h2>Documents privés</h2></div><span>{attachments?.length||0}</span></div>
          <div className="attachment-list">{(attachments||[]).map((file:any)=><a href={"/api/administration/files/"+file.id} key={file.id}><span><b>{file.file_name}</b><small>{file.content_type||"fichier"} · {Math.max(1,Math.round(Number(file.size_bytes||0)/1024))} Ko</small></span><strong>↓</strong></a>)}{!attachments?.length&&<p>Aucune pièce jointe.</p>}</div>
        </article>
      </div>

      <aside className="document-tools">
        {item.status==="draft"&&<form action={updateIssuanceDraft} className="panel form-stack">
          <input type="hidden" name="issuance_id" value={item.id}/>
          <div><span className="eyebrow">Brouillon</span><h2>Modifier</h2></div>
          <label>Objet<input name="subject" defaultValue={item.subject} required/></label>
          <label>Usage<input name="purpose" defaultValue={item.purpose||""}/></label>
          <label>Texte<textarea name="body_snapshot" rows={12} defaultValue={item.body_snapshot} required/></label>
          <button className="button secondary">Enregistrer</button>
        </form>}

        {item.status==="draft"&&<form action={submitIssuance} className="panel"><input type="hidden" name="issuance_id" value={item.id}/><button className="button primary">Soumettre en validation</button></form>}

        {item.status==="review"&&canSecretariat&&!item.secretary_approved_at&&<article className="panel"><span className="eyebrow">Validation 1</span><h2>Secrétariat</h2><div className="review-actions"><form action={reviewIssuance}><input type="hidden" name="issuance_id" value={item.id}/><input type="hidden" name="stage" value="secretariat"/><button className="button primary" name="approve" value="true">Valider</button></form><form action={reviewIssuance}><input type="hidden" name="issuance_id" value={item.id}/><input type="hidden" name="stage" value="secretariat"/><button className="button secondary" name="approve" value="false">Rejeter</button></form></div></article>}

        {item.status==="review"&&item.secretary_approved_at&&canPresidency&&<article className="panel"><span className="eyebrow">Validation 2</span><h2>Présidence / Bureau</h2><div className="review-actions"><form action={reviewIssuance}><input type="hidden" name="issuance_id" value={item.id}/><input type="hidden" name="stage" value="presidency"/><button className="button primary" name="approve" value="true">Approuver</button></form><form action={reviewIssuance}><input type="hidden" name="issuance_id" value={item.id}/><input type="hidden" name="stage" value="presidency"/><button className="button secondary" name="approve" value="false">Rejeter</button></form></div></article>}

        {item.status==="approved"&&<form action={issueDocument} className="panel"><input type="hidden" name="issuance_id" value={item.id}/><button className="button primary">Délivrer le document</button></form>}

        <form action={uploadAdministrativeAttachment} className="panel form-stack" encType="multipart/form-data">
          <input type="hidden" name="entity_type" value="issuance"/><input type="hidden" name="entity_id" value={item.id}/>
          <div><span className="eyebrow">Pièce</span><h2>Joindre un fichier</h2></div>
          <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required/>
          <small className="muted">PDF ou image, 5 Mo maximum.</small>
          <button className="button secondary">Téléverser</button>
        </form>
      </aside>
    </div>
  </section>
}
