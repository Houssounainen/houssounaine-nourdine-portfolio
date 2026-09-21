import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { reviewMembershipApplication } from "./actions";

const labels:Record<string,string>={
  pending:"Reçue",
  in_review:"En cours",
  approved:"Approuvée",
  rejected:"Refusée",
  withdrawn:"Retirée",
};

export default async function ApplicationsPage({
  searchParams,
}:{searchParams:Promise<{q?:string;status?:string}>}){
  const filters=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:applications}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("membership_applications")
      .select("id,reference,full_name,village,program,study_level,phone,email,motivation,status,decision_note,member_id,submitted_at,reviewed_at")
      .order("submitted_at",{ascending:false}),
  ]);
  if(!can(profile?.role,"members_manage")) notFound();

  const rows=applications||[];
  const query=(filters.q||"").trim().toLocaleLowerCase("fr");
  const status=filters.status||"all";
  const filtered=rows.filter((item)=>{
    if(status!=="all"&&item.status!==status) return false;
    if(!query) return true;
    return [
      item.reference,
      item.full_name,
      item.village,
      item.program,
      item.study_level,
      item.phone,
      item.email,
    ].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(query);
  });

  const pending=rows.filter((item)=>item.status==="pending").length;
  const inReview=rows.filter((item)=>item.status==="in_review").length;
  const approved=rows.filter((item)=>item.status==="approved").length;

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Adhésions</span><h1>Candidatures</h1></div><span className="status-pill">{pending} reçue(s) · {inReview} en cours</span></header>

    <div className="stat-grid">
      <article><small>À examiner</small><strong>{pending}</strong><span>nouvelle(s) candidature(s)</span></article>
      <article><small>En cours</small><strong>{inReview}</strong><span>dossier(s) pris en charge</span></article>
      <article><small>Approuvées</small><strong>{approved}</strong><span>membre(s) créé(s)</span></article>
      <article><small>Total</small><strong>{rows.length}</strong><span>historique conservé</span></article>
    </div>

    <form className="panel request-filter-bar" method="get">
      <label className="request-filter-search"><span className="sr-only">Rechercher</span><input name="q" defaultValue={filters.q||""} placeholder="Nom, référence, email, filière…"/></label>
      <label><span className="sr-only">Statut</span><select name="status" defaultValue={status}><option value="all">Tous les statuts</option>{Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <button className="button secondary">Filtrer</button>
      {(filters.q||status!=="all")&&<a className="button secondary" href="/applications">Réinitialiser</a>}
      <span className="directory-count">{filtered.length} / {rows.length}</span>
    </form>

    <div className="application-review-list">
      {filtered.map((item)=><article className="panel application-review-card" key={item.id}>
        <div className="application-review-head">
          <span><small>{item.reference}</small><h2>{item.full_name}</h2><em>{new Date(item.submitted_at).toLocaleString("fr-FR")}</em></span>
          <span className={"badge application-"+item.status}>{labels[item.status]||item.status}</span>
        </div>

        <div className="application-review-meta">
          <span><small>Village</small><b>{item.village}</b></span>
          <span><small>Études</small><b>{[item.program,item.study_level].filter(Boolean).join(" · ")||"—"}</b></span>
          <span><small>Téléphone</small><b>{item.phone}</b></span>
          <span><small>Email</small><b>{item.email}</b></span>
        </div>

        {item.motivation&&<div className="application-motivation"><small>Motivation</small><p>{item.motivation}</p></div>}
        {item.decision_note&&<div className="notice"><b>Note de décision</b><br/>{item.decision_note}</div>}

        {!["approved","rejected","withdrawn"].includes(item.status)&&<form action={reviewMembershipApplication} className="application-review-actions">
          <input type="hidden" name="application_id" value={item.id}/>
          <label>Note / message au candidat<textarea name="decision_note" rows={3} maxLength={800} defaultValue={item.decision_note||""}/></label>
          <div>
            {item.status==="pending"&&<button className="button secondary" name="status" value="in_review">Prendre en charge</button>}
            <button className="button primary" name="status" value="approved">Approuver & créer membre</button>
            <button className="button danger" name="status" value="rejected">Refuser</button>
          </div>
        </form>}

        {item.status==="approved"&&<div className="application-member-created"><b>Membre créé</b><span>Cette personne apparaît désormais dans le registre et dans l’onboarding des comptes.</span></div>}
      </article>)}
      {!filtered.length&&<div className="panel empty-state">Aucune candidature ne correspond aux filtres.</div>}
    </div>
  </section>;
}
