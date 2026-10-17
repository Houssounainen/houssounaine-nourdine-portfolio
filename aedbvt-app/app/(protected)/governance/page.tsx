import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { Sheet, Tabs } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";
import { FilterList } from "@/components/manage/filter-list";
import { createAssembly, createElection } from "./actions";
import "@/app/manage.css";

const statusLabel:Record<string,string>={draft:"Brouillon",published:"Convoquée",open:"Ouverte",closed:"Clôturée",archived:"Archivée",cancelled:"Annulée"};
const electionStatus:Record<string,string>={draft:"Brouillon",published:"Publiée",open:"Scrutin ouvert",closed:"Clôturée",cancelled:"Annulée"};
const outcomeLabel:Record<string,string>={adopted:"Adoptée",rejected:"Rejetée",elected:"Élu",published:"Publiée",recorded:"Consignée",withdrawn:"Retirée"};
const statusClass=(status:string)=>status==="open"?" ok":status==="published"?" featured":status==="draft"?" pinned":"";

function DateChip({value}:{value?:string|null}){
  if(!value) return <span className="date-chip" aria-hidden="true"><b>—</b></span>;
  const date=new Date(value.length<=10?value+"T12:00:00":value);
  return <span className="date-chip"><b>{date.getDate()}</b><small>{date.toLocaleDateString("fr-FR",{month:"short"}).replace(".","")}</small></span>;
}

