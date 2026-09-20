import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { createCorrespondence, createIssuance, createTemplate } from "./actions";

const correspondenceStatus:Record<string,string>={
  draft:"Brouillon",registered:"Enregistré",review:"En revue",approved:"Approuvé",
  dispatched:"Envoyé",closed:"Clôturé",rejected:"Rejeté"
};
const issuanceStatus:Record<string,string>={
  draft:"Brouillon",review:"En revue",approved:"Approuvé",issued:"Délivré",rejected:"Rejeté",cancelled:"Annulé"
};

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
  const pendingReview=rows.filter((x:any)=>x.status==="review").length+docs.filter((x:any)=>x.status==="review").length;
  const incoming=rows.filter((x:any)=>x.direction==="incoming").length;
  const outgoing=rows.filter((x:any)=>x.direction==="outgoing").length;
  const issued=docs.filter((x:any)=>x.status==="issued").length;

  return <section className="page">
    <header className="page-header">
      <div><span className="eyebrow">Secrétariat & correspondances</span><h1>Centre administratif</h1></div>
      <span className="status-pill">{pendingReview} élément(s) en revue</span>
    </header>

    <div className="stat-grid admin-center-stats">
      <article><small>Courriers entrants</small><strong>{incoming}</strong><span>registre administratif</span></article>
      <article><small>Courriers sortants</small><strong>{outgoing}</strong><span>brouillons + envoyés</span></article>
      <article><small>Documents délivrés</small><strong>{issued}</strong><span>attestations & lettres</span></article>
      <article className={pendingReview?"attention-stat":""}><small>En validation</small><strong>{pendingReview}</strong><span>secrétariat / présidence</span></article>
    </div>

    <div className="content-grid admin-create-grid">
      <form action={createCorrespondence} className="panel form-stack">
        <div><span className="eyebrow">Registre</span><h2>Nouveau courrier</h2></div>
        <label>Sens<select name="direction"><option value="incoming">Entrant</option><option value="outgoing">Sortant</option></select></label>
        <label>Catégorie<input name="category" defaultValue="general"/></label>
        <label>Objet<input name="subject" required/></label>
        <label>Modèle de lettre<select name="template_id"><option value="">— Aucun —</option>{(templates||[]).filter((t:any)=>t.document_type==="letter").map((t:any)=><option key={t.id} value={t.id}>{t.code} · {t.title}</option>)}</select></label>
        <label>Correspondant<input name="correspondent_name" required/></label>
        <label>Coordonnées<input name="correspondent_contact"/></label>
        <label>Responsable<select name="assigned_to"><option value="">— Non attribué —</option>{(profiles||[]).map((p:any)=><option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>)}</select></label>
        <label>Membre lié<select name="member_id"><option value="">— Aucun —</option>{(members||[]).map((m:any)=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number||"sans n°"}</option>)}</select></label>
        <label>Décision liée<select name="decision_id"><option value="">— Aucune —</option>{(decisions||[]).map((d:any)=><option key={d.id} value={d.id}>{d.number} · {d.title}</option>)}</select></label>
        <label>Date de réception<input name="received_on" type="date"/></label>
        <label>Contenu / résumé<textarea name="body" rows={5}/></label>
        <label>Note interne<textarea name="notes" rows={2}/></label>
        <button className="button primary">Enregistrer le courrier</button>
      </form>

      <form action={createIssuance} className="panel form-stack">
        <div><span className="eyebrow">Document membre</span><h2>Préparer une attestation</h2></div>
        <label>Membre<select name="member_id" required><option value="">Choisir…</option>{(members||[]).map((m:any)=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number||"sans n°"}</option>)}</select></label>
        <label>Modèle<select name="template_id" required><option value="">Choisir…</option>{(templates||[]).map((t:any)=><option key={t.id} value={t.id}>{t.code} · {t.title}</option>)}</select></label>
        <label>Demande membre<select name="service_request_id"><option value="">— Aucune —</option>{(requests||[]).map((r:any)=><option key={r.id} value={r.id}>{r.subject}</option>)}</select></label>
        <label>Motif / usage<input name="purpose" placeholder="Dossier universitaire, banque…"/></label>
        <button className="button secondary">Générer le brouillon</button>
        <small className="muted">Le contenu est généré depuis le modèle et les informations du registre membre, puis reste modifiable tant qu’il est en brouillon.</small>
      </form>

      <form action={createTemplate} className="panel form-stack">
        <div><span className="eyebrow">Modèles</span><h2>Nouveau modèle</h2></div>
        <label>Code<input name="code" required placeholder="ATT-SCOL"/></label>
        <label>Titre<input name="title" required/></label>
        <label>Type<select name="document_type"><option value="attestation">Attestation</option><option value="letter">Lettre</option><option value="notice">Note</option><option value="request">Demande</option><option value="other">Autre</option></select></label>
        <label>Objet modèle<input name="subject_template"/></label>
        <label>Variables<input name="variables" placeholder="member_name, member_number, village"/></label>
        <label>Corps du modèle<textarea name="body_template" rows={8} required placeholder="Nous attestons que {{member_name}}…"/></label>
        <button className="button secondary">Créer le modèle</button>
      </form>
    </div>

    <div className="content-grid admin-register-grid">
      <article className="panel">
        <div className="panel-head"><div><span className="eyebrow">Registre</span><h2>Courriers</h2></div><span>{rows.length}</span></div>
        <div className="admin-register-list">
          {rows.map((row:any)=><Link href={"/administration/correspondence/"+row.id} key={row.id} className="admin-register-row">
            <span className={"admin-direction "+row.direction}>{row.direction==="incoming"?"ENT":"SOR"}</span>
            <span><small>{row.number} · {row.category}</small><b>{row.subject}</b><em>{row.correspondent_name}</em></span>
            <span className={"badge status-"+row.status}>{correspondenceStatus[row.status]||row.status}</span>
          </Link>)}
          {!rows.length&&<p>Aucun courrier enregistré.</p>}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><span className="eyebrow">Délivrances</span><h2>Documents administratifs</h2></div><span>{docs.length}</span></div>
        <div className="admin-register-list">
          {docs.map((doc:any)=>{const member=Array.isArray(doc.members)?doc.members[0]:doc.members;return <Link href={"/administration/issuances/"+doc.id} key={doc.id} className="admin-register-row">
            <span className="admin-direction document">DOC</span>
            <span><small>{doc.number} · {doc.document_type}</small><b>{doc.subject}</b><em>{member?.full_name||"Membre"} · {member?.member_number||"sans n°"}</em></span>
            <span className={"badge status-"+doc.status}>{issuanceStatus[doc.status]||doc.status}</span>
          </Link>})}
          {!docs.length&&<p>Aucun document administratif.</p>}
        </div>
      </article>
    </div>

    <section className="governance-section">
      <div className="section-heading-row"><div><span className="eyebrow">Bibliothèque</span><h2>Modèles actifs</h2></div></div>
      <div className="template-grid">{(templates||[]).map((t:any)=><article className="panel template-card" key={t.id}><span className="badge">{t.code}</span><h3>{t.title}</h3><p>{t.document_type}</p><small>{Array.isArray(t.variables)?t.variables.join(" · "):""}</small></article>)}</div>
    </section>
  </section>
}
