import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "./actions";
import { AuthShell } from "@/components/auth-shell";

const errors:Record<string,string>={
  length:"Le mot de passe doit contenir au moins 10 caractères.",
  match:"Les deux mots de passe ne correspondent pas.",
  update:"Le mot de passe n’a pas pu être modifié. Le lien peut avoir expiré.",
};

export default async function UpdatePasswordPage({
  searchParams,
}:{searchParams:Promise<{error?:string;mode?:string}>}){
  const params=await searchParams;
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
    redirect("/forgot-password?error=config");
  }
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/forgot-password?error=link");

  const invite=params.mode==="invite";

  return <AuthShell tone="teal" eyebrow={invite?"Activation du compte":"Sécurité du compte"} title={invite?"Créer mon mot de passe":"Nouveau mot de passe"}
    points={[
      {icon:"lock",title:"10 caractères minimum",text:"Mélangez lettres, chiffres et symboles."},
      {icon:"shield",title:"Session renouvelée",text:"Vous serez invité à vous reconnecter."},
      {icon:"user",title:"Votre espace",text:"Carte de membre, cotisations, communauté."},
    ]}>
    <p className="auth-x-intro">{invite?"Votre invitation a été validée. Choisissez maintenant le mot de passe de votre espace AEDBVT.":"Choisissez un nouveau mot de passe d’au moins 10 caractères."}</p>
    {params.error&&<div className="error-box">{errors[params.error]||"Le mot de passe n’a pas pu être modifié."}</div>}
    <form action={updatePassword} className="form-stack auth-x-form">
      <label>Nouveau mot de passe<input name="password" type="password" minLength={10} autoComplete="new-password" required/></label>
      <label>Confirmer le mot de passe<input name="confirm_password" type="password" minLength={10} autoComplete="new-password" required/></label>
      <button className="button primary">{invite?"Activer mon compte":"Enregistrer le mot de passe"}</button>
    </form>
    <small className="auth-security-note">Après modification, vous serez déconnecté puis invité à vous reconnecter avec le nouveau mot de passe.</small>
  </AuthShell>;
}
