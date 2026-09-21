"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type MembershipApplicationState={
  ok:boolean;
  error?:string;
  reference?:string;
  token?:string;
};

export async function submitMembershipApplication(
  _previousState:MembershipApplicationState,
  formData:FormData
):Promise<MembershipApplicationState>{
  const honeypot=String(formData.get("website")||"").trim();
  if(honeypot) return {ok:true};

  const startedAt=Number(formData.get("started_at")||0);
  const elapsed=Date.now()-startedAt;
  if(!startedAt||elapsed<1500||elapsed>2*60*60*1000){
    return {ok:false,error:"Le formulaire a expiré. Rechargez la page puis réessayez."};
  }

  const fullName=String(formData.get("full_name")||"").trim();
  const village=String(formData.get("village")||"");
  const program=String(formData.get("program")||"").trim();
  const studyLevel=String(formData.get("study_level")||"").trim();
  const phone=String(formData.get("phone")||"").trim();
  const email=String(formData.get("email")||"").trim().toLowerCase();
  const motivation=String(formData.get("motivation")||"").trim();
  const password=String(formData.get("password")||"");
  const confirmPassword=String(formData.get("confirm_password")||"");
  const consent=formData.get("consent")==="on";

  if(fullName.length<3||fullName.length>120) return {ok:false,error:"Vérifiez votre nom complet."};
  if(!["Darsalama","Bandrani-Vouani"].includes(village)) return {ok:false,error:"Sélectionnez votre village."};
  if(phone.length<6||phone.length>40) return {ok:false,error:"Vérifiez votre numéro de téléphone."};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>180) return {ok:false,error:"Adresse email invalide."};
  if(program.length>120||studyLevel.length>80||motivation.length>1200) return {ok:false,error:"Un des champs dépasse la longueur autorisée."};
  if(password.length<10) return {ok:false,error:"Choisissez un mot de passe d’au moins 10 caractères."};
  if(password!==confirmPassword) return {ok:false,error:"Les deux mots de passe ne correspondent pas."};
  if(!consent) return {ok:false,error:"Votre consentement est requis pour déposer la candidature."};

  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
    return {ok:false,error:"Le dépôt de candidature est temporairement indisponible pendant la configuration du service sécurisé."};
  }

  const supabase=await createClient();
  const {data,error}=await supabase.rpc("submit_membership_application",{
    p_full_name:fullName,
    p_village:village,
    p_program:program,
    p_study_level:studyLevel,
    p_phone:phone,
    p_email:email,
    p_motivation:motivation,
    p_consent:consent,
  });

  if(error){
    const message=error.message||"";
    if(message.includes("numéro de téléphone")) return {ok:false,error:"Une candidature est déjà en cours avec ce numéro de téléphone."};
    if(message.includes("déjà en cours")) return {ok:false,error:"Une candidature est déjà en cours avec cette adresse email."};
    if(message.includes("adhésion active")) return {ok:false,error:"Cette adresse email est déjà liée à une adhésion active."};
    return {ok:false,error:"La candidature n’a pas pu être enregistrée. Vérifiez les informations puis réessayez."};
  }

  const result=data?.[0];
  if(!result?.reference||!result?.public_token){
    return {ok:false,error:"La candidature n’a pas pu être finalisée."};
  }

  const appUrl=(process.env.NEXT_PUBLIC_APP_URL||"").replace(/\/$/,"");
  const redirectTo=appUrl
    ? appUrl+"/auth/complete?next="+encodeURIComponent("/login?verified=1")
    : undefined;

  const {data:authData,error:authError}=await supabase.auth.signUp({
    email,
    password,
    options:{
      data:{full_name:fullName,application_pending:true},
      ...(redirectTo?{emailRedirectTo:redirectTo}:{}),
    },
  });

  if(authError||!authData.user){
    const admin=createAdminClient();
    if(admin){
      await admin.from("membership_applications").delete().eq("reference",result.reference);
    }
    const message=authError?.message?.toLowerCase()||"";
    if(message.includes("already")||message.includes("registered")||message.includes("exists")){
      return {ok:false,error:"Un compte existe déjà avec cette adresse email. Utilisez la connexion ou « Mot de passe oublié »."};
    }
    return {ok:false,error:"Le compte de connexion n’a pas pu être préparé. Réessayez avec une adresse email valide."};
  }

  const admin=createAdminClient();
  if(admin){
    await admin.from("profiles").update({active:false,full_name:fullName}).eq("id",authData.user.id);
  }

  if(authData.session){
    await supabase.auth.signOut();
  }

  return {
    ok:true,
    reference:result.reference,
    token:result.public_token,
  };
}
