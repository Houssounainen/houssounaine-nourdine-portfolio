"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { sendPushToProfiles } from "@/lib/push";

async function context(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return {supabase,user:null,role:null};
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
  return {supabase,user,role:profile?.role||null};
}

export async function createMandate(formData:FormData){
  const {supabase,user,role}=await context();
  if(!user||!isStaff(role)) return;
  const profileId=String(formData.get("profile_id")||"");
  const title=String(formData.get("title")||"").trim();
  const startsOn=String(formData.get("starts_on")||"");
  if(!profileId||!title||!startsOn) return;

  await supabase.from("bureau_mandates").insert({
    profile_id:profileId,
    title,
    scope:String(formData.get("scope")||"").trim()||null,
    starts_on:startsOn,
    ends_on:String(formData.get("ends_on")||"")||null,
    appointment_basis:String(formData.get("appointment_basis")||"").trim()||null,
    decision_id:String(formData.get("decision_id")||"")||null,
    created_by:user.id,
  });
  revalidatePath("/operations");
  revalidatePath("/organization");
}

export async function closeMandate(formData:FormData){
  const {supabase,role}=await context();
  if(!isStaff(role)) return;
  const id=String(formData.get("mandate_id")||"");
  const status=String(formData.get("status")||"completed");
  if(!id||!["completed","revoked"].includes(status)) return;
  await supabase.from("bureau_mandates").update({
    status,
    ends_on:String(formData.get("ends_on")||"")||new Date().toISOString().slice(0,10),
    updated_at:new Date().toISOString(),
  }).eq("id",id);
  revalidatePath("/operations");
  revalidatePath("/organization");
}

export async function createCommission(formData:FormData){
  const {supabase,user,role}=await context();
  if(!user||!isStaff(role)) return;
  const name=String(formData.get("name")||"").trim();
  if(!name) return;
  const leadProfileId=String(formData.get("lead_profile_id")||"")||null;
  const {data:commission}=await supabase.from("commissions").insert({
    name,
    description:String(formData.get("description")||"").trim()||null,
    mandate:String(formData.get("mandate")||"").trim()||null,
    lead_profile_id:leadProfileId,
    decision_id:String(formData.get("decision_id")||"")||null,
    starts_on:String(formData.get("starts_on")||"")||null,
    ends_on:String(formData.get("ends_on")||"")||null,
    created_by:user.id,
  }).select("id").single();

  if(commission?.id&&leadProfileId){
    await supabase.from("commission_members").upsert({
      commission_id:commission.id,
      profile_id:leadProfileId,
      role:"responsable",
      left_at:null,
    },{onConflict:"commission_id,profile_id"});
  }
  revalidatePath("/operations");
  revalidatePath("/organization");
}

export async function addCommissionMember(formData:FormData){
  const {supabase,role}=await context();
  if(!isStaff(role)) return;
  const commissionId=String(formData.get("commission_id")||"");
  const profileId=String(formData.get("profile_id")||"");
  if(!commissionId||!profileId) return;
  await supabase.from("commission_members").upsert({
    commission_id:commissionId,
    profile_id:profileId,
    role:String(formData.get("role")||"membre").trim()||"membre",
    left_at:null,
  },{onConflict:"commission_id,profile_id"});
  revalidatePath("/operations");
  revalidatePath("/operations/commissions/"+commissionId);
  revalidatePath("/organization");
}

export async function removeCommissionMember(formData:FormData){
  const {supabase,role}=await context();
  if(!isStaff(role)) return;
  const commissionId=String(formData.get("commission_id")||"");
  const profileId=String(formData.get("profile_id")||"");
  if(!commissionId||!profileId) return;
  await supabase.from("commission_members").update({left_at:new Date().toISOString()})
    .eq("commission_id",commissionId).eq("profile_id",profileId);
  revalidatePath("/operations/commissions/"+commissionId);
  revalidatePath("/organization");
}

export async function closeCommission(formData:FormData){
  const {supabase,role}=await context();
  if(!isStaff(role)) return;
  const id=String(formData.get("commission_id")||"");
  if(!id) return;
  await supabase.from("commissions").update({
    status:"closed",
    ends_on:String(formData.get("ends_on")||"")||new Date().toISOString().slice(0,10),
    updated_at:new Date().toISOString(),
  }).eq("id",id);
  revalidatePath("/operations");
  revalidatePath("/operations/commissions/"+id);
  revalidatePath("/organization");
}

