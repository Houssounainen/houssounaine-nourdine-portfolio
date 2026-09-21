"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";
import { sendPushToProfiles } from "@/lib/push";

export async function createDuesCycle(formData:FormData){
  const {allowed,supabase,user}=await getAccessContext("finance_manage");
  if(!allowed||!user) return;

  const label=String(formData.get("label")||"").trim();
  const startsOn=String(formData.get("starts_on")||"");
  const endsOn=String(formData.get("ends_on")||"");
  const dueOn=String(formData.get("due_on")||"");
  const amount=Number(formData.get("amount")||0);
  if(!label||!startsOn||!endsOn||!dueOn||amount<=0) return;

  await supabase.from("membership_dues_cycles").insert({
    label,
    starts_on:startsOn,
    ends_on:endsOn,
    due_on:dueOn,
    amount,
    created_by:user.id,
  });

  revalidatePath("/finance/dues");
}

export async function openDuesCycle(formData:FormData){
  const {allowed,supabase}=await getAccessContext("finance_manage");
  if(!allowed) return;
  const id=String(formData.get("cycle_id")||"");
  if(!id) return;
  await supabase.rpc("open_dues_cycle",{p_cycle_id:id});
  revalidatePath("/finance/dues");
  revalidatePath("/finance");
}

export async function closeDuesCycle(formData:FormData){
  const {allowed,supabase}=await getAccessContext("finance_manage");
  if(!allowed) return;
  const id=String(formData.get("cycle_id")||"");
  if(!id) return;
  await supabase.rpc("close_dues_cycle",{p_cycle_id:id});
  revalidatePath("/finance/dues");
  revalidatePath("/finance");
}

export async function updateMemberDue(formData:FormData){
  const {allowed,supabase}=await getAccessContext("finance_manage");
  if(!allowed) return;

  const id=String(formData.get("due_id")||"");
  const waived=Number(formData.get("waived_amount")||0);
  const notes=String(formData.get("notes")||"").trim()||null;
  if(!id||waived<0) return;

  await supabase.from("member_dues").update({
    waived_amount:waived,
    notes,
    updated_at:new Date().toISOString(),
  }).eq("id",id);

  revalidatePath("/finance/dues");
  revalidatePath("/me");
}

export async function sendDuesReminder(formData:FormData){
  const {allowed,supabase}=await getAccessContext("finance_manage");
  if(!allowed) return;

  const dueId=String(formData.get("due_id")||"");
  if(!dueId) return;

  const {data:due}=await supabase.from("member_dues_overview")
    .select("id,cycle_label,due_on,balance,current_status,member_id")
    .eq("id",dueId)
    .maybeSingle();

  if(!due||!["due","partial","overdue"].includes(due.current_status)||Number(due.balance)<=0) return;

  const {data:member}=await supabase.from("members")
    .select("full_name,profile_id")
    .eq("id",due.member_id)
    .maybeSingle();

  if(!member?.profile_id) return;

  const body=`Cotisation ${due.cycle_label} : reste à régler ${Number(due.balance).toLocaleString("fr-FR")} Ar. Échéance : ${new Date(due.due_on+"T12:00:00").toLocaleDateString("fr-FR")}.`;

  await supabase.from("internal_notifications").insert({
    recipient_id:member.profile_id,
    kind:due.current_status==="overdue"?"warning":"info",
    title:"Cotisation AEDBVT",
    message:body,
    href:"/me",
  });

  await sendPushToProfiles([member.profile_id],{
    title:"Cotisation AEDBVT",
    body,
    url:"/me",
    tag:"membership-dues",
  },"announcements").catch(()=>undefined);

  const {data:current}=await supabase.from("member_dues")
    .select("reminder_count")
    .eq("id",dueId)
    .maybeSingle();

  await supabase.from("member_dues").update({
    last_reminded_at:new Date().toISOString(),
    reminder_count:Number(current?.reminder_count||0)+1,
    updated_at:new Date().toISOString(),
  }).eq("id",dueId);

  revalidatePath("/finance/dues");
}