export default async function GovernancePage() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:docs},{data:assemblies},{data:elections},{data:decisions}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("governance_documents").select("id,title,category,version,published,updated_at").order("category").order("title"),
    supabase.from("assemblies").select("id,title,assembly_type,starts_at,location,mode,status,quorum_percent").order("starts_at",{ascending:false}),
    supabase.from("elections").select("id,title,starts_at,ends_at,status,description").order("starts_at",{ascending:false}),
    supabase.from("decision_register").select("id,number,decision_type,title,outcome,decision_date").order("decision_date",{ascending:false}).limit(12),
  ]);
  const staff=isStaff(profile?.role);
  const now=new Date().toISOString();
  const upcoming=(assemblies||[]).filter(a=>a.starts_at>=now&&a.status!=="archived");
  const openElections=(elections||[]).filter(e=>e.status==="open");
  const categories=[...new Set((docs||[]).map(d=>d.category).filter(Boolean))];

  const assemblyForm=<form action={createAssembly} className="form-stack">
    <p className="form-section">Assemblée</p>
    <label>Titre<input name="title" required placeholder="Assemblée générale ordinaire"/></label>
    <div className="form-two">
      <label>Type<select name="assembly_type"><option value="ordinary">Ordinaire</option><option value="extraordinary">Extraordinaire</option></select></label>
      <label>Date et heure<input name="starts_at" type="datetime-local" required/></label>
    </div>
    <div className="form-two">
      <label>Mode<select name="mode"><option>Présentiel</option><option>Visio</option><option>Hybride</option></select></label>
      <label>Quorum configuré (%)<input name="quorum_percent" type="number" min="1" max="100" defaultValue="50" required/></label>
    </div>
    <label>Lieu / lien<input name="location"/></label>
    <p className="form-section">Convocation</p>
    <label>Ordre du jour<textarea name="agenda" rows={4} placeholder="Un point par ligne"/></label>
    <label>Note de convocation<textarea name="notice" rows={3}/></label>
    <button className="button primary">Créer l’assemblée</button>
  </form>;

  const electionForm=<form action={createElection} className="form-stack">
    <label>Titre<input name="title" required placeholder="Élection du Bureau"/></label>
    <div className="form-two">
      <label>Ouverture<input name="starts_at" type="datetime-local" required/></label>
      <label>Clôture<input name="ends_at" type="datetime-local" required/></label>
    </div>
    <label>Description<textarea name="description" rows={3}/></label>
    <label>Règles du scrutin<textarea name="rules" rows={5} placeholder="Conditions de candidature, modalités, dispositions particulières…"/></label>
    <button className="button primary">Créer l’élection</button>
  </form>;

  const assemblySheet=(variant:"primary"|"secondary"="primary")=><Sheet label="Convoquer une AG" title="Convoquer une assemblée" description="Créée en brouillon ; la convocation se publie depuis sa fiche." icon="calendar" variant={variant}>{assemblyForm}</Sheet>;
  const electionSheet=(variant:"primary"|"secondary"="secondary")=><Sheet label="Élection" title="Préparer une élection" description="Créée en brouillon ; postes et candidatures se gèrent depuis sa fiche." icon="check" variant={variant}>{electionForm}</Sheet>;

  const assemblyView=<FilterList
    placeholder="Rechercher une assemblée…"
    filters={[
      {key:"type",label:"Type",options:[{value:"ordinary",label:"Ordinaires"},{value:"extraordinary",label:"Extraordinaires"}]},
      {key:"status",label:"Statut",mode:"select",options:["draft","published","open","closed","archived"].map(value=>({value,label:statusLabel[value]}))},
    ]}
    empty={<div className="panel empty-state"><p>Aucune assemblée créée.</p>{staff&&assemblySheet()}</div>}
    items={(assemblies||[]).map(assembly=>({
      id:assembly.id,
      text:[assembly.title,assembly.location,assembly.mode].filter(Boolean).join(" "),
      facets:{type:assembly.assembly_type,status:assembly.status},
      node:<Link className="list-row stack-sm" href={"/governance/assemblies/"+assembly.id}>
        <DateChip value={assembly.starts_at}/>
        <div><b>{assembly.title}</b><small>{new Date(assembly.starts_at).toLocaleString("fr-FR",{dateStyle:"long",timeStyle:"short"})} · {assembly.location||assembly.mode} · quorum {Number(assembly.quorum_percent)} %</small></div>
        <div className="row-end">
          {assembly.assembly_type==="extraordinary"&&<span className="badge badge-muted">Extraordinaire</span>}
          <span className={"badge"+statusClass(assembly.status)}>{statusLabel[assembly.status]||assembly.status}</span>
        </div>
      </Link>,
    }))}
  />;

  const electionView=(elections||[]).length
    ? <div className="panel list-card">{(elections||[]).map(election=><Link className="list-row stack-sm" href={"/governance/elections/"+election.id} key={election.id}>
      <DateChip value={election.starts_at}/>
      <div><b>{election.title}</b><small>Du {new Date(election.starts_at).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})} au {new Date(election.ends_at).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})}</small></div>
      <div className="row-end"><span className={"badge"+statusClass(election.status)}>{electionStatus[election.status]||election.status}</span></div>
    </Link>)}</div>
    : <div className="panel empty-state"><p>Aucune élection créée.</p>{staff&&electionSheet("primary")}</div>;

  const textView=<>
    <div className="tab-head"><p>Statuts, règlement intérieur et politiques, avec versions et amendements.</p><Link className="button secondary" href="/governance/documents"><UiIcon name="book"/>Centre documentaire</Link></div>
    <FilterList
      placeholder="Rechercher un texte…"
      filters={categories.length>1?[{key:"category",label:"Catégorie",mode:"select",options:categories.map(value=>({value,label:value}))}]:[]}
      empty={<div className="panel empty-state">Aucun texte enregistré.</div>}
      items={(docs||[]).map(d=>({
        id:d.id,
        text:[d.title,d.category].filter(Boolean).join(" "),
        facets:{category:d.category},
        node:<Link className="list-row stack-sm" href={"/governance/documents/"+d.id}>
          <span className="row-icon"><UiIcon name="document"/></span>
          <div><b>{d.title}</b><small>{d.category} · version {d.version} · mis à jour le {new Date(d.updated_at).toLocaleDateString("fr-FR")}</small></div>
          <div className="row-end"><span className={"badge"+(d.published?" ok":" pinned")}>{d.published?"Publié":"Brouillon"}</span></div>
        </Link>,
      }))}
    />
    {staff&&<p className="notice manage-legal">Quorum, majorité, procuration, éligibilité et organisation des élections sont configurables ; ils doivent correspondre aux statuts et au règlement intérieur adoptés.</p>}
  </>;

  const decisionView=<>
    <div className="tab-head"><p>Dernières décisions consignées.</p><Link className="button secondary" href="/governance/decisions"><UiIcon name="list"/>Registre complet</Link></div>
    {(decisions||[]).length
      ? <div className="panel list-card">{(decisions||[]).map(d=><Link className="list-row stack-sm" href="/governance/decisions" key={d.id}>
        <span className="row-icon"><UiIcon name="check"/></span>
        <div><b>{d.title}</b><small>{d.number}{d.decision_date?" · "+new Date(d.decision_date).toLocaleDateString("fr-FR"):""}{d.decision_type?" · "+d.decision_type:""}</small></div>
        <div className="row-end"><span className={"badge"+(["adopted","elected"].includes(d.outcome)?" ok":"")}>{outcomeLabel[d.outcome]||d.outcome}</span></div>
      </Link>)}</div>
      : <div className="panel empty-state">Aucune décision consignée.</div>}
  </>;

  return (
    <section className="page manage-page">
      <header className="page-header">
        <div><h1>Gouvernance</h1><p>{upcoming.length} assemblée(s) à venir, {openElections.length} scrutin(s) ouvert(s), {docs?.length||0} texte(s) de référence.</p></div>
        {staff&&<div className="header-actions">{electionSheet()}{assemblySheet()}</div>}
      </header>

      <div className="stat-grid manage-stats">
        <article><a className="stat-link" href="#assemblees"><small>Assemblées</small><strong>{assemblies?.length||0}</strong><span>{upcoming.length} à venir</span></a></article>
        <article><a className="stat-link" href="#elections"><small>Élections</small><strong>{elections?.length||0}</strong><span>{openElections.length} scrutin(s) ouvert(s)</span></a></article>
        <article><a className="stat-link" href="#textes"><small>Textes officiels</small><strong>{docs?.length||0}</strong><span>{(docs||[]).filter(d=>d.published).length} publié(s)</span></a></article>
        <article><a className="stat-link" href="#decisions"><small>Décisions récentes</small><strong>{decisions?.length||0}</strong><span>registre durable</span></a></article>
      </div>

      <Tabs tabs={[
        {id:"assemblees",label:"Assemblées",count:assemblies?.length||0,content:assemblyView},
        {id:"elections",label:"Élections",count:elections?.length||0,content:electionView},
        {id:"textes",label:"Textes",count:docs?.length||0,content:textView},
        {id:"decisions",label:"Décisions",content:decisionView},
      ]}/>
    </section>
  );
}
