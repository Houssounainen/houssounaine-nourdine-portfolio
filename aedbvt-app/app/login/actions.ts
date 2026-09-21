"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
    redirect("/login?error=config");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error?.code==="email_not_confirmed") redirect("/login?error=pending");
  if (error||!data.user) redirect("/login?error=identifiants");

  const {data:profile}=await supabase
    .from("profiles")
    .select("active")
    .eq("id",data.user.id)
    .maybeSingle();

  if(profile?.active===false){
    await supabase.auth.signOut();
    redirect("/login?error=pending");
  }

  await supabase.rpc("mark_my_account_activated");
  redirect("/dashboard");
}
