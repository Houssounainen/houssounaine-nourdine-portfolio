import Image from "next/image";
import Link from "next/link";
import { login } from "./actions";
import { PublicFooter } from "@/components/public-footer";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; password?: string; verified?: string }> }) {
  const query = await searchParams;
  return (
    <main id="contenu" className="signin">
      <div className="signin-main">
        <section className="signin-card">
          <Link href="/" aria-label="Retour à l’accueil"><Image src="/aedbvt-logo.webp" alt="" width={40} height={40}/></Link>
          <h1>Connexion</h1>
          <p>Espace membre de l’AEDBVT.</p>
          {query.password==="updated"&&<div className="success-box">Mot de passe enregistré. Vous pouvez vous connecter.</div>}
          {query.verified==="1"&&<div className="success-box">Adresse email confirmée. L’accès sera ouvert après l’approbation de votre demande.</div>}
          {query.error==="config"?<div className="error-box" role="alert">La connexion est momentanément indisponible. Réessayez plus tard.</div>:query.error==="pending"?<div className="notice" role="status">Votre demande d’adhésion n’a pas encore été approuvée. <Link href="/application-status">Suivre la demande</Link></div>:query.error&&<div className="error-box" role="alert">Email ou mot de passe incorrect.</div>}
          <form action={login} className="form-stack">
            <label htmlFor="login-email">Email<input id="login-email" required name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false}/></label>
            <div className="password-label" style={{display:"grid",gap:6}}>
              <div className="signin-row"><label htmlFor="login-password" style={{fontSize:13,fontWeight:500}}>Mot de passe</label><Link href="/forgot-password">Mot de passe oublié ?</Link></div>
              <PasswordInput id="login-password" required name="password" autoComplete="current-password"/>
            </div>
            <SubmitButton>Se connecter</SubmitButton>
          </form>
          <p className="signin-foot">Pas encore membre ? <Link href="/join">Demander l’adhésion</Link>. L’accès est ouvert après validation par le Bureau, avec le mot de passe choisi lors de la demande.</p>
        </section>
      </div>
      <PublicFooter/>
    </main>
  );
}
