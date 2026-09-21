import { createClient } from "@/lib/supabase/server";

export type PublicSettings={
  association_name:string;
  association_short_name:string;
  association_city:string;
  association_country:string;
  contact_email:string;
  contact_phone:string;
  official_address:string;
  support_email:string;
  privacy_email:string;
  homepage_message:string;
  legal_status_note:string;
};

const defaults:PublicSettings={
  association_name:"Association des Étudiants de Darsalama et Bandrani-Vouani à Tuléar",
  association_short_name:"AEDBVT",
  association_city:"Tuléar",
  association_country:"Madagascar",
  contact_email:"",
  contact_phone:"",
  official_address:"",
  support_email:"",
  privacy_email:"",
  homepage_message:"Une application séparée pour gérer les membres, la vie associative, la trésorerie, les documents et la gouvernance avec des accès sécurisés.",
  legal_status_note:"Le statut juridique et les formalités réglementaires de l’association restent à valider avant toute présentation institutionnelle définitive.",
};

export async function getPublicSettings():Promise<PublicSettings>{
  const supabase=await createClient();
  const {data}=await supabase.rpc("get_public_app_settings");
  const settings={...defaults};
  for(const row of data||[]){
    if(row.key in settings){
      const value=typeof row.value==="string"?row.value:String(row.value??"");
      (settings as Record<string,string>)[row.key]=value;
    }
  }
  return settings;
}