export async function createTask(formData:FormData){
  const {supabase,user,role}=await context();
  if(!user||!isStaff(role)) return;
  const title=String(formData.get("title")||"").trim();
  if(!title) return;
  const assigneeId=String(formData.get("assignee_id")||"")||null;
  const {data:task}=await supabase.from("operational_tasks").insert({
    title,
    description:String(formData.get("description")||"").trim()||null,
    priority:String(formData.get("priority")||"normal"),
    due_on:String(formData.get("due_on")||"")||null,
    decision_id:String(formData.get("decision_id")||"")||null,
    assembly_id:String(formData.get("assembly_id")||"")||null,
    commission_id:String(formData.get("commission_id")||"")||null,
    assignee_id:assigneeId,
    created_by:user.id,
  }).select("id").maybeSingle();

  if(task?.id&&assigneeId){
    await sendPushToProfiles([assigneeId],{
      title:"Nouvelle tâche AEDBVT",
      body:title,
      url:"/operations/tasks/"+task.id,
      tag:"task-assignment",
    },"operations").catch(()=>undefined);
  }

  revalidatePath("/operations");
  revalidatePath("/dashboard");
}

export async function updateTaskAssignment(formData:FormData){
  const {supabase,role}=await context();
  if(!isStaff(role)) return;
  const taskId=String(formData.get("task_id")||"");
  if(!taskId) return;
  const nextAssignee=String(formData.get("assignee_id")||"")||null;
  const {data:before}=await supabase.from("operational_tasks").select("title,assignee_id").eq("id",taskId).maybeSingle();

  await supabase.from("operational_tasks").update({
    assignee_id:nextAssignee,
    commission_id:String(formData.get("commission_id")||"")||null,
    priority:String(formData.get("priority")||"normal"),
    due_on:String(formData.get("due_on")||"")||null,
    updated_at:new Date().toISOString(),
  }).eq("id",taskId);

  if(nextAssignee&&before?.assignee_id!==nextAssignee){
    await sendPushToProfiles([nextAssignee],{
      title:"Tâche AEDBVT attribuée",
      body:before?.title||"Une action vous a été attribuée.",
      url:"/operations/tasks/"+taskId,
      tag:"task-assignment",
    },"operations").catch(()=>undefined);
  }

  revalidatePath("/operations");
  revalidatePath("/operations/tasks/"+taskId);
  revalidatePath("/dashboard");
}

export async function updateTaskState(formData:FormData){
  const {supabase}=await context();
  const taskId=String(formData.get("task_id")||"");
  const status=String(formData.get("status")||"backlog");
  const progress=Number(formData.get("progress")||0);
  if(!taskId) return;
  await supabase.rpc("update_operational_task_state",{
    p_task_id:taskId,
    p_status:status,
    p_progress:progress,
    p_blocker_note:String(formData.get("blocker_note")||"").trim()||null,
  });
  revalidatePath("/operations");
  revalidatePath("/operations/tasks/"+taskId);
  revalidatePath("/dashboard");
}

export async function addTaskUpdate(formData:FormData){
  const {supabase,user}=await context();
  if(!user) return;
  const taskId=String(formData.get("task_id")||"");
  const body=String(formData.get("body")||"").trim();
  if(!taskId||!body) return;
  await supabase.from("task_updates").insert({
    task_id:taskId,
    update_type:String(formData.get("update_type")||"comment"),
    body,
    created_by:user.id,
  });
  revalidatePath("/operations/tasks/"+taskId);
}

export async function markNotificationRead(formData:FormData){
  const {supabase}=await context();
  const id=String(formData.get("notification_id")||"");
  if(!id) return;
  await supabase.rpc("mark_internal_notification_read",{p_notification_id:id});
  revalidatePath("/operations");
}

export async function markAllNotificationsRead(){
  const {supabase}=await context();
  await supabase.rpc("mark_all_internal_notifications_read");
  revalidatePath("/operations");
}
