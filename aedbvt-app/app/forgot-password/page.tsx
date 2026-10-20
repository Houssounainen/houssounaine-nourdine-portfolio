import Link from "next/link";
import { requestPasswordReset } from "./actions";
import { AuthShell } from "@/components/auth-shell";
import { UiIcon } from "@/components/ui-icon";

export default async function ForgotPasswordPage({
  searchParams,
}:{searchParams:Promise<{sent?:string;error?:string}>}){
  const params=await searchParams;
  const sent=params.sent==="1";

  return <AuthShell tone="sunset" eyebrow="Récupération du compte" title="Mot de passe oublié"
    points={[
      {icon:"send",title:"Lien par email",text:"Un lien de récupération est envoyé à l’adresse du compte."},
      {icon:"lock",title:"Nouveau mot de passe",text:"Au moins 10 caractères, choisi depuis le lien reçu."},
      {icon:"shield",title:"Confidentialité",text:"La réponse ne confirme jamais si une adresse existe."},
    ]}
    foot={<div className="auth-x-foot auth-join-links"><Link href="/login">← Retour à la connexion</Link><Link href="/support">Besoin d’aide ?</Link></div>}>
    {sent
      ?<div className="auth-x-sent"><span className="icon-tile lg solid" style={{"--tile":"var(--ok)"} as React.CSSProperties}><UiIcon name="send"/></span><div className="success-box">Si un compte correspond à cette adresse, un email de récupération a été envoyé.</div><p>Ouvrez le lien reçu depuis le même navigateur puis choisissez un nouveau mot de passe.</p></div>
      :<><p className="auth-x-intro">Entrez l’adresse email associée à votre compte AEDBVT. Pour protéger la confidentialité des membres, la réponse ne confirme jamais si une adresse existe.</p>
        {params.error&&<div className="error-box">La demande n’a pas pu être envoyée. Réessayez plus tard ou contactez l’administration.</div>}
        <form action={requestPasswordReset} className="form-stack auth-x-form">
          <label>Email<input name="email" type="email" autoComplete="email" required/></label>
          <button className="button primary">Envoyer le lien de récupération</button>
        </form></>}
  </AuthShell>;
}
