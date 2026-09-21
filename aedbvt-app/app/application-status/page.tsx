import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const labels:Record<string,string>={
  pending:"Reçue",
  in_review:"En cours d’examen",
  approved:"Approuvée",
  rejected:"Non retenue",
  withdrawn:"Retirée",
};

export default async function ApplicationStatusPage({
  searchParams,
}:{searchParams:Promise<{reference?:string;token?:string}>}){
  const params=await searchParams;
  const reference=(params.reference||"").trim().toUpperCase();
  const token=(params.token||"").trim();

  let result:any=null;
  let searched=false;
  if(reference&&token){
    searched=true;
    const supabase=await createClient();
    const {data}=await supabase.rpc("get_membership_application_status",{
      p_reference:reference,
      p_public_token:token,
    });
    result=data?.[0]||null;
  }

  return <main id="contenu" className="public-flow-page">
    <section className="public-flow-shell narrow">
      <header className="public-flow-header">
        <Link href="/" className="brand-mini"><Image src="/aedbvt-logo.webp" alt="" width={52} height={52}/><b>AEDBVT</b></Link>
        <Link href="/join">Déposer une candidature →</Link>
      </header>

      <div className="public-flow-intro">
        <span className="eyebrow">Suivi privé</span><h1>Ma candidature</h1>
        <p>Utilisez la référence et le code de suivi reçus lors du dépôt. Ces deux éléments sont nécessaires pour afficher l’état du dossier.</p>
      </div>

      <form className="panel application-status-form" method="get">
        <label>Référence<input name="reference" defaultValue={reference} placeholder="APP-2026-0001" required/></label>
        <label>Code de suivi<input name="token" defaultValue={token} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required/></label>
        <button className="button primary">Consulter</button>
      </form>

      {searched&&!result&&<div className="error-box application-status-result">Aucune candidature ne correspond à cette référence et ce code de suivi.</div>}

      {result&&<article className="panel application-status-result">
        <div className="application-status-head"><span><small>{result.reference}</small><h2>{result.full_name}</h2></span><span className={"badge application-"+result.status}>{labels[result.status]||result.status}</span></div>
        <div className="application-timeline">
          <div className="done"><i>1</i><span><b>Candidature reçue</b><small>{new Date(result.submitted_at).toLocaleString("fr-FR")}</small></span></div>
          <div className={["in_review","approved","rejected"].includes(result.status)?"done":""}><i>2</i><span><b>Examen par l’association</b><small>{result.status==="pending"?"En attente de prise en charge":"Dossier pris en charge"}</small></span></div>
          <div className={["approved","rejected"].includes(result.status)?"done":""}><i>3</i><span><b>Décision</b><small>{result.reviewed_at?new Date(result.reviewed_at).toLocaleString("fr-FR"):"En attente"}</small></span></div>
        </div>
        {result.decision_note&&<div className="notice"><b>Message de l’association</b><br/>{result.decision_note}</div>}
        {result.status==="approved"&&<div className="application-approved"><b>Adhésion approuvée</b><p>Votre fiche membre a été créée{result.member_number?" sous le numéro "+result.member_number:""}. L’administration pourra ensuite vous envoyer votre invitation au compte sécurisé AEDBVT.</p></div>}
      </article>}
    </section>
  </main>;
}
