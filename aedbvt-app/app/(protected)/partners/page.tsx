import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { createPartner } from "./actions";

const typeLabels:Record<string,string>={donor:"Donateur",sponsor:"Sponsor",institution:"Institution",business:"Entreprise",ngo:"ONG / association",other:"Autre"};
const statusLabels:Record<string,string>={prospect:"Prospect",contacted:"Contacté",active:"Actif",inactive:"Inactif"};

export default async function PartnersPage({
  searchParams,
}:{searchParams:Promise<{q?:string;status?:string;type?:string}>}){
  const filters=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:partners},{data:commitments}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("partners").select("id,name,partner_type,status,contact_name,email,phone,created_at").order("name"),
    supabase.from("partner_commitments").select("id,partner_id,pledged_amount,received_amount,status,contribution_type"),
  ]);
  if(!can(profile?.role,"partners_manage")) notFound();

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

  const active=(partners||[]).filter((p)=>p.status==="active").length;
  const prospects=(partners||[]).filter((p)=>["prospect","contacted"].includes(p.status)).length;
  const pledged=(commitments||[]).filter((c)=>c.contribution_type!=="in_kind"&&c.status!=="cancelled").reduce((sum,c)=>sum+Number(c.pledged_amount||0),0);
  const received=(commitments||[]).filter((c)=>c.contribution_type!=="in_kind"&&c.status!=="cancelled").reduce((sum,c)=>sum+Number(c.received_amount||0),0);

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Relations extérieures</span><h1>Partenaires & soutiens</h1></div><span className="status-pill">{partners?.length||0} partenaire(s)</span></header>

    <div className="stat-grid">
      <article><small>Partenaires actifs</small><strong>{active}</strong><span>relations en cours</span></article>
      <article><small>Prospects / contacts</small><strong>{prospects}</strong><span>à suivre</span></article>
      <article><small>Engagements monétaires</small><strong>{pledged.toLocaleString("fr-FR")} Ar</strong><span>hors apports en nature</span></article>
      <article><small>Reçu</small><strong>{received.toLocaleString("fr-FR")} Ar</strong><span>{pledged?Math.round(received/pledged*100):0}% des engagements</span></article>
    </div>

    <div className="content-grid partner-top-grid">
      <form action={createPartner} className="panel form-stack">
        <div><span className="eyebrow">Nouveau contact</span><h2>Ajouter un partenaire</h2></div>
        <label>Nom / organisation<input name="name" required/></label>
        <div className="form-two"><label>Type<select name="partner_type" defaultValue="institution">{Object.entries(typeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Statut<select name="status" defaultValue="prospect">{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
        <label>Personne de contact<input name="contact_name"/></label>
        <div className="form-two"><label>Email<input type="email" name="email"/></label><label>Téléphone<input name="phone"/></label></div>
        <label>Adresse<input name="address"/></label>
        <label>Site web<input name="website" placeholder="https://…"/></label>
        <label>Notes<textarea name="notes" rows={3}/></label>
        <button className="button primary">Ajouter</button>
      </form>

      <article className="panel partner-guidance">
        <span className="eyebrow">Suivi</span><h2>Cycle relationnel</h2>
        <div><b>1. Prospect</b><small>Organisation identifiée, pas encore contactée.</small></div>
        <div><b>2. Contacté</b><small>Échange ou proposition en cours.</small></div>
        <div><b>3. Actif</b><small>Partenariat, don, sponsoring ou soutien confirmé.</small></div>
        <div><b>4. Inactif</b><small>Relation terminée, historique conservé.</small></div>
      </article>
    </div>

    <form className="panel request-filter-bar" method="get">
      <label className="request-filter-search"><span className="sr-only">Rechercher</span><input name="q" defaultValue={filters.q||""} placeholder="Nom, contact, email, téléphone…"/></label>
      <label><span className="sr-only">Statut</span><select name="status" defaultValue={status}><option value="all">Tous les statuts</option>{Object.entries(statusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <label><span className="sr-only">Type</span><select name="type" defaultValue={type}><option value="all">Tous les types</option>{Object.entries(typeLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <button className="button secondary">Filtrer</button>
      <span className="directory-count">{rows.length} / {partners?.length||0}</span>
    </form>

    <div className="partner-grid">
      {rows.map((partner)=>{
        const partnerCommitments=(commitments||[]).filter((c)=>c.partner_id===partner.id&&c.status!=="cancelled");
        const pPledged=partnerCommitments.reduce((sum,c)=>sum+Number(c.pledged_amount||0),0);
        const pReceived=partnerCommitments.reduce((sum,c)=>sum+Number(c.received_amount||0),0);
        return <Link className="panel partner-card" href={"/partners/"+partner.id} key={partner.id}>
          <div className="partner-card-head"><span><b>{partner.name}</b><small>{typeLabels[partner.partner_type]||partner.partner_type}</small></span><span className={"badge partner-"+partner.status}>{statusLabels[partner.status]||partner.status}</span></div>
          <p>{partner.contact_name||"Aucun contact principal"}{partner.phone?" · "+partner.phone:""}</p>
          <div className="partner-card-money"><span><small>Engagé</small><b>{pPledged.toLocaleString("fr-FR")} Ar</b></span><span><small>Reçu</small><b>{pReceived.toLocaleString("fr-FR")} Ar</b></span></div>
          <span className="partner-open">Ouvrir le dossier →</span>
        </Link>;
      })}
      {!rows.length&&<div className="panel empty-state">Aucun partenaire ne correspond aux filtres.</div>}
    </div>
  </section>;
}
