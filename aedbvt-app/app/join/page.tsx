import Image from "next/image";
import Link from "next/link";
import { MembershipApplicationForm } from "@/components/membership-application-form";
import { PublicFooter } from "@/components/public-footer";

export default function JoinPage(){
  return <main id="contenu" className="public-flow-page">
    <section className="public-flow-shell">
      <header className="public-flow-header">
        <Link href="/" className="brand-mini"><Image src="/aedbvt-logo.webp" alt="" width={28} height={28}/><b>AEDBVT</b></Link>
        <Link href="/application-status">Suivre une demande</Link>
      </header>

      <div className="public-flow-intro">
        <h1>Demande d’adhésion</h1>
        <p>Remplissez le formulaire et choisissez le mot de passe de votre futur compte. Le compte reste inactif jusqu’à l’approbation du Bureau.</p>
      </div>

      <div className="application-layout">
        <article className="panel application-info">
          <h2>Déroulement</h2>
          <div><strong>1</strong><span><b>Envoi de la demande</b><small>Identité, coordonnées, études et mot de passe.</small></span></div>
          <div><strong>2</strong><span><b>Examen par le Bureau</b><small>Le compte reste inactif pendant l’examen.</small></span></div>
          <div><strong>3</strong><span><b>Ouverture de l’accès</b><small>Connexion avec l’email et le mot de passe choisis.</small></span></div>
          <p className="muted" style={{margin:"12px 0 0"}}>Aucun paiement n’est demandé à cette étape.</p>
        </article>

        <article className="panel"><MembershipApplicationForm/></article>
      </div>
    </section>
    <PublicFooter/>
  </main>;
}
