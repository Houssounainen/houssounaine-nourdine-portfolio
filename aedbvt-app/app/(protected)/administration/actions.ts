"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { renderAdministrativeTemplate } from "@/lib/admin-template";

async function ctx(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return {supabase,user:null,role:null};
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
  return {supabase,user,role:profile?.role||null};
}

export async function createTemplate(formData:FormData){
  const {supabase,user,role}=await ctx();
  if(!user||!isStaff(role)) return;
  const code=String(formData.get("code")||"").trim().toUpperCase();
  const title=String(formData.get("title")||"").trim();
  const body=String(formData.get("body_template")||"").trim();
  if(!code||!title||!body) return;
  await supabase.from("administrative_templates").insert({
    code,
    title,
    document_type:String(formData.get("document_type")||"other"),
    subject_template:String(formData.get("subject_template")||"").trim()||null,
    body_template:body,
    variables:String(formData.get("variables")||"").split(",").map(x=>x.trim()).filter(Boolean),
    created_by:user.id,
  });
  revalidatePath("/administration");
}

export async function createCorrespondence(formData:FormData){
  const {supabase,user,role}=await ctx();
  if(!user||!isStaff(role)) return;
  const direction=String(formData.get("direction")||"incoming");
  const subject=String(formData.get("subject")||"").trim();
  const correspondent=String(formData.get("correspondent_name")||"").trim();
  if(!["incoming","outgoing"].includes(direction)||!subject||!correspondent) return;

  const assignedTo=String(formData.get("assigned_to")||"")||null;
  const templateId=String(formData.get("template_id")||"")||null;
  const rawBody=String(formData.get("body")||"").trim();
  let finalSubject=subject;
  let finalBody=rawBody||null;

  if(direction==="outgoing"&&templateId){
    const {data:template}=await supabase.from("administrative_templates")
      .select("subject_template,body_template").eq("id",templateId).maybeSingle();
    if(template){
      const values={subject,body:rawBody,issue_date:new Date().toLocaleDateString("fr-FR")};
      finalSubject=renderAdministrativeTemplate(template.subject_template||subject,values);
      finalBody=renderAdministrativeTemplate(template.body_template,values);
    }
  }

  const {data}=await supabase.from("correspondence_register").insert({
    direction,
    category:String(formData.get("category")||"general").trim()||"general",
    subject:finalSubject,
    correspondent_name:correspondent,
    correspondent_contact:String(formData.get("correspondent_contact")||"").trim()||null,
    body:finalBody,
    received_on:direction==="incoming"?(String(formData.get("received_on")||"")||new Date().toISOString().slice(0,10)):null,
    status:direction==="incoming"?"registered":"draft",
    member_id:String(formData.get("member_id")||"")||null,
    service_request_id:String(formData.get("service_request_id")||"")||null,
    decision_id:String(formData.get("decision_id")||"")||null,
    template_id:templateId,
    assigned_to:assignedTo,
    notes:String(formData.get("notes")||"").trim()||null,
    created_by:user.id,
  }).select("id").single();

  if(data?.id&&assignedTo&&assignedTo!==user.id){
    await supabase.from("internal_notifications").insert({
      recipient_id:assignedTo,
      kind:"info",
      title:"Courrier administratif attribué",
      message:subject,
      href:"/administration/correspondence/"+data.id,
    });
  }
  if(data?.id) redirect("/administration/correspondence/"+data.id);
}

export async function updateCorrespondenceDraft(formData:FormData){
  const {supabase,role}=await ctx();
  if(!isStaff(role)) return;
  const id=String(formData.get("correspondence_id")||"");
  if(!id) return;
  await supabase.from("correspondence_register").update({
    subject:String(formData.get("subject")||"").trim(),
    correspondent_name:String(formData.get("correspondent_name")||"").trim(),
    correspondent_contact:String(formData.get("correspondent_contact")||"").trim()||null,
    category:String(formData.get("category")||"general"),
    body:String(formData.get("body")||"").trim()||null,
    assigned_to:String(formData.get("assigned_to")||"")||null,
    notes:String(formData.get("notes")||"").trim()||null,
    updated_at:new Date().toISOString(),
  }).eq("id",id).eq("status","draft");
  revalidatePath("/administration/correspondence/"+id);
}

