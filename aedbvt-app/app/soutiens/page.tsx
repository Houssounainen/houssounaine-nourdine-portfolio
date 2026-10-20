import { createClient } from "@/lib/supabase/server";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { UiIcon } from "@/components/ui-icon";
import { Avatar } from "@/components/avatar";

const labels:Record<string,string>={donor:"Donateur",sponsor:"Sponsor",institution:"Institution",business:"Entreprise",ngo:"ONG / association",other:"Partenaire"};

export const dynamic="force-dynamic";

export default async function PublicPartnersPage(){
  const supabase=await createClient();
  const {data:partners}=await supabase.rpc("get_public_partners");
  return <main id="contenu">
    <PublicNav/>
    <header className="pub-banner tone-teal">
      <span className="pub-chip"><UiIcon name="heart"/>Soutiens</span>
      <h1>Partenaires</h1>
      <p>Les organisations que l’AEDBVT a choisi de présenter publiquement.</p>
      <span className="pub-count">{partners?.length||0} partenaire(s)</span>
    </header>
    <section className="pub-page">
      <div className="pub-grid">
        {(partners||[]).map((partner:any)=><article className="pub-card" key={partner.id}><div className="pub-card-head"><Avatar name={partner.name} size={48}/><span><small className="pub-kicker">{labels[partner.partner_type]||"Partenaire"}</small><h2>{partner.name}</h2></span></div>{partner.public_description&&<p>{partner.public_description}</p>}{partner.website&&<a className="button secondary" href={partner.website} target="_blank" rel="noreferrer">Site web <UiIcon name="external"/></a>}</article>)}
        {!partners?.length&&<div className="pub-empty"><span className="icon-tile lg" style={{"--tile":"var(--teal)"} as React.CSSProperties}><UiIcon name="heart"/></span><p>Aucun partenaire n’est actuellement affiché publiquement.</p></div>}
      </div>
    </section>
    <PublicFooter/>
  </main>;
}
