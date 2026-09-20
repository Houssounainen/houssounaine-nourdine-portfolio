import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { createAssembly, createElection } from "./actions";

export default async function GovernancePage() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:docs},{data:assemblies},{data:elections}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("governance_documents").select("id,title,category,version,published,updated_at").order("category").order("title"),
    supabase.from("assemblies").select("id,title,assembly_type,starts_at,location,mode,status,quorum_percent").order("starts_at",{ascending:false}),
    supabase.from("elections").select("id,title,starts_at,ends_at,status,description").order("starts_at",{ascending:false}),
  ]);
  const staff=isStaff(profile?.role);

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Institutions & transparence</span><h1>Gouvernance</h1></div><span className="status-pill">Décisions traçables · scrutins protégés</span></header>

      <div className="governance-hero-grid">
        <article className="panel governance-hero-card"><span className="eyebrow">Assemblées générales</span><strong>{assemblies?.length||0}</strong><p>Convocations, quorum, procurations, motions et procès-verbaux.</p><a href="#assemblees">Voir les assemblées ↓</a></article>
        <article className="panel governance-hero-card"><span className="eyebrow">Élections</span><strong>{elections?.length||0}</strong><p>Candidatures, scrutins secrets, participation et résultats après clôture.</p><a href="#elections">Voir les élections ↓</a></article>
        <article className="panel governance-hero-card"><span className="eyebrow">Textes officiels</span><strong>{docs?.length||0}</strong><p>Versions, validations, amendements et archives institutionnelles.</p><Link href="/governance/documents">Centre documentaire →</Link></article>
        <article className="panel governance-hero-card"><span className="eyebrow">Décisions</span><strong>REG</strong><p>Motions, publications, amendements et résultats consignés dans un registre durable.</p><Link href="/governance/decisions">Registre des décisions →</Link></article>
      </div>

      {staff&&<div className="content-grid governance-create-grid">
        <form action={createAssembly} className="panel form-stack">
          <div><span className="eyebrow">Nouvelle assemblée</span><h2>Convoquer une AG</h2></div>
          <label>Titre<input name="title" required placeholder="Assemblée générale ordinaire"/></label>
          <label>Type<select name="assembly_type"><option value="ordinary">Ordinaire</option><option value="extraordinary">Extraordinaire</option></select></label>
          <label>Date et heure<input name="starts_at" type="datetime-local" required/></label>
          <label>Mode<select name="mode"><option>Présentiel</option><option>Visio</option><option>Hybride</option></select></label>
          <label>Lieu / lien<input name="location"/></label>
          <label>Quorum configuré (%)<input name="quorum_percent" type="number" min="1" max="100" defaultValue="50" required/></label>
          <label>Ordre du jour<textarea name="agenda" rows={4} placeholder="Un point par ligne"/></label>
          <label>Note de convocation<textarea name="notice" rows={3}/></label>
          <button className="button primary">Créer l’assemblée</button>
        </form>

        <form action={createElection} className="panel form-stack">
          <div><span className="eyebrow">Nouveau scrutin</span><h2>Préparer une élection</h2></div>
          <label>Titre<input name="title" required placeholder="Élection du Bureau"/></label>
          <label>Ouverture<input name="starts_at" type="datetime-local" required/></label>
          <label>Clôture<input name="ends_at" type="datetime-local" required/></label>
          <label>Description<textarea name="description" rows={3}/></label>
          <label>Règles du scrutin<textarea name="rules" rows={5} placeholder="Conditions de candidature, modalités, dispositions particulières…"/></label>
          <button className="button secondary">Créer l’élection</button>
        </form>
      </div>}

      <section id="assemblees" className="governance-section">
        <div className="section-heading-row"><div><span className="eyebrow">Délibération</span><h2>Assemblées générales</h2></div></div>
        <div className="governance-list">
          {(assemblies||[]).map((assembly)=><Link className="panel governance-row" href={"/governance/assemblies/"+assembly.id} key={assembly.id}><div><span className="badge">{assembly.assembly_type==="extraordinary"?"Extraordinaire":"Ordinaire"}</span><h3>{assembly.title}</h3><p>{new Date(assembly.starts_at).toLocaleString("fr-FR",{dateStyle:"long",timeStyle:"short"})} · {assembly.location||assembly.mode}</p></div><div className="governance-row-end"><span className={"badge status-"+assembly.status}>{assembly.status}</span><small>Quorum {Number(assembly.quorum_percent)}%</small><b>→</b></div></Link>)}
          {!assemblies?.length&&<div className="panel empty-state">Aucune assemblée créée.</div>}
        </div>
      </section>

      <section id="elections" className="governance-section">
        <div className="section-heading-row"><div><span className="eyebrow">Scrutin</span><h2>Élections</h2></div></div>
        <div className="governance-list">
          {(elections||[]).map((election)=><Link className="panel governance-row" href={"/governance/elections/"+election.id} key={election.id}><div><span className="badge">Élection</span><h3>{election.title}</h3><p>Du {new Date(election.starts_at).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})} au {new Date(election.ends_at).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})}</p></div><div className="governance-row-end"><span className={"badge status-"+election.status}>{election.status}</span><b>→</b></div></Link>)}
          {!elections?.length&&<div className="panel empty-state">Aucune élection créée.</div>}
        </div>
      </section>

      <section id="textes" className="governance-section">
        <div className="section-heading-row"><div><span className="eyebrow">Référentiel</span><h2>Textes & politiques</h2></div></div>
        <div className="governance-grid">{(docs||[]).map(d=><Link className="panel gov-card" href={"/governance/documents/"+d.id} key={d.id}><span className="eyebrow">{d.category}</span><h2>{d.title}</h2><p>Version {d.version} · {d.published?"publiée":"brouillon"}</p><small>Dernière mise à jour : {new Date(d.updated_at).toLocaleDateString("fr-FR")}</small></Link>)}</div>
      </section>

      <article className="panel warning"><h2>Paramètres juridiques à valider</h2><p>Les règles de quorum, majorité, procuration, éligibilité et organisation des élections sont configurables dans l’application. Elles doivent être alignées sur les statuts et le règlement intérieur effectivement adoptés avant utilisation institutionnelle.</p></article>
    </section>
  );
}
