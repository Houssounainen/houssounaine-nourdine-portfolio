import Image from "next/image";
import Link from "next/link";
import { MembershipApplicationForm } from "@/components/membership-application-form";
import { PublicFooter } from "@/components/public-footer";

export default function JoinPage(){
  return <main id="contenu" className="public-flow-page">
    <section className="public-flow-shell">
      <header className="public-flow-header">
        <Link href="/" className="brand-mini"><Image src="/aedbvt-logo.webp" alt="" width={52} height={52}/><b>AEDBVT</b></Link>
        <Link href="/application-status">Déjà candidat ? Suivre mon dossier →</Link>
      </header>

      <div className="public-flow-intro">
        <span className="eyebrow">Adhésion</span>
        <h1>Rejoindre l’AEDBVT</h1>
        <p>Déposez votre candidature pour rejoindre l’Association des Étudiants de Darsalama et Bandrani-Vouani à Tuléar. L’envoi de ce formulaire ne crée pas automatiquement une adhésion : le dossier doit d’abord être examiné par l’association.</p>
      </div>

      <div className="application-layout">
        <article className="panel application-info">
          <span className="eyebrow">Parcours</span>
          <h2>Comment ça fonctionne ?</h2>
          <div><strong>1</strong><span><b>Vous déposez votre candidature</b><small>Identité, contact et informations d’études.</small></span></div>
          <div><strong>2</strong><span><b>Le Bureau examine le dossier</b><small>Vous pouvez suivre l’état avec votre référence privée.</small></span></div>
          <div><strong>3</strong><span><b>Une fiche membre est créée si elle est approuvée</b><small>L’invitation au compte sécurisé intervient ensuite.</small></span></div>
          <div className="notice">Aucun paiement n’est demandé dans ce formulaire public.</div>
        </article>

        <article className="panel"><MembershipApplicationForm/></article>
      </div>
    </section>
    <PublicFooter/>
  </main>;
}
