import Image from "next/image";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}:{searchParams:Promise<{sent?:string;error?:string}>}){
  const params=await searchParams;
  const sent=params.sent==="1";

  return <main id="contenu" className="auth-page">
    <section className="auth-card">
      <Link href="/" className="brand-mini"><Image src="/aedbvt-logo.webp" alt="" width={48} height={48}/><b>AEDBVT</b></Link>
      <span className="eyebrow">Récupération du compte</span>
      <h1>Mot de passe oublié</h1>
      {sent
        ?<><div className="success-box">Si un compte correspond à cette adresse, un email de récupération a été envoyé.</div><p>Ouvrez le lien reçu depuis le même navigateur puis choisissez un nouveau mot de passe.</p></>
        :<><p>Entrez l’adresse email associée à votre compte AEDBVT. Pour protéger la confidentialité des membres, la réponse ne confirme jamais si une adresse existe.</p>
          {params.error&&<div className="error-box">La demande n’a pas pu être envoyée. Réessayez plus tard ou contactez l’administration.</div>}
          <form action={requestPasswordReset} className="form-stack">
            <label>Email<input name="email" type="email" autoComplete="email" required/></label>
            <button className="button primary">Envoyer le lien de récupération</button>
          </form></>}
      <div className="auth-join-links"><Link href="/login">← Retour à la connexion</Link><Link href="/support">Besoin d’aide ?</Link></div>
    </section>
  </main>;
}
