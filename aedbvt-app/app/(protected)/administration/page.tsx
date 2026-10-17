import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { Sheet, Tabs } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";
import { FilterList } from "@/components/manage/filter-list";
import { createCorrespondence, createIssuance, createTemplate } from "./actions";
import "@/app/manage.css";

const correspondenceStatus:Record<string,string>={
  draft:"Brouillon",registered:"Enregistré",review:"En traitement / validation",approved:"Approuvé",
  dispatched:"Envoyé",closed:"Clôturé",rejected:"Rejeté"
};
const issuanceStatus:Record<string,string>={
  draft:"Brouillon",review:"En validation",approved:"Approuvé",issued:"Délivré",rejected:"Rejeté",cancelled:"Annulé"
};
const documentTypeLabel:Record<string,string>={attestation:"Attestation",letter:"Lettre",notice:"Note",request:"Demande",other:"Autre"};
const okStatuses=["approved","dispatched","issued","registered"];

function DateChip({value}:{value?:string|null}){
  if(!value) return <span className="date-chip" aria-hidden="true"><b>—</b></span>;
  const date=new Date(value.length<=10?value+"T12:00:00":value);
  return <span className="date-chip"><b>{date.getDate()}</b><small>{date.toLocaleDateString("fr-FR",{month:"short"}).replace(".","")}</small></span>;
}

