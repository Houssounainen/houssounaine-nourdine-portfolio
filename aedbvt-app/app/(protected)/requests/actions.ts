"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";

export async function processRequest(formData: FormData) {
  const {allowed,supabase,user}=await getAccessContext("requests_manage");
  if(!allowed||!user) return;

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