export async function submitCorrespondence(formData:FormData){
  const {supabase}=await ctx();
  const id=String(formData.get("correspondence_id")||"");
  if(!id) return;
  await supabase.rpc("submit_outgoing_correspondence",{p_correspondence_id:id});
  revalidatePath("/administration");
  revalidatePath("/administration/correspondence/"+id);
}

export async function reviewCorrespondence(formData:FormData){
  const {supabase}=await ctx();
  const id=String(formData.get("correspondence_id")||"");
  const stage=String(formData.get("stage")||"");
  const approve=String(formData.get("approve")||"true")==="true";
  if(!id||!["secretariat","presidency"].includes(stage)) return;
  await supabase.rpc("review_correspondence",{
    p_correspondence_id:id,p_stage:stage,p_approve:approve
  });
  revalidatePath("/administration");
  revalidatePath("/administration/correspondence/"+id);
}

export async function dispatchCorrespondence(formData:FormData){
  const {supabase}=await ctx();
  const id=String(formData.get("correspondence_id")||"");
  if(!id) return;
  await supabase.rpc("dispatch_correspondence",{
    p_correspondence_id:id,
    p_sent_on:String(formData.get("sent_on")||"")||null,
  });
  revalidatePath("/administration");
  revalidatePath("/administration/correspondence/"+id);
}

export async function startIncomingCorrespondenceReview(formData:FormData){
  const {supabase}=await ctx();
  const id=String(formData.get("correspondence_id")||"");
  if(!id) return;
  await supabase.rpc("start_incoming_correspondence_review",{p_correspondence_id:id});
  revalidatePath("/administration");
  revalidatePath("/administration/correspondence/"+id);
}

export async function closeCorrespondence(formData:FormData){
  const {supabase}=await ctx();
  const id=String(formData.get("correspondence_id")||"");
  if(!id) return;
  await supabase.rpc("close_correspondence",{p_correspondence_id:id});
  revalidatePath("/administration");
  revalidatePath("/administration/correspondence/"+id);
}

export async function createIssuance(formData:FormData){
  const {supabase,user,role}=await ctx();
  if(!user||!isStaff(role)) return;

  const memberId=String(formData.get("member_id")||"");
  const templateId=String(formData.get("template_id")||"");
  if(!memberId||!templateId) return;

  const [{data:member},{data:template}]=await Promise.all([
    supabase.from("members").select("id,full_name,member_number,village,program,study_level").eq("id",memberId).maybeSingle(),
    supabase.from("administrative_templates").select("id,title,document_type,subject_template,body_template").eq("id",templateId).maybeSingle(),
  ]);
  if(!member||!template) return;

  const purpose=String(formData.get("purpose")||"").trim();
  const values={
    member_name:member.full_name,
    member_number:member.member_number||"",
    village:member.village||"",
    program:member.program||"",
    study_level:member.study_level||"",
    issue_date:new Date().toLocaleDateString("fr-FR"),
    purpose,
  };

  const subject=renderAdministrativeTemplate(template.subject_template||template.title,values);
  const body=renderAdministrativeTemplate(template.body_template,values);
  const {data}=await supabase.from("administrative_issuances").insert({
    document_type:template.document_type==="attestation"?"attestation":"letter",
    member_id:member.id,
    template_id:template.id,
    service_request_id:String(formData.get("service_request_id")||"")||null,
    subject,
    purpose:purpose||null,
    body_snapshot:body,
    created_by:user.id,
  }).select("id").single();

  if(data?.id) redirect("/administration/issuances/"+data.id);
}

export async function createIssuanceFromRequest(formData:FormData){
  const {supabase,user,role}=await ctx();
  if(!user||!isStaff(role)) return;
  const requestId=String(formData.get("request_id")||"");
  if(!requestId) return;

  const [{data:request},{data:template}]=await Promise.all([
    supabase.from("member_service_requests").select("id,member_id,subject,details,request_type").eq("id",requestId).maybeSingle(),
    supabase.from("administrative_templates").select("id,title,document_type,subject_template,body_template").eq("code","ATT-MEMBRE").maybeSingle(),
  ]);
  if(!request||!template) return;

  const {data:member}=await supabase.from("members")
    .select("id,full_name,member_number,village,program,study_level")
    .eq("id",request.member_id).maybeSingle();
  if(!member) return;

  const values={
    member_name:member.full_name,
    member_number:member.member_number||"",
    village:member.village||"",
    program:member.program||"",
    study_level:member.study_level||"",
    issue_date:new Date().toLocaleDateString("fr-FR"),
    purpose:request.subject||"",
  };
  const {data}=await supabase.from("administrative_issuances").insert({
    document_type:"attestation",
    member_id:member.id,
    template_id:template.id,
    service_request_id:request.id,
    subject:renderAdministrativeTemplate(template.subject_template||template.title,values),
    purpose:request.subject||null,
    body_snapshot:renderAdministrativeTemplate(template.body_template,values),
    created_by:user.id,
  }).select("id").single();

  if(data?.id){
    await supabase.from("member_service_requests").update({
      status:"in_review",
      assigned_to:user.id,
      response:"Attestation en préparation.",
      updated_at:new Date().toISOString(),
    }).eq("id",request.id);
    redirect("/administration/issuances/"+data.id);
  }
}

