"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/server-access";
import { provisionMemberAccount } from "@/lib/member-onboarding";

export async function reviewMembershipApplication(formData:FormData){
  const {allowed,supabase}=await getAccessContext("members_manage");
  if(!allowed) redirect("/applications?error=access");

  const applicationId=String(formData.get("application_id")||"");
  const status=String(formData.get("status")||"");
  const note=String(formData.get("decision_note")||"").trim();
  if(!applicationId||!["in_review","approved","rejected"].includes(status)){
    redirect("/applications?error=decision");
  }

  const {data:memberId,error}=await supabase.rpc("review_membership_application",{
    p_application_id:applicationId,
    p_status:status,
    p_decision_note:note||null,
  });

  if(error) redirect("/applications?error=decision");

  let invite="none";
  if(status==="approved"&&memberId){
    const {data:member}=await supabase
      .from("members")
      .select("id,email,full_name")
      .eq("id",memberId)
      .maybeSingle();

    if(member){
      const result=await provisionMemberAccount({
        memberId:member.id,
        email:member.email,
        fullName:member.full_name,
      });
      invite=result.ok?result.state:"error";
    }
  }

  revalidatePath("/applications");
  revalidatePath("/members");
  revalidatePath("/admin");
  revalidatePath("/finance/dues");

  const query=new URLSearchParams({decision:status});
  if(status==="approved") query.set("invite",invite);
  redirect("/applications?"+query.toString());
}
