"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";
import { sendPushToProfiles } from "@/lib/push";

export async function sendInternalBroadcast(formData:FormData){
  const {allowed,supabase}=await getAccessContext("communication_manage");
  if(!allowed) return;

  const title=String(formData.get("title")||"").trim();
  const message=String(formData.get("message")||"").trim();
  const priority=String(formData.get("priority")||"info");
  const segmentType=String(formData.get("segment_type")||"all");
  const segmentValue=segmentType==="role"
    ? String(formData.get("role_value")||"")
    : segmentType==="village"
      ? String(formData.get("village_value")||"")
      : "";

  if(!title||!message) return;

  const {data,error}=await supabase.rpc("create_internal_broadcast",{
    p_title:title,
    p_message:message,
    p_priority:priority,
    p_segment_type:segmentType,
    p_segment_value:segmentValue||null,
  });

  if(error||!data?.length) return;

  const recipientIds=(data[0]?.recipient_ids||[]) as string[];
  if(recipientIds.length){
    await sendPushToProfiles(recipientIds,{
      title:priority==="urgent"?"AEDBVT · Urgent":title,
      body:message,
      url:"/notifications",
      tag:"internal-broadcast",
    },"announcements").catch(()=>undefined);
  }

  revalidatePath("/communication");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
