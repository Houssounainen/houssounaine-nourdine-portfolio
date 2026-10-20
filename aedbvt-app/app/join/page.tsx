import Image from "next/image";
import Link from "next/link";
import { MembershipApplicationForm } from "@/components/membership-application-form";
import { PublicFooter } from "@/components/public-footer";
import { UiIcon } from "@/components/ui-icon";

const steps=[
  {icon:"send",tone:"var(--accent)",title:"Envoi de la demande",text:"Identité, coordonnées, études et mot de passe."},
  {icon:"users",tone:"var(--orange)",title:"Examen par le Bureau",text:"Le compte reste inactif pendant l’examen."},
  {icon:"check",tone:"var(--ok)",title:"Ouverture de l’accès",text:"Connexion avec l’email et le mot de passe choisis."},
];

export default function JoinPage(){
  return <main id="contenu" className="public-flow-page pub-join-page">
    <section className="public-flow-shell">
      <header className="public-flow-header">
        <Link href="/" className="brand-mini"><Image src="/aedbvt-logo.webp" alt="" width={36} height={36}/><b>AEDBVT</b></Link>
        <Link href="/application-status">Suivre une demande</Link>
      </header>

      <div className="public-flow-intro pub-join-hero">
        <span className="pub-chip"><UiIcon name="user"/>Adhésion</span>
        <h1>Demande d’adhésion</h1>
        <p>Remplissez le formulaire et choisissez le mot de passe de votre futur compte. Le compte reste inactif jusqu’à l’approbation du Bureau.</p>
      </div>

      <div className="application-layout">
        <article className="panel application-info">
          <h2>Déroulement</h2>
          {steps.map((step,index)=><div key={step.title}><strong style={{"--tile":step.tone} as React.CSSProperties}>{index+1}</strong><span><b>{step.title}</b><small>{step.text}</small></span></div>)}
          <p className="muted pub-join-free"><UiIcon name="wallet"/>Aucun paiement n’est demandé à cette étape.</p>
        </article>

        <article className="panel pub-join-form"><MembershipApplicationForm/></article>
      </div>
    </section>
    <PublicFooter/>
  </main>;
}