export async function updateIssuanceDraft(formData:FormData){
  const {supabase,role}=await ctx();
  if(!isStaff(role)) return;
  const id=String(formData.get("issuance_id")||"");
  if(!id) return;
  await supabase.from("administrative_issuances").update({
    subject:String(formData.get("subject")||"").trim(),
    purpose:String(formData.get("purpose")||"").trim()||null,
    body_snapshot:String(formData.get("body_snapshot")||"").trim(),
    updated_at:new Date().toISOString(),
  }).eq("id",id).eq("status","draft");
  revalidatePath("/administration/issuances/"+id);
}

export async function submitIssuance(formData:FormData){
  const {supabase}=await ctx();
  const id=String(formData.get("issuance_id")||"");
  if(!id) return;
  await supabase.rpc("submit_issuance",{p_issuance_id:id});
  revalidatePath("/administration");
  revalidatePath("/administration/issuances/"+id);
}

export async function reviewIssuance(formData:FormData){
  const {supabase}=await ctx();
  const id=String(formData.get("issuance_id")||"");
  const stage=String(formData.get("stage")||"");
  const approve=String(formData.get("approve")||"true")==="true";
  if(!id||!["secretariat","presidency"].includes(stage)) return;
  await supabase.rpc("review_issuance",{p_issuance_id:id,p_stage:stage,p_approve:approve});
  revalidatePath("/administration");
  revalidatePath("/administration/issuances/"+id);
}

export async function issueDocument(formData:FormData){
  const {supabase}=await ctx();
  const id=String(formData.get("issuance_id")||"");
  if(!id) return;
  await supabase.rpc("issue_administrative_document",{p_issuance_id:id});

  const {data:issuance}=await supabase.from("administrative_issuances")
    .select("service_request_id").eq("id",id).maybeSingle();
  if(issuance?.service_request_id){
    await supabase.from("member_service_requests").update({
      status:"completed",
      response:"Document administratif délivré. Il est disponible dans votre espace membre.",
      updated_at:new Date().toISOString(),
    }).eq("id",issuance.service_request_id);
  }

  revalidatePath("/administration");
  revalidatePath("/administration/issuances/"+id);
  revalidatePath("/requests");
  revalidatePath("/me");
}

export async function uploadAdministrativeAttachment(formData:FormData){
  const {supabase,user,role}=await ctx();
  if(!user||!isStaff(role)) return;
  const file=formData.get("file");
  const entityType=String(formData.get("entity_type")||"");
  const entityId=String(formData.get("entity_id")||"");
  if(!(file instanceof File)||!["correspondence","issuance"].includes(entityType)||!entityId) return;
  const allowed=new Set(["application/pdf","image/jpeg","image/png","image/webp"]);
  if(!allowed.has(file.type)||file.size<=0||file.size>5*1024*1024) return;

  const safeName=file.name.replace(/[^a-zA-Z0-9._-]+/g,"-").slice(-120);
  const storagePath=entityType+"/"+entityId+"/"+crypto.randomUUID()+"-"+safeName;
  const {error}=await supabase.storage.from("administrative-files").upload(storagePath,await file.arrayBuffer(),{
    contentType:file.type,upsert:false
  });
  if(error) return;

  await supabase.from("administrative_attachments").insert({
    entity_type:entityType,
    entity_id:entityId,
    file_name:file.name,
    storage_path:storagePath,
    content_type:file.type,
    size_bytes:file.size,
    uploaded_by:user.id,
  });
  revalidatePath("/administration/"+(entityType==="correspondence"?"correspondence/":"issuances/")+entityId);
}
