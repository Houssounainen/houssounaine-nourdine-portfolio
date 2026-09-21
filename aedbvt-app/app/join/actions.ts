"use server";

import { createClient } from "@/lib/supabase/server";

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
  const consent=formData.get("consent")==="on";

  if(fullName.length<3||fullName.length>120) return {ok:false,error:"Vérifiez votre nom complet."};
  if(!["Darsalama","Bandrani-Vouani"].includes(village)) return {ok:false,error:"Sélectionnez votre village."};
  if(phone.length<6||phone.length>40) return {ok:false,error:"Vérifiez votre numéro de téléphone."};
  if(email.length>180) return {ok:false,error:"Adresse email invalide."};
  if(program.length>120||studyLevel.length>80||motivation.length>1200) return {ok:false,error:"Un des champs dépasse la longueur autorisée."};
  if(!consent) return {ok:false,error:"Votre consentement est requis pour déposer la candidature."};

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
    if(message.includes("déjà en cours")) return {ok:false,error:"Une candidature est déjà en cours avec cette adresse email."};
    if(message.includes("adhésion active")) return {ok:false,error:"Cette adresse email est déjà liée à une adhésion active."};
    return {ok:false,error:"La candidature n’a pas pu être enregistrée. Vérifiez les informations puis réessayez."};
  }

  const result=data?.[0];
  if(!result?.reference||!result?.public_token){
    return {ok:false,error:"La candidature n’a pas pu être finalisée."};
  }

  return {
    ok:true,
    reference:result.reference,
    token:result.public_token,
  };
}
