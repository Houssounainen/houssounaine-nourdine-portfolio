"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";

const stringKeys=[
  "association_name",
  "association_short_name",
  "association_city",
  "association_country",
  "contact_email",
  "contact_phone",
  "official_address",
  "support_email",
  "privacy_email",
  "homepage_message",
  "legal_status_note",
  "administrator_display_name",
] as const;

export async function updateInstitutionalSettings(formData:FormData){
  const {allowed,supabase}=await getAccessContext("admin_manage");
  if(!allowed) return;

  const rows:{key:string;value:string;updated_at:string}[]=stringKeys.map((key)=>({
    key,
    value:String(formData.get(key)||"").trim(),
    updated_at:new Date().toISOString(),
  }));

  const dues=Number(formData.get("annual_dues_ariary")||0);
  if(Number.isFinite(dues)&&dues>0){
    rows.push({
      key:"annual_dues_ariary",
      value:String(Math.round(dues)),
      updated_at:new Date().toISOString(),
    });
  }

  for(const row of rows){
    await supabase.from("app_settings").upsert(row,{onConflict:"key"});
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/privacy");
  revalidatePath("/terms");
  revalidatePath("/support");
  revalidatePath("/association");
}
