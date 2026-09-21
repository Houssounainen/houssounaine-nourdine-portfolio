"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";
import { sendPushToProfiles } from "@/lib/push";

function idsFromRpc(data:any){
  const row=Array.isArray(data)?data[0]:data;
  const ids=row?.recipient_ids||row?.manager_ids||[];
  return Array.isArray(ids)?ids.filter(Boolean):[];
}

export async function createConfidentialCase(formData:FormData){
  const {allowed,supabase}=await getAccessContext();
  if(!allowed) return;

  const category=String(formData.get("category")||"other");
  const subject=String(formData.get("subject")||"").trim();
  const details=String(formData.get("details")||"").trim();
  const desiredOutcome=String(formData.get("desired_outcome")||"").trim();
  const priority=String(formData.get("priority")||"normal");
  if(!subject||!details) return;

  const {data,error}=await supabase.rpc("create_confidential_case",{
    p_category:category,
    p_subject:subject,
    p_details:details,
    p_desired_outcome:desiredOutcome,
    p_priority:priority,
  });

  if(error||!data?.length) return;

  const managerIds=idsFromRpc(data);
  if(managerIds.length){
    await sendPushToProfiles(managerIds,{
      title:"AEDBVT · Dossier confidentiel",
      body:"Un nouveau dossier confidentiel nécessite une prise en charge.",
      url:"/cases/"+data[0].case_id,
      tag:"confidential-case",
    },"cases").catch(()=>undefined);
  }

  revalidatePath("/cases");
  revalidatePath("/notifications");
}

export async function addConfidentialCaseMessage(formData:FormData){
  const {allowed,supabase}=await getAccessContext();
  if(!allowed) return;

  const caseId=String(formData.get("case_id")||"");
  const message=String(formData.get("message")||"").trim();
  const visibility=String(formData.get("visibility")||"member");
  if(!caseId||!message) return;

  const {data,error}=await supabase.rpc("add_confidential_case_message",{
    p_case_id:caseId,
    p_message:message,
    p_visibility:visibility,
  });

  if(!error){
    const recipients=idsFromRpc(data);
    if(recipients.length){
      await sendPushToProfiles(recipients,{
        title:"AEDBVT · Dossier confidentiel",
        body:"Une mise à jour est disponible dans un dossier confidentiel.",
        url:"/cases/"+caseId,
        tag:"confidential-case",
      },"cases").catch(()=>undefined);
    }
  }

  revalidatePath("/cases/"+caseId);
  revalidatePath("/cases");
  revalidatePath("/notifications");
}

export async function updateConfidentialCase(formData:FormData){
  const {allowed,supabase}=await getAccessContext("case_manage");
  if(!allowed) return;

  const caseId=String(formData.get("case_id")||"");
  const status=String(formData.get("status")||"received");
  const assignedTo=String(formData.get("assigned_to")||"")||null;
  const resolution=String(formData.get("resolution_summary")||"").trim();
  const message=String(formData.get("message")||"").trim();
  const visible=formData.get("visible_to_member")==="on";
  if(!caseId) return;

  const {data,error}=await supabase.rpc("update_confidential_case",{
    p_case_id:caseId,
    p_status:status,
    p_assigned_to:assignedTo,
    p_resolution_summary:resolution,
    p_message:message,
    p_visible_to_member:visible,
  });

  if(!error){
    const recipients=idsFromRpc(data);
    if(recipients.length){
      await sendPushToProfiles(recipients,{
        title:"AEDBVT · Dossier confidentiel",
        body:"Une mise à jour est disponible dans un dossier confidentiel.",
        url:"/cases/"+caseId,
        tag:"confidential-case",
      },"cases").catch(()=>undefined);
    }
  }

  revalidatePath("/cases/"+caseId);
  revalidatePath("/cases");
  revalidatePath("/notifications");
}
