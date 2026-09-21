"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { submitMembershipApplication, type MembershipApplicationState } from "@/app/join/actions";

const initialState:MembershipApplicationState={ok:false};

export function MembershipApplicationForm(){
  const [state,action,pending]=useActionState(submitMembershipApplication,initialState);
  const [startedAt]=useState(()=>Date.now());
  const trackingHref=useMemo(()=>{
    if(!state.reference||!state.token) return "";
    return "/application-status?reference="+encodeURIComponent(state.reference)+"&token="+encodeURIComponent(state.token);
  },[state.reference,state.token]);

  if(state.ok&&state.reference&&state.token){
    return <article className="application-success">
      <span className="application-success-mark" aria-hidden="true">✓</span>
      <span className="eyebrow">Candidature enregistrée</span>
      <h2>Votre demande et votre accès sont préparés</h2>
      <p>Votre dossier a été transmis à l’AEDBVT. Votre mot de passe est enregistré uniquement dans le système sécurisé d’authentification et votre compte restera bloqué jusqu’à l’approbation de votre candidature.</p>
      <div className="application-reference"><small>Référence</small><strong>{state.reference}</strong></div>
      <div className="application-success-actions">
        <Link className="button primary" href={trackingHref}>Suivre ma candidature</Link>
        <Link className="button secondary" href="/">Retour à l’accueil</Link>
      </div>
      <div className="notice">Conservez votre référence et votre lien de suivi. Si vous recevez un email de confirmation, validez votre adresse. Après approbation, vous pourrez vous connecter avec l’email et le mot de passe choisis ici.</div>
    </article>;
  }

  return <form action={action} className="membership-application-form">
    <input type="hidden" name="started_at" value={startedAt}/>
    <label className="application-honeypot" aria-hidden="true">Site web<input name="website" tabIndex={-1} autoComplete="off"/></label>

    <div className="form-section">
      <span className="eyebrow">Identité</span>
      <div className="form-two">
        <label>Nom complet<input name="full_name" maxLength={120} required autoComplete="name"/></label>
        <label>Village<select name="village" required defaultValue=""><option value="" disabled>Choisir…</option><option>Darsalama</option><option>Bandrani-Vouani</option></select></label>
      </div>
      <div className="form-two">
        <label>Téléphone<input name="phone" maxLength={40} required autoComplete="tel"/></label>
        <label>Email<input name="email" type="email" maxLength={180} required autoComplete="email"/></label>
      </div>
    </div>

    <div className="form-section">
      <span className="eyebrow">Études à Tuléar</span>
      <div className="form-two">
        <label>Filière / formation<input name="program" maxLength={120}/></label>
        <label>Niveau<input name="study_level" maxLength={80} placeholder="Licence 2, Master 1…"/></label>
      </div>
    </div>

    <div className="form-section">
      <span className="eyebrow">Mon futur compte AEDBVT</span>
      <p className="muted">Choisissez maintenant vos identifiants. Ils ne donneront accès à l’espace membre qu’après approbation de votre demande.</p>
      <div className="form-two">
        <label>Mot de passe<input name="password" type="password" minLength={10} required autoComplete="new-password"/></label>
        <label>Confirmer le mot de passe<input name="confirm_password" type="password" minLength={10} required autoComplete="new-password"/></label>
      </div>
      <small className="muted">Minimum 10 caractères. Le mot de passe n’est jamais enregistré dans le dossier de candidature.</small>
    </div>

    <div className="form-section">
      <span className="eyebrow">Candidature</span>
      <label>Pourquoi souhaitez-vous rejoindre l’AEDBVT ?<textarea name="motivation" rows={5} maxLength={1200}/></label>
      <label className="application-consent"><input type="checkbox" name="consent" required/><span>J’autorise l’AEDBVT à utiliser les informations fournies pour l’étude de ma demande et, si elle est acceptée, pour créer ma fiche membre et activer mon compte sécurisé.</span></label>
    </div>

    {state.error&&<div className="error-box" role="alert">{state.error}</div>}
    <button className="button primary application-submit" type="submit" disabled={pending}>{pending?"Création sécurisée en cours…":"Envoyer ma candidature"}</button>
  </form>;
}
