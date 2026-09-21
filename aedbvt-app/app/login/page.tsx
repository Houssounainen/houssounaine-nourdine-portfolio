import Image from "next/image";
import Link from "next/link";
import { login } from "./actions";
import { PublicFooter } from "@/components/public-footer";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; password?: string }> }) {
  const query = await searchParams;
  return (
    <main id="contenu" className="auth-page">
      <section className="auth-card">
        <Link href="/" className="brand-mini"><Image src="/aedbvt-logo.webp" alt="" width={48} height={48} /><b>AEDBVT</b></Link>
        <span className="eyebrow">Espace sécurisé</span>
        <h1>Connexion</h1>
        <p>Les comptes sont créés ou invités par l’administration. L’inscription publique est désactivée pendant la phase de lancement.</p>
        {query.password==="updated"&&<div className="success-box">Mot de passe enregistré. Vous pouvez maintenant vous connecter.</div>}
        {query.error && <div className="error-box" role="alert">Email ou mot de passe incorrect.</div>}
        <form action={login} className="form-stack">
          <label>Email<input required name="email" type="email" autoComplete="email" /></label>
          <label>Mot de passe<input required name="password" type="password" autoComplete="current-password" /></label>
          <Link className="auth-forgot-link" href="/forgot-password">Mot de passe oublié ?</Link>
          <button className="button primary" type="submit">Se connecter</button>
        </form>
        <div className="auth-join-links"><span>Pas encore membre ?</span><Link href="/join">Déposer une candidature</Link><Link href="/application-status">Suivre mon dossier</Link></div>
      </section>
      <PublicFooter/>
    </main>
  );
}
