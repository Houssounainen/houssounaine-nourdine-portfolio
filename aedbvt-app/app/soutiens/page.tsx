import { createClient } from "@/lib/supabase/server";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

const labels:Record<string,string>={donor:"Donateur",sponsor:"Sponsor",institution:"Institution",business:"Entreprise",ngo:"ONG / association",other:"Partenaire"};

export const dynamic="force-dynamic";

export default async function PublicPartnersPage(){
  const supabase=await createClient();
  const {data:partners}=await supabase.rpc("get_public_partners");
  return <main id="contenu">
    <PublicNav/>
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Soutiens</span><h1>Partenaires</h1><p className="lead">Les organisations que l’AEDBVT a choisi de présenter publiquement.</p></div><span className="status-pill">{partners?.length||0} partenaire(s)</span></header>
      <div className="governance-grid">
        {(partners||[]).map((partner:any)=><article className="panel gov-card" key={partner.id}><span className="eyebrow">{labels[partner.partner_type]||"Partenaire"}</span><h2>{partner.name}</h2>{partner.public_description&&<p>{partner.public_description}</p>}{partner.website&&<a className="button secondary" href={partner.website} target="_blank" rel="noreferrer">Site web ↗</a>}</article>)}
        {!partners?.length&&<div className="panel empty-state">Aucun partenaire n’est actuellement affiché publiquement.</div>}
      </div>
    </section>
    <PublicFooter/>
  </main>;
}
