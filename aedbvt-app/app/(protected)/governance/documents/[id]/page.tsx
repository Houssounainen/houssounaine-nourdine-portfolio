import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { createVersion, proposeAmendment, publishVersion, reviewAmendment, reviewVersion, submitVersion, updateDraftVersion, withdrawAmendment } from "../actions";

export default async function GovernanceDocumentDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  const [{data:profile},{data:doc},{data:versions},{data:amendments}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("governance_documents").select("id,title,category,version,published,current_version_id,updated_at").eq("id",id).maybeSingle(),
    supabase.from("governance_document_versions").select("id,version_label,title,body,change_summary,status,based_on_version_id,checksum,created_by,approved_by,approved_at,published_at,created_at,updated_at").eq("document_id",id).order("created_at",{ascending:false}),
    supabase.from("governance_amendments").select("id,number,title,rationale,proposed_text,status,proposed_by,decision_notes,decided_at,created_at").eq("document_id",id).order("created_at",{ascending:false}),
  ]);
  if(!doc) notFound();

  const staff=isStaff(profile?.role);
  const canApprove=["admin","bureau","secretaire"].includes(profile?.role||"");
  const canPublish=["admin","bureau"].includes(profile?.role||"");
  const versionIds=(versions||[]).map(v=>v.id);
  const approvals=staff&&versionIds.length ? (await supabase.from("governance_document_approvals").select("id,version_id,approver_id,role_at_decision,decision,note,decided_at,profiles(full_name)").in("version_id",versionIds).order("decided_at",{ascending:false})).data||[] : [];
  const published=(versions||[]).find(v=>v.status==="published")||null;
  const latest=(versions||[])[0]||null;

  return <section className="page">
    <header className="page-header"><div><Link className="back-link" href="/governance/documents">← Centre documentaire</Link><span className="eyebrow">{doc.category}</span><h1>{doc.title}</h1></div><span className={"status-pill "+(doc.published?"status-paid":"status-draft")}>{doc.published?"Publié · v"+doc.version:"Non publié"}</span></header>

    {published&&<article className="panel published-document">
      <div className="panel-head"><div><span className="eyebrow">Version en vigueur</span><h2>{published.title} · v{published.version_label}</h2></div><a className="button secondary" href={"/api/governance/documents/"+published.id}>PDF</a></div>
      <div className="document-body-preview">{published.body}</div>
      <div className="document-integrity"><span>Empreinte SHA-256</span><code>{published.checksum||"—"}</code></div>
    </article>}

    {staff&&<section className="governance-section">
      <div className="section-heading-row"><div><span className="eyebrow">Versionnage</span><h2>Créer une nouvelle version</h2></div></div>
      <form action={createVersion} className="panel editorial-form">
        <input type="hidden" name="document_id" value={doc.id}/>
        <input type="hidden" name="based_on_version_id" value={published?.id||latest?.id||""}/>
        <label>Version<input name="version_label" required placeholder="1.1"/></label>
        <label>Titre<input name="title" defaultValue={doc.title} required/></label>
        <label className="wide">Résumé des changements<input name="change_summary" placeholder="Ex. clarification de l’article 4"/></label>
        <label className="wide">Contenu<textarea name="body" rows={14} defaultValue={published?.body||latest?.body||""} required/></label>
        <div className="wide"><button className="button primary">Créer le brouillon</button></div>
      </form>
    </section>}

    <section className="governance-section">
      <div className="section-heading-row"><div><span className="eyebrow">Historique</span><h2>Versions</h2></div></div>
      <div className="version-stack">
        {(versions||[]).map(version=>{
          const versionApprovals=(approvals||[]).filter((a:any)=>a.version_id===version.id);
          return <article className="panel version-card" key={version.id}>
            <div className="version-head"><div><span className={"badge status-"+version.status}>{version.status}</span><h3>v{version.version_label} · {version.title}</h3></div><a className="button secondary" href={"/api/governance/documents/"+version.id}>PDF</a></div>
            {version.change_summary&&<p><b>Changements :</b> {version.change_summary}</p>}
            <details><summary>Voir le contenu</summary><div className="article-body">{version.body}</div></details>

            {staff&&version.status==="draft"&&<form action={updateDraftVersion} className="form-stack version-edit">
              <input type="hidden" name="version_id" value={version.id}/><input type="hidden" name="document_id" value={doc.id}/>
              <label>Titre<input name="title" defaultValue={version.title} required/></label>
              <label>Résumé<input name="change_summary" defaultValue={version.change_summary||""}/></label>
              <label>Contenu<textarea name="body" rows={10} defaultValue={version.body} required/></label>
              <div className="version-actions"><button className="button secondary">Enregistrer</button></div>
            </form>}

            {staff&&version.status==="draft"&&<form action={submitVersion}><input type="hidden" name="version_id" value={version.id}/><input type="hidden" name="document_id" value={doc.id}/><button className="button primary">Soumettre en revue</button></form>}

            {canApprove&&version.status==="review"&&<form action={reviewVersion} className="review-box">
              <input type="hidden" name="version_id" value={version.id}/><input type="hidden" name="document_id" value={doc.id}/>
              <label>Note de validation<textarea name="note" rows={2}/></label>
              <div className="review-actions"><button className="button primary" name="decision" value="approved">Approuver</button><button className="button secondary" name="decision" value="rejected">Rejeter</button></div>
            </form>}

            {canPublish&&version.status==="approved"&&<form action={publishVersion}><input type="hidden" name="version_id" value={version.id}/><input type="hidden" name="document_id" value={doc.id}/><button className="button primary">Publier cette version</button></form>}

            {staff&&versionApprovals.length>0&&<div className="approval-log"><b>Journal de validation</b>{versionApprovals.map((a:any)=>{const p=Array.isArray(a.profiles)?a.profiles[0]:a.profiles;return <div key={a.id}><span>{p?.full_name||"Validateur"} · {a.role_at_decision}</span><span className={"badge status-"+a.decision}>{a.decision}</span><small>{new Date(a.decided_at).toLocaleString("fr-FR")}{a.note?" · "+a.note:""}</small></div>})}</div>}
          </article>
        })}
      </div>
    </section>

    {doc.current_version_id&&<section className="governance-section">
      <div className="section-heading-row"><div><span className="eyebrow">Participation</span><h2>Proposer un amendement</h2></div></div>
      <form action={proposeAmendment} className="panel editorial-form">
        <input type="hidden" name="document_id" value={doc.id}/>
        <label>Titre<input name="title" required placeholder="Modification de l’article…"/></label>
        <label>Motif<input name="rationale"/></label>
        <label className="wide">Texte proposé<textarea name="proposed_text" rows={6} required/></label>
        <div className="wide"><button className="button secondary">Soumettre l’amendement</button></div>
      </form>
    </section>}

    <section className="governance-section">
      <div className="section-heading-row"><div><span className="eyebrow">Amendements</span><h2>Propositions & décisions</h2></div></div>
      <div className="amendment-stack">
        {(amendments||[]).map((a:any)=><article className="panel amendment-card" key={a.id}>
          <div className="article-meta"><span className="badge">{a.number}</span><span className={"badge status-"+a.status}>{a.status}</span><time>{new Date(a.created_at).toLocaleDateString("fr-FR")}</time></div>
          <h3>{a.title}</h3>{a.rationale&&<p><b>Motif :</b> {a.rationale}</p>}<div className="amendment-text">{a.proposed_text}</div>
          {a.decision_notes&&<p className="staff-response"><b>Décision :</b> {a.decision_notes}</p>}
          {staff&&!["adopted","rejected","withdrawn"].includes(a.status)&&<form action={reviewAmendment} className="review-box"><input type="hidden" name="amendment_id" value={a.id}/><input type="hidden" name="document_id" value={doc.id}/><label>Note<textarea name="decision_notes" rows={2}/></label><div className="review-actions"><button className="button secondary" name="status" value="review">Mettre en revue</button><button className="button primary" name="status" value="adopted">Marquer adopté</button><button className="button secondary" name="status" value="rejected">Rejeter</button></div></form>}
          {a.proposed_by===user!.id&&["proposed","review"].includes(a.status)&&<form action={withdrawAmendment}><input type="hidden" name="amendment_id" value={a.id}/><input type="hidden" name="document_id" value={doc.id}/><button className="button secondary">Retirer ma proposition</button></form>}
        </article>)}
        {!amendments?.length&&<div className="panel empty-state">Aucun amendement.</div>}
      </div>
    </section>
  </section>
}