export default async function AdministrationPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  const [
    {data:profile},
    {data:correspondence},
    {data:issuances},
    {data:templates},
    {data:members},
    {data:profiles},
    {data:requests},
    {data:decisions},
  ]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("correspondence_register").select("id,number,direction,category,subject,correspondent_name,status,received_on,sent_on,assigned_to,created_at").order("created_at",{ascending:false}),
    supabase.from("administrative_issuances").select("id,number,document_type,member_id,subject,status,issued_at,created_at,members(full_name,member_number)").order("created_at",{ascending:false}),
    supabase.from("administrative_templates").select("id,code,title,document_type,subject_template,body_template,variables,active").eq("active",true).order("title"),
    supabase.from("members").select("id,full_name,member_number,village").eq("status","active").order("full_name"),
    supabase.from("profiles").select("id,full_name,role,active").eq("active",true).order("full_name"),
    supabase.from("member_service_requests").select("id,member_id,subject,request_type,status").in("status",["pending","in_review"]).order("created_at",{ascending:false}),
    supabase.from("decision_register").select("id,number,title,outcome").order("decision_date",{ascending:false}).limit(100),
  ]);

  if(!isStaff(profile?.role)) notFound();

  const rows=correspondence||[];
  const docs=issuances||[];
  const profileMap=new Map((profiles||[]).map((p:any)=>[p.id,p]));
  const reviewRows=rows.filter((x:any)=>x.status==="review");
  const reviewDocs=docs.filter((x:any)=>x.status==="review");
  const pendingReview=reviewRows.length+reviewDocs.length;
  const incoming=rows.filter((x:any)=>x.direction==="incoming").length;
  const outgoing=rows.filter((x:any)=>x.direction==="outgoing").length;
  const issued=docs.filter((x:any)=>x.status==="issued").length;
  const memberOf=(doc:any)=>Array.isArray(doc.members)?doc.members[0]:doc.members;

  /* ———— Formulaires ———— */
  const correspondenceForm=<form action={createCorrespondence} className="form-stack">
    <p className="form-section">Courrier</p>
    <div className="form-two">
      <label>Sens<select name="direction"><option value="incoming">Entrant</option><option value="outgoing">Sortant</option></select></label>
      <label>Catégorie<input name="category" defaultValue="general"/></label>
    </div>
    <label>Objet<input name="subject" required/></label>
    <div className="form-two">
      <label>Modèle de lettre<select name="template_id"><option value="">— Aucun —</option>{(templates||[]).filter((t:any)=>t.document_type==="letter").map((t:any)=><option key={t.id} value={t.id}>{t.code} · {t.title}</option>)}</select></label>
      <label>Date de réception<input name="received_on" type="date"/></label>
    </div>
    <p className="form-section">Correspondant</p>
    <div className="form-two">
      <label>Correspondant<input name="correspondent_name" required/></label>
      <label>Coordonnées<input name="correspondent_contact"/></label>
    </div>
    <p className="form-section">Suivi</p>
    <label>Responsable<select name="assigned_to"><option value="">— Non attribué —</option>{(profiles||[]).map((p:any)=><option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>)}</select></label>
    <div className="form-two">
      <label>Membre lié<select name="member_id"><option value="">— Aucun —</option>{(members||[]).map((m:any)=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number||"sans n°"}</option>)}</select></label>
      <label>Décision liée<select name="decision_id"><option value="">— Aucune —</option>{(decisions||[]).map((d:any)=><option key={d.id} value={d.id}>{d.number} · {d.title}</option>)}</select></label>
    </div>
    <p className="form-section">Contenu</p>
    <label>Contenu / résumé<textarea name="body" rows={5}/></label>
    <label>Note interne<textarea name="notes" rows={2}/></label>
    <button className="button primary">Enregistrer le courrier</button>
  </form>;

  const issuanceForm=<form action={createIssuance} className="form-stack">
    <label>Membre<select name="member_id" required><option value="">Choisir…</option>{(members||[]).map((m:any)=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number||"sans n°"}</option>)}</select></label>
    <label>Modèle<select name="template_id" required><option value="">Choisir…</option>{(templates||[]).map((t:any)=><option key={t.id} value={t.id}>{t.code} · {t.title}</option>)}</select></label>
    <label>Demande membre<select name="service_request_id"><option value="">— Aucune —</option>{(requests||[]).map((r:any)=><option key={r.id} value={r.id}>{r.subject}</option>)}</select></label>
    <label>Motif / usage<input name="purpose" placeholder="Dossier universitaire, banque…"/></label>
    <p className="form-hint">Le contenu est généré depuis le modèle et le registre membre, puis reste modifiable tant qu’il est en brouillon.</p>
    <button className="button primary">Générer le brouillon</button>
  </form>;

  const templateForm=<form action={createTemplate} className="form-stack">
    <div className="form-two">
      <label>Code<input name="code" required placeholder="ATT-SCOL"/></label>
      <label>Type<select name="document_type"><option value="attestation">Attestation</option><option value="letter">Lettre</option><option value="notice">Note</option><option value="request">Demande</option><option value="other">Autre</option></select></label>
    </div>
    <label>Titre<input name="title" required/></label>
    <label>Objet modèle<input name="subject_template"/></label>
    <label>Variables<input name="variables" placeholder="member_name, member_number, village"/></label>
    <label>Corps du modèle<textarea name="body_template" rows={8} required placeholder="Nous attestons que {{member_name}}…"/></label>
    <button className="button primary">Créer le modèle</button>
  </form>;

  const correspondenceSheet=(variant:"primary"|"secondary"="primary")=><Sheet label="Nouveau courrier" title="Nouveau courrier" description="Enregistrement au registre entrant ou sortant." variant={variant} wide>{correspondenceForm}</Sheet>;
  const issuanceSheet=(variant:"primary"|"secondary"="secondary")=><Sheet label="Attestation" title="Préparer une attestation" description="Brouillon généré depuis un modèle actif." icon="document" variant={variant}>{issuanceForm}</Sheet>;
  const templateSheet=(variant:"primary"|"secondary"="secondary")=><Sheet label="Modèle" title="Nouveau modèle" description="Gabarit réutilisable pour lettres et attestations." icon="book" variant={variant}>{templateForm}</Sheet>;

  /* ———— Lignes ———— */
  const correspondenceRow=(row:any)=>{
    const owner=profileMap.get(row.assigned_to||"");
    return <Link href={"/administration/correspondence/"+row.id} className="list-row stack-sm">
      <DateChip value={row.received_on||row.sent_on||row.created_at}/>
      <div><b>{row.subject}</b><small>{row.number} · {row.correspondent_name}{row.category&&row.category!=="general"?" · "+row.category:""}{owner?" · "+owner.full_name:""}</small></div>
      <div className="row-end">
        <span className={"badge"+(row.direction==="incoming"?"":" featured")}>{row.direction==="incoming"?"Entrant":"Sortant"}</span>
        <span className={"badge"+(row.status==="review"?" pinned":okStatuses.includes(row.status)?" ok":"")}>{correspondenceStatus[row.status]||row.status}</span>
      </div>
    </Link>;
  };
  const issuanceRow=(doc:any)=>{
    const member=memberOf(doc);
    return <Link href={"/administration/issuances/"+doc.id} className="list-row stack-sm">
      <span className="row-icon"><UiIcon name="document"/></span>
      <div><b>{doc.subject}</b><small>{doc.number} · {member?.full_name||"Membre"} · {member?.member_number||"sans n°"}</small></div>
      <div className="row-end">
        <span className="badge badge-muted">{documentTypeLabel[doc.document_type]||doc.document_type}</span>
        <span className={"badge"+(doc.status==="review"?" pinned":okStatuses.includes(doc.status)?" ok":"")}>{issuanceStatus[doc.status]||doc.status}</span>
      </div>
    </Link>;
  };

  const correspondenceView=<FilterList
    placeholder="Objet, numéro, correspondant…"
    filters={[
      {key:"direction",label:"Sens",options:[{value:"incoming",label:"Entrants"},{value:"outgoing",label:"Sortants"}]},
      {key:"status",label:"Statut",mode:"select",options:Object.entries(correspondenceStatus).map(([value,label])=>({value,label}))},
    ]}
    empty={<div className="panel empty-state"><p>Aucun courrier enregistré.</p>{correspondenceSheet()}</div>}
    items={rows.map((row:any)=>({
      id:row.id,
      text:[row.number,row.subject,row.correspondent_name,row.category].filter(Boolean).join(" "),
      facets:{direction:row.direction,status:row.status},
      node:correspondenceRow(row),
    }))}
  />;

  const issuanceView=<FilterList
    placeholder="Objet, numéro, membre…"
    filters={[{key:"status",label:"Statut",mode:"select",options:Object.entries(issuanceStatus).map(([value,label])=>({value,label}))}]}
    empty={<div className="panel empty-state"><p>Aucun document administratif.</p>{issuanceSheet("primary")}</div>}
    items={docs.map((doc:any)=>{const member=memberOf(doc);return {
      id:doc.id,
      text:[doc.number,doc.subject,doc.document_type,member?.full_name,member?.member_number].filter(Boolean).join(" "),
      facets:{status:doc.status},
      node:issuanceRow(doc),
    };})}
  />;

  const templateView=(templates||[]).length
    ? <div className="manage-grid">{(templates||[]).map((t:any)=><article className="panel manage-card" key={t.id}>
      <div className="card-top"><h3>{t.title}</h3><span className="badge">{t.code}</span></div>
      <p>{documentTypeLabel[t.document_type]||t.document_type}{t.subject_template?" · "+t.subject_template:""}</p>
      {Array.isArray(t.variables)&&t.variables.length>0&&<small>{t.variables.join(" · ")}</small>}
    </article>)}</div>
    : <div className="panel empty-state"><p>Aucun modèle actif.</p>{templateSheet("primary")}</div>;

  const reviewView=pendingReview
    ? <div className="panel list-card">
      {reviewRows.map((row:any)=><Fragment key={row.id}>{correspondenceRow(row)}</Fragment>)}
      {reviewDocs.map((doc:any)=><Fragment key={doc.id}>{issuanceRow(doc)}</Fragment>)}
    </div>
    : <div className="panel empty-state">Rien à valider pour le moment.</div>;

  return <section className="page manage-page">
    <header className="page-header">
      <div><h1>Secrétariat</h1><p>{rows.length} courrier(s) au registre, {docs.length} document(s) administratif(s), {pendingReview} en validation.</p></div>
      <div className="header-actions">{templateSheet()}{issuanceSheet()}{correspondenceSheet()}</div>
    </header>

    <div className="stat-grid manage-stats">
      <article><a className="stat-link" href="#courriers"><small>Courriers entrants</small><strong>{incoming}</strong><span>registre administratif</span></a></article>
      <article><a className="stat-link" href="#courriers"><small>Courriers sortants</small><strong>{outgoing}</strong><span>brouillons et envoyés</span></a></article>
      <article><a className="stat-link" href="#documents"><small>Documents délivrés</small><strong>{issued}</strong><span>attestations et lettres</span></a></article>
      <article className={pendingReview?"attention-stat":""}><a className="stat-link" href="#a-valider"><small>En validation</small><strong>{pendingReview}</strong><span>secrétariat / présidence</span></a></article>
    </div>

    <Tabs tabs={[
      {id:"courriers",label:"Courriers",count:rows.length,content:correspondenceView},
      {id:"documents",label:"Documents délivrés",count:docs.length,content:issuanceView},
      {id:"modeles",label:"Modèles",count:(templates||[]).length,content:templateView},
      {id:"a-valider",label:"À valider",count:pendingReview,content:reviewView},
    ]}/>
  </section>;
}
