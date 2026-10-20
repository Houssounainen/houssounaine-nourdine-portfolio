import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { getPeople } from "@/lib/people";
import { Avatar } from "@/components/avatar";
import { UiIcon } from "@/components/ui-icon";
import { CardHead, DetailHero, EmptyCard, Pill } from "@/components/gov-ui";
import { AMENDMENT_STATUS, APPROVAL_DECISION, APP_ROLE, VERSION_STATUS, dateOnly, dateTime, label } from "@/lib/governance-labels";
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
  const people=await getPeople(supabase,[...(amendments||[]).map((a:any)=>a.proposed_by),...(approvals||[]).map((a:any)=>a.approver_id)]);
  const published=(versions||[]).find(v=>v.status==="published")||null;
  const latest=(versions||[])[0]||null;

  return <section className="page gv-page">
    <DetailHero
      back={{href:"/governance/documents",label:"Textes officiels"}}
      kicker={doc.category}
      title={doc.title}
      icon="book"
      color="#344054"
      status={<Pill tone={doc.published?"ok":"warn"}>{doc.published?"En vigueur · v"+doc.version:"Non publié"}</Pill>}
      meta={<><span><UiIcon name="clock"/>Mis à jour le {dateOnly(doc.updated_at,"long")}</span><span><UiIcon name="list"/>{(versions||[]).length} version{(versions||[]).length>1?"s":""}</span></>}
      actions={published?<a className="button secondary" href={"/api/governance/documents/"+published.id}><UiIcon name="download"/>Télécharger (PDF)</a>:undefined}
    />

    {published?<article className="gv-card">
      <CardHead icon="document" color="#344054" eyebrow="Version en vigueur" title={`${published.title} · v${published.version_label}`} aside={published.published_at?<Pill tone="ok">Publiée le {dateOnly(published.published_at)}</Pill>:undefined}/>
      <div className="gv-doc-body">{published.body}</div>
      <div className="gv-hash"><UiIcon name="shield" width={14} height={14}/>Empreinte SHA-256<code>{published.checksum||"—"}</code></div>
    </article>:<EmptyCard icon="document" color="#344054" title="Aucune version en vigueur" text="Ce texte n’a pas encore été publié."/>}

    {staff&&<details className="gv-card gv-disclosure">
      <summary><span className="icon-tile" style={{"--tile":"#2453d6"} as React.CSSProperties}><UiIcon name="pencil"/></span>Créer une nouvelle version</summary>
      <form action={createVersion} className="form-stack">
        <input type="hidden" name="document_id" value={doc.id}/>
        <input type="hidden" name="based_on_version_id" value={published?.id||latest?.id||""}/>
        <div className="form-two">
          <label>Version<input name="version_label" required placeholder="1.1"/></label>
          <label>Titre<input name="title" defaultValue={doc.title} required/></label>
        </div>
        <label>Résumé des changements<input name="change_summary" placeholder="Ex. clarification de l’article 4"/></label>
        <label>Contenu<textarea name="body" rows={12} defaultValue={published?.body||latest?.body||""} required/></label>
        <button className="button primary">Créer le brouillon</button>
      </form>
    </details>}

    <h2 className="gv-section"><span className="icon-tile" style={{"--tile":"#0ba5ec"} as React.CSSProperties}><UiIcon name="clock"/></span>Historique des versions</h2>
    <ol className="gv-timeline">
      {(versions||[]).map(version=>{
        const versionApprovals=(approvals||[]).filter((a:any)=>a.version_id===version.id);
        const [vText,vTone]=label(VERSION_STATUS,version.status);
        return <li className={"tone-"+vTone} key={version.id}><article className="gv-card">
          <CardHead icon="document" color="#0ba5ec" eyebrow={dateTime(version.published_at||version.created_at)} title={`v${version.version_label} · ${version.title}`} aside={<div className="gv-tags"><Pill tone={vTone}>{vText}</Pill><a className="button secondary" href={"/api/governance/documents/"+version.id} aria-label={`Télécharger la version ${version.version_label} en PDF`}>PDF</a></div>}/>
          {version.change_summary&&<p className="gv-lead"><b>Changements :</b> {version.change_summary}</p>}
          <details className="gv-details"><summary>Lire cette version</summary><div className="gv-doc-body">{version.body}</div></details>

          {staff&&version.status==="draft"&&<details className="gv-details"><summary>Modifier le brouillon</summary><form action={updateDraftVersion} className="form-stack">
            <input type="hidden" name="version_id" value={version.id}/><input type="hidden" name="document_id" value={doc.id}/>
            <label>Titre<input name="title" defaultValue={version.title} required/></label>
            <label>Résumé<input name="change_summary" defaultValue={version.change_summary||""}/></label>
            <label>Contenu<textarea name="body" rows={10} defaultValue={version.body} required/></label>
            <button className="button secondary">Enregistrer</button>
          </form></details>}

          {staff&&version.status==="draft"&&<form action={submitVersion}><input type="hidden" name="version_id" value={version.id}/><input type="hidden" name="document_id" value={doc.id}/><button className="button primary">Soumettre en revue</button></form>}

          {canApprove&&version.status==="review"&&<form action={reviewVersion} className="gv-review">
            <input type="hidden" name="version_id" value={version.id}/><input type="hidden" name="document_id" value={doc.id}/>
            <label>Note de validation<textarea name="note" rows={2}/></label>
            <div className="gv-review-actions"><button className="button primary" name="decision" value="approved">Approuver</button><button className="button secondary" name="decision" value="rejected">Rejeter</button></div>
          </form>}

          {canPublish&&version.status==="approved"&&<form action={publishVersion}><input type="hidden" name="version_id" value={version.id}/><input type="hidden" name="document_id" value={doc.id}/><button className="button primary">Publier cette version</button></form>}

          {staff&&versionApprovals.length>0&&<div className="gv-log"><small>Journal de validation</small>{versionApprovals.map((a:any)=>{const p=Array.isArray(a.profiles)?a.profiles[0]:a.profiles;const person=people.get(a.approver_id);const name=person?.full_name||p?.full_name||"Validateur";const [dText,dTone]=label(APPROVAL_DECISION,a.decision);return <div key={a.id}><Avatar name={name} url={person?.avatar_url||null} size={30}/><span><b>{name} · {APP_ROLE[a.role_at_decision]||a.role_at_decision}</b><small>{dateTime(a.decided_at)}{a.note?" · "+a.note:""}</small></span><Pill tone={dTone}>{dText}</Pill></div>})}</div>}
        </article></li>
      })}
    </ol>
    {!versions?.length&&<EmptyCard icon="clock" color="#0ba5ec" title="Aucune version" text="L’historique des versions apparaîtra ici."/>}

    {doc.current_version_id&&<details className="gv-card gv-disclosure">
      <summary><span className="icon-tile" style={{"--tile":"#7a5af8"} as React.CSSProperties}><UiIcon name="pencil"/></span>Proposer un amendement</summary>
      <form action={proposeAmendment} className="form-stack">
        <input type="hidden" name="document_id" value={doc.id}/>
        <div className="form-two">
          <label>Titre<input name="title" required placeholder="Modification de l’article…"/></label>
          <label>Motif<input name="rationale"/></label>
        </div>
        <label>Texte proposé<textarea name="proposed_text" rows={6} required/></label>
        <button className="button primary">Soumettre l’amendement</button>
      </form>
    </details>}

    <h2 className="gv-section"><span className="icon-tile" style={{"--tile":"#7a5af8"} as React.CSSProperties}><UiIcon name="comment"/></span>Amendements</h2>
    <div className="gv-stack">
      {(amendments||[]).map((a:any)=>{
        const [aText,aTone]=label(AMENDMENT_STATUS,a.status);
        const author=people.get(a.proposed_by);
        return <article className="gv-card" key={a.id}>
          <div className="gv-motion-head"><div className="gv-tags"><Pill tone={aTone}>{aText}</Pill><Pill>{a.number}</Pill></div><time className="gv-muted" dateTime={a.created_at}>{dateOnly(a.created_at)}</time></div>
          <h3 className="gv-amend-title">{a.title}</h3>
          {author&&<div className="gv-row"><Avatar name={author.full_name} url={author.avatar_url} size={30} href={`/people/${author.id}`}/><div><b>{author.full_name}</b><small>Auteur de la proposition</small></div></div>}
          {a.rationale&&<p className="gv-lead"><b>Motif :</b> {a.rationale}</p>}
          <blockquote className="gv-quote">{a.proposed_text}</blockquote>
          {a.decision_notes&&<p className="gv-case-block is-ok"><b>Décision</b>{a.decision_notes}</p>}
          {staff&&!["adopted","rejected","withdrawn"].includes(a.status)&&<form action={reviewAmendment} className="gv-review"><input type="hidden" name="amendment_id" value={a.id}/><input type="hidden" name="document_id" value={doc.id}/><label>Note<textarea name="decision_notes" rows={2}/></label><div className="gv-review-actions"><button className="button secondary" name="status" value="review">Mettre en revue</button><button className="button primary" name="status" value="adopted">Marquer adopté</button><button className="button secondary" name="status" value="rejected">Rejeter</button></div></form>}
          {a.proposed_by===user!.id&&["proposed","review"].includes(a.status)&&<form action={withdrawAmendment}><input type="hidden" name="amendment_id" value={a.id}/><input type="hidden" name="document_id" value={doc.id}/><button className="button secondary">Retirer ma proposition</button></form>}
        </article>;
      })}
      {!amendments?.length&&<EmptyCard icon="comment" color="#7a5af8" title="Aucun amendement" text="Les propositions de modification du texte apparaîtront ici."/>}
    </div>
  </section>
}
