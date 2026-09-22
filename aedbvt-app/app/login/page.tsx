import Image from "next/image";
import Link from "next/link";
import { login } from "./actions";
import { PublicFooter } from "@/components/public-footer";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { UiIcon } from "@/components/ui-icon";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; password?: string; verified?: string }> }) {
  const query = await searchParams;
  return (
    <main id="contenu" className="auth-page modern-login">
      <div className="login-layout">
      <aside className="login-story">
        <Link href="/" className="brand-mini"><Image src="/aedbvt-logo.webp" alt="" width={52} height={52}/><span><b>AEDBVT</b><small>Notre communauté à Tuléar</small></span></Link>
        <div className="login-story-copy"><span className="eyebrow">Votre association, partout avec vous</span><h2>Un même lien.<br/><em>Mille façons<br/>d’avancer.</em></h2><p>Retrouvez vos rendez-vous, vos documents et toute la vie de l’association dans votre espace personnel.</p><div className="login-story-values"><span><UiIcon name="calendar"/> Participer</span><span><UiIcon name="users"/> Se retrouver</span><span><UiIcon name="heart"/> S’engager</span></div></div>
        <Link className="login-back" href="/">Retour à l’accueil <UiIcon name="arrow"/></Link>
      </aside>
      <section className="auth-card">
        <span className="login-lock"><UiIcon name="shield"/></span>
        <span className="eyebrow">Espace membre</span>
        <h1>Heureux de vous retrouver.</h1>
        <p>Connectez-vous pour suivre votre vie associative.</p>
        {query.password==="updated"&&<div className="success-box">Mot de passe enregistré. Vous pouvez maintenant vous connecter.</div>}
        {query.verified==="1"&&<div className="success-box">Adresse email validée. Votre accès sera disponible dès l’approbation de votre candidature.</div>}
        {query.error==="config"?<div className="error-box" role="alert">La connexion sécurisée est en cours de configuration. Réessayez après l’activation du service.</div>:query.error==="pending"?<div className="notice" role="status">Votre compte est bien enregistré, mais votre candidature n’a pas encore été approuvée. Vous pouvez suivre votre dossier depuis la page de suivi.</div>:query.error&&<div className="error-box" role="alert">Email ou mot de passe incorrect.</div>}
        <form action={login} className="form-stack">
          <label htmlFor="login-email">Adresse email<input id="login-email" required name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" autoCapitalize="none" spellCheck={false}/></label>
          <div className="password-label"><label htmlFor="login-password">Mot de passe</label><PasswordInput id="login-password" required name="password" autoComplete="current-password"/></div>
          <Link className="auth-forgot-link" href="/forgot-password">Mot de passe oublié ?</Link>
          <SubmitButton>Se connecter</SubmitButton>
        </form>
        <div className="auth-join-links"><span>Pas encore membre ?</span><Link href="/join">Déposer une candidature</Link><Link href="/application-status">Suivre mon dossier</Link></div>
        <p className="login-note"><UiIcon name="shield"/> Vous avez candidaté ? Votre accès s’ouvre après l’approbation du Bureau, avec le mot de passe choisi lors de votre demande.</p>
      </section>
      </div>
      <PublicFooter/>
    </main>
  );
}
