"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";

export async function processRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id",user.id).single();
  if (!isStaff(profile?.role)) return;

  const id=String(formData.get("id")||"");
  const status=String(formData.get("status")||"in_review");
  const response=String(formData.get("response")||"").trim();
  if(!id || !["pending","in_review","completed","rejected"].includes(status)) return;

  await supabase.from("member_service_requests").update({
    status,
    response: response || null,
    assigned_to: user.id,
    updated_at: new Date().toISOString(),
  }).eq("id",id);

  revalidatePath("/requests");
  revalidatePath("/me");
}
