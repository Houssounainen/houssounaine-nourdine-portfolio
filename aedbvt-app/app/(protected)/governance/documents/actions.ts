"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";

async function ctx(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return {supabase,user:null,role:null};
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
  return {supabase,user,role:profile?.role||null};
}

export async function createGovernanceDocument(formData:FormData){
  const {supabase,user,role}=await ctx();
  if(!user||!isStaff(role)) return;
  const title=String(formData.get("title")||"").trim();
  const category=String(formData.get("category")||"Organisation").trim();
  const versionLabel=String(formData.get("version_label")||"1.0").trim();
  const body=String(formData.get("body")||"").trim();
  if(!title||!body) return;

  const {data:doc}=await supabase.from("governance_documents").insert({
    title,category,version:versionLabel,body,published:false,updated_at:new Date().toISOString()
  }).select("id").single();
  if(!doc?.id) return;

  await supabase.rpc("create_document_version",{
    p_document_id:doc.id,p_version_label:versionLabel,p_title:title,p_body:body,
    p_change_summary:"Version initiale",p_based_on_version_id:null
  });
  redirect("/governance/documents/"+doc.id);
}

export async function createVersion(formData:FormData){
  const {supabase,role}=await ctx();
  if(!isStaff(role)) return;
  const documentId=String(formData.get("document_id")||"");
  const versionLabel=String(formData.get("version_label")||"").trim();
  const title=String(formData.get("title")||"").trim();
  const body=String(formData.get("body")||"");
  const basedOn=String(formData.get("based_on_version_id")||"")||null;
  if(!documentId||!versionLabel||!title||!body.trim()) return;
  await supabase.rpc("create_document_version",{
    p_document_id:documentId,p_version_label:versionLabel,p_title:title,p_body:body,
    p_change_summary:String(formData.get("change_summary")||"").trim()||null,
    p_based_on_version_id:basedOn
  });
  revalidatePath("/governance/documents/"+documentId);
}

export async function updateDraftVersion(formData:FormData){
  const {supabase,role}=await ctx();
  if(!isStaff(role)) return;
  const versionId=String(formData.get("version_id")||"");
  const documentId=String(formData.get("document_id")||"");
  if(!versionId) return;
  await supabase.rpc("update_draft_document_version",{
    p_version_id:versionId,
    p_title:String(formData.get("title")||""),
    p_body:String(formData.get("body")||""),
    p_change_summary:String(formData.get("change_summary")||"").trim()||null
  });
  revalidatePath("/governance/documents/"+documentId);
}

export async function submitVersion(formData:FormData){
  const {supabase,role}=await ctx();
  if(!isStaff(role)) return;
  const versionId=String(formData.get("version_id")||"");
  const documentId=String(formData.get("document_id")||"");
  if(!versionId) return;
  await supabase.rpc("submit_document_version",{p_version_id:versionId});
  revalidatePath("/governance/documents/"+documentId);
}

export async function reviewVersion(formData:FormData){
  const {supabase}=await ctx();
  const versionId=String(formData.get("version_id")||"");
  const documentId=String(formData.get("document_id")||"");
  const decision=String(formData.get("decision")||"");
  if(!versionId||!["approved","rejected"].includes(decision)) return;
  await supabase.rpc("review_document_version",{
    p_version_id:versionId,p_decision:decision,p_note:String(formData.get("note")||"").trim()||null
  });
  revalidatePath("/governance/documents/"+documentId);
}

export async function publishVersion(formData:FormData){
  const {supabase}=await ctx();
  const versionId=String(formData.get("version_id")||"");
  const documentId=String(formData.get("document_id")||"");
  if(!versionId) return;
  await supabase.rpc("publish_document_version",{p_version_id:versionId});
  revalidatePath("/governance/documents/"+documentId);
  revalidatePath("/governance/documents");
  revalidatePath("/governance/decisions");
  revalidatePath("/association");
}

export async function proposeAmendment(formData:FormData){
  const {supabase}=await ctx();
  const documentId=String(formData.get("document_id")||"");
  const title=String(formData.get("title")||"").trim();
  const proposed=String(formData.get("proposed_text")||"").trim();
  if(!documentId||!title||!proposed) return;
  await supabase.rpc("propose_amendment",{
    p_document_id:documentId,p_title:title,
    p_rationale:String(formData.get("rationale")||"").trim()||null,
    p_proposed_text:proposed
  });
  revalidatePath("/governance/documents/"+documentId);
}

export async function reviewAmendment(formData:FormData){
  const {supabase,role}=await ctx();
  if(!isStaff(role)) return;
  const id=String(formData.get("amendment_id")||"");
  const documentId=String(formData.get("document_id")||"");
  const status=String(formData.get("status")||"");
  if(!id||!["review","adopted","rejected"].includes(status)) return;
  await supabase.rpc("review_amendment",{
    p_amendment_id:id,p_status:status,p_notes:String(formData.get("decision_notes")||"").trim()||null,
    p_assembly_id:null,p_motion_id:null
  });
  revalidatePath("/governance/documents/"+documentId);
}

export async function withdrawAmendment(formData:FormData){
  const {supabase}=await ctx();
  const id=String(formData.get("amendment_id")||"");
  const documentId=String(formData.get("document_id")||"");
  if(!id) return;
  await supabase.rpc("withdraw_my_amendment",{p_amendment_id:id});
  revalidatePath("/governance/documents/"+documentId);
}
