"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";

export async function createPartner(formData:FormData){
  const {allowed,supabase,user}=await getAccessContext("partners_manage");
  if(!allowed||!user) return;

  const name=String(formData.get("name")||"").trim();
  if(!name) return;

  await supabase.from("partners").insert({
    name,
    partner_type:String(formData.get("partner_type")||"institution"),
    status:String(formData.get("status")||"prospect"),
    contact_name:String(formData.get("contact_name")||"").trim()||null,
    email:String(formData.get("email")||"").trim().toLowerCase()||null,
    phone:String(formData.get("phone")||"").trim()||null,
    address:String(formData.get("address")||"").trim()||null,
    website:String(formData.get("website")||"").trim()||null,
    notes:String(formData.get("notes")||"").trim()||null,
    is_public:formData.get("is_public")==="on",
    public_description:String(formData.get("public_description")||"").trim()||null,
    created_by:user.id,
  });

  revalidatePath("/partners");
}

export async function updatePartner(formData:FormData){
  const {allowed,supabase}=await getAccessContext("partners_manage");
  if(!allowed) return;

  const id=String(formData.get("partner_id")||"");
  const name=String(formData.get("name")||"").trim();
  if(!id||!name) return;

  await supabase.from("partners").update({
    name,
    partner_type:String(formData.get("partner_type")||"institution"),
    status:String(formData.get("status")||"prospect"),
    contact_name:String(formData.get("contact_name")||"").trim()||null,
    email:String(formData.get("email")||"").trim().toLowerCase()||null,
    phone:String(formData.get("phone")||"").trim()||null,
    address:String(formData.get("address")||"").trim()||null,
    website:String(formData.get("website")||"").trim()||null,
    notes:String(formData.get("notes")||"").trim()||null,
    is_public:formData.get("is_public")==="on",
    public_description:String(formData.get("public_description")||"").trim()||null,
    updated_at:new Date().toISOString(),
  }).eq("id",id);

  revalidatePath("/partners");
  revalidatePath("/partners/"+id);
  revalidatePath("/soutiens");
}

export async function createCommitment(formData:FormData){
  const {allowed,supabase,user}=await getAccessContext("partners_manage");
  if(!allowed||!user) return;

  const partnerId=String(formData.get("partner_id")||"");
  const title=String(formData.get("title")||"").trim();
  const type=String(formData.get("contribution_type")||"donation");
  const amount=Number(formData.get("pledged_amount")||0);
  if(!partnerId||!title) return;
  if(type!=="in_kind"&&amount<=0) return;

  await supabase.from("partner_commitments").insert({
    partner_id:partnerId,
    title,
    contribution_type:type,
    pledged_amount:type==="in_kind"?0:amount,
    in_kind_details:String(formData.get("in_kind_details")||"").trim()||null,
    pledged_on:String(formData.get("pledged_on")||"")||new Date().toISOString().slice(0,10),
    due_on:String(formData.get("due_on")||"")||null,
    notes:String(formData.get("notes")||"").trim()||null,
    created_by:user.id,
  });

  revalidatePath("/partners");
  revalidatePath("/partners/"+partnerId);
}

export async function updateCommitmentStatus(formData:FormData){
  const {allowed,supabase}=await getAccessContext("partners_manage");
  if(!allowed) return;

  const id=String(formData.get("commitment_id")||"");
  const partnerId=String(formData.get("partner_id")||"");
  const status=String(formData.get("status")||"pledged");
  if(!id||!partnerId||!["pledged","partial","received","cancelled"].includes(status)) return;

  const {data:commitment}=await supabase.from("partner_commitments")
    .select("contribution_type,received_amount,pledged_amount")
    .eq("id",id)
    .maybeSingle();

  if(!commitment) return;
  if(commitment.contribution_type!=="in_kind"&&status==="received"&&Number(commitment.received_amount)<Number(commitment.pledged_amount)) return;

  await supabase.from("partner_commitments").update({
    status,
    updated_at:new Date().toISOString(),
  }).eq("id",id);

  revalidatePath("/partners/"+partnerId);
}

export async function recordPartnerReceipt(formData:FormData){
  const {allowed,supabase,user}=await getAccessContext("finance_manage");
  if(!allowed||!user) return;

  const partnerId=String(formData.get("partner_id")||"");
  const amount=Number(formData.get("amount")||0);
  const method=String(formData.get("method")||"").trim();
  if(!partnerId||amount<=0||!method) return;

  const receivedRaw=String(formData.get("received_at")||"");
  const receivedAt=receivedRaw?new Date(receivedRaw+"+03:00").toISOString():new Date().toISOString();

  await supabase.from("partner_receipts").insert({
    partner_id:partnerId,
    commitment_id:String(formData.get("commitment_id")||"")||null,
    amount,
    method,
    external_reference:String(formData.get("external_reference")||"").trim()||null,
    received_at:receivedAt,
    category_id:String(formData.get("category_id")||"")||null,
    account_id:String(formData.get("account_id")||"")||null,
    notes:String(formData.get("notes")||"").trim()||null,
    created_by:user.id,
  });

  revalidatePath("/partners");
  revalidatePath("/partners/"+partnerId);
  revalidatePath("/finance");
  revalidatePath("/analytics");
}
