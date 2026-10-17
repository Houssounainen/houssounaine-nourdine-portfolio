import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { Sheet, Tabs } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";
import { FilterList } from "@/components/manage/filter-list";
import { createPartner } from "./actions";
import "@/app/manage.css";

const typeLabels:Record<string,string>={donor:"Donateur",sponsor:"Sponsor",institution:"Institution",business:"Entreprise",ngo:"ONG / association",other:"Autre"};
const statusLabels:Record<string,string>={prospect:"Prospect",contacted:"Contacté",active:"Actif",inactive:"Inactif"};
const commitmentStatus:Record<string,string>={pledged:"Promis",partial:"Partiel",received:"Reçu",cancelled:"Annulé"};
const contributionLabel:Record<string,string>={donation:"Don",sponsorship:"Sponsoring",in_kind:"En nature"};
const partnerClass:Record<string,string>={active:" ok",contacted:" featured",prospect:" pinned",inactive:""};
const money=(value:number)=>value.toLocaleString("fr-FR")+" Ar";
const initials=(name?:string)=>(name||"?").split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase();

export default async function PartnersPage({
  searchParams,
}:{searchParams:Promise<{q?:string;status?:string;type?:string}>}){
  const filters=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:partners},{data:commitments}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("partners").select("id,name,partner_type,status,contact_name,email,phone,created_at").order("name"),
    supabase.from("partner_commitments").select("id,partner_id,title,pledged_amount,received_amount,status,contribution_type,pledged_on,due_on").order("pledged_on",{ascending:false}),
  ]);
  if(!can(profile?.role,"partners_manage")) notFound();

  // Filtres hérités de l’URL (liens existants) ; recherche et filtres rapides ensuite côté client.
  const query=(filters.q||"").trim().toLocaleLowerCase("fr");
  const status=filters.status||"all";
  const type=filters.type||"all";
  const rows=(partners||[]).filter((partner)=>{
    if(status!=="all"&&partner.status!==status) return false;
    if(type!=="all"&&partner.partner_type!==type) return false;
    if(!query) return true;
    return [partner.name,partner.contact_name,partner.email,partner.phone]
      .filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(query);
  });

  const partnerMap=new Map((partners||[]).map((p)=>[p.id,p]));
  const active=(partners||[]).filter((p)=>p.status==="active").length;
  const prospectRows=(partners||[]).filter((p)=>["prospect","contacted"].includes(p.status));
  const prospects=prospectRows.length;
  const pledged=(commitments||[]).filter((c)=>c.contribution_type!=="in_kind"&&c.status!=="cancelled").reduce((sum,c)=>sum+Number(c.pledged_amount||0),0);
  const received=(commitments||[]).filter((c)=>c.contribution_type!=="in_kind"&&c.status!=="cancelled").reduce((sum,c)=>sum+Number(c.received_amount||0),0);
  const openCommitments=(commitments||[]).filter((c)=>["pledged","partial"].includes(c.status));

  const partnerForm=<form action={createPartner} className="form-stack">
    <p className="form-section">Organisation</p>
    <label>Nom / organisation<input name="name" required/></label>
    <div className="form-two"><label>Type<select name="partner_type" defaultValue="institution">{Object.entries(typeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Statut<select name="status" defaultValue="prospect">{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
    <p className="form-section">Contact</p>
    <label>Personne de contact<input name="contact_name"/></label>
    <div className="form-two"><label>Email<input type="email" name="email"/></label><label>Téléphone<input name="phone"/></label></div>
    <div className="form-two"><label>Adresse<input name="address"/></label><label>Site web<input name="website" placeholder="https://…"/></label></div>
    <label>Notes<textarea name="notes" rows={3}/></label>
    <p className="form-hint">Prospect : identifié · Contacté : échange en cours · Actif : soutien confirmé · Inactif : relation terminée.</p>
    <button className="button primary">Ajouter</button>
  </form>;
  const partnerSheet=(variant:"primary"|"secondary"="primary")=><Sheet label="Nouveau partenaire" title="Ajouter un partenaire" description="Les engagements et encaissements se saisissent depuis le dossier." icon="users" variant={variant}>{partnerForm}</Sheet>;

  const partnerRow=(partner:any)=>{
    const list=(commitments||[]).filter((c)=>c.partner_id===partner.id&&c.status!=="cancelled");
    const pPledged=list.reduce((sum,c)=>sum+Number(c.pledged_amount||0),0);
    const pReceived=list.reduce((sum,c)=>sum+Number(c.received_amount||0),0);
    const pct=pPledged>0?Math.min(100,Math.round(pReceived/pPledged*100)):0;
    return <Link className="list-row stack-sm" href={"/partners/"+partner.id}>
      <span className="row-icon">{initials(partner.name)}</span>
      <div><b>{partner.name}</b><small>{typeLabels[partner.partner_type]||partner.partner_type} · {partner.contact_name||"aucun contact principal"}{partner.phone?" · "+partner.phone:""}</small></div>
      <div className="row-end">
        {pPledged>0&&<><span>{money(pReceived)} / {money(pPledged)}</span><span className="progress-mini"><i style={{width:pct+"%"}}/></span></>}
        <span className={"badge"+(partnerClass[partner.status]||"")}>{statusLabels[partner.status]||partner.status}</span>
      </div>
    </Link>;
  };

  const partnerView=<FilterList
    placeholder="Nom, contact, email, téléphone…"
    filters={[
      {key:"status",label:"Statut",options:Object.entries(statusLabels).map(([value,label])=>({value,label}))},
      {key:"type",label:"Type",mode:"select",options:Object.entries(typeLabels).map(([value,label])=>({value,label}))},
    ]}
    empty={<div className="panel empty-state">{(partners||[]).length?<p>Aucun partenaire ne correspond aux filtres. <Link href="/partners">Réinitialiser</Link></p>:<><p>Aucun partenaire enregistré.</p>{partnerSheet()}</>}</div>}
    items={rows.map((partner)=>({
      id:partner.id,
      text:[partner.name,partner.contact_name,partner.email,partner.phone].filter(Boolean).join(" "),
      facets:{status:partner.status,type:partner.partner_type},
      node:partnerRow(partner),
    }))}
  />;

  const commitmentView=<FilterList
    placeholder="Engagement, partenaire…"
    filters={[
      {key:"status",label:"Statut",options:Object.entries(commitmentStatus).map(([value,label])=>({value,label}))},
      {key:"type",label:"Nature",mode:"select",options:Object.entries(contributionLabel).map(([value,label])=>({value,label}))},
    ]}
    empty={<div className="panel empty-state">Aucun engagement. Ils se saisissent depuis le dossier d’un partenaire.</div>}
    items={(commitments||[]).map((c)=>{
      const partner=partnerMap.get(c.partner_id);
      const pct=Number(c.pledged_amount)>0?Math.min(100,Math.round(Number(c.received_amount)/Number(c.pledged_amount)*100)):0;
      return {
        id:c.id,
        text:[c.title,partner?.name,contributionLabel[c.contribution_type]].filter(Boolean).join(" "),
        facets:{status:c.status,type:c.contribution_type},
        node:<Link className="list-row stack-sm" href={"/partners/"+c.partner_id}>
          <span className="row-icon"><UiIcon name="heart"/></span>
          <div><b>{c.title}</b><small>{partner?.name||"Partenaire"} · {contributionLabel[c.contribution_type]||c.contribution_type}{c.pledged_on?" · "+new Date(c.pledged_on+"T12:00:00").toLocaleDateString("fr-FR"):""}{c.due_on?" · échéance "+new Date(c.due_on+"T12:00:00").toLocaleDateString("fr-FR"):""}</small></div>
          <div className="row-end">
            {c.contribution_type!=="in_kind"&&<><span>{money(Number(c.received_amount||0))} / {money(Number(c.pledged_amount||0))}</span><span className="progress-mini"><i style={{width:pct+"%"}}/></span></>}
            <span className={"badge"+(c.status==="received"?" ok":c.status==="partial"?" pinned":"")}>{commitmentStatus[c.status]||c.status}</span>
          </div>
        </Link>,
      };
    })}
  />;

  const prospectView=prospectRows.length
    ? <div className="panel list-card">{prospectRows.map((partner)=><Fragment key={partner.id}>{partnerRow(partner)}</Fragment>)}</div>
    : <div className="panel empty-state"><p>Aucun prospect à suivre.</p>{partnerSheet()}</div>;

  return <section className="page manage-page">
    <header className="page-header">
      <div><h1>Partenaires</h1><p>{partners?.length||0} partenaire(s), {openCommitments.length} engagement(s) en attente d’encaissement.</p></div>
      <div className="header-actions"><a className="button secondary" href="/api/exports/partners?format=csv"><UiIcon name="download"/>Exporter</a>{partnerSheet()}</div>
    </header>

    <div className="stat-grid manage-stats">
      <article><a className="stat-link" href="#partenaires"><small>Partenaires actifs</small><strong>{active}</strong><span>relations en cours</span></a></article>
      <article><a className="stat-link" href="#prospects"><small>Prospects / contacts</small><strong>{prospects}</strong><span>à suivre</span></a></article>
      <article><a className="stat-link" href="#engagements"><small>Engagements monétaires</small><strong>{money(pledged)}</strong><span>hors apports en nature</span></a></article>
      <article><a className="stat-link" href="#engagements"><small>Reçu</small><strong>{money(received)}</strong><span>{pledged?Math.round(received/pledged*100):0} % des engagements</span></a></article>
    </div>

    <Tabs tabs={[
      {id:"partenaires",label:"Partenaires",count:partners?.length||0,content:partnerView},
      {id:"engagements",label:"Engagements",count:openCommitments.length,content:commitmentView},
      {id:"prospects",label:"Prospects",count:prospects,content:prospectView},
    ]}/>
  </section>;
}
