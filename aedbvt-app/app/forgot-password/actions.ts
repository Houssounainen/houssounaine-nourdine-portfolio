"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData:FormData){
  const email=String(formData.get("email")||"").trim().toLowerCase();
  if(!email||email.length>180) redirect("/forgot-password?sent=1");

  const appUrl=(process.env.NEXT_PUBLIC_APP_URL||"").replace(/\/$/,"");
  if(!appUrl||!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
    redirect("/forgot-password?error=config");
  }

  const supabase=await createClient();
  const {error}=await supabase.auth.resetPasswordForEmail(email,{
    redirectTo:appUrl+"/auth/complete?next="+encodeURIComponent("/update-password"),
  });

  if(error) redirect("/forgot-password?error=send");
  redirect("/forgot-password?sent=1");
}
