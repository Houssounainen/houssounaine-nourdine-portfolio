"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";

export async function reviewMembershipApplication(formData:FormData){
  const {allowed,supabase}=await getAccessContext("members_manage");
  if(!allowed) return;

  const applicationId=String(formData.get("application_id")||"");
  const status=String(formData.get("status")||"");
  const note=String(formData.get("decision_note")||"").trim();
  if(!applicationId||!["in_review","approved","rejected"].includes(status)) return;

  await supabase.rpc("review_membership_application",{
    p_application_id:applicationId,
    p_status:status,
    p_decision_note:note||null,
  });

  revalidatePath("/applications");
  revalidatePath("/members");
  revalidatePath("/admin");
  revalidatePath("/finance/dues");
}
