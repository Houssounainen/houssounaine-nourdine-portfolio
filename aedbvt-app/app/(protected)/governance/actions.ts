"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";

function toIso(value:string){
  if(!value) return null;
  return new Date(value + (value.length===16?":00+03:00":"+03:00")).toISOString();
}

async function ctx(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return {supabase,user:null,role:null,member:null};
  const [{data:profile},{data:member}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user.id).single(),
    supabase.from("members").select("id").eq("profile_id",user.id).eq("status","active").maybeSingle(),
  ]);
  return {supabase,user,role:profile?.role||null,member};
}

export async function createAssembly(formData:FormData){
  const {supabase,user,role}=await ctx();
  if(!user||!isStaff(role)) return;
  const title=String(formData.get("title")||"").trim();
  const starts=String(formData.get("starts_at")||"");
  if(!title||!starts) return;
  const agenda=String(formData.get("agenda")||"").split("\n").map(x=>x.trim()).filter(Boolean);
  const {data}=await supabase.from("assemblies").insert({
    title,
    assembly_type:String(formData.get("assembly_type")||"ordinary"),
    starts_at:toIso(starts),
    location:String(formData.get("location")||"").trim()||null,
    mode:String(formData.get("mode")||"Présentiel"),
    quorum_percent:Number(formData.get("quorum_percent")||50),
    agenda,
    notice:String(formData.get("notice")||"").trim()||null,
    status:"draft",
    created_by:user.id,
  }).select("id").single();
  if(data?.id) redirect("/governance/assemblies/"+data.id);
}

export async function setAssemblyStatus(formData:FormData){
  const {supabase,role}=await ctx();
  if(!isStaff(role)) return;
  const id=String(formData.get("assembly_id")||"");
  const status=String(formData.get("status")||"");
  if(!id||!["draft","published","open","closed","archived"].includes(status)) return;
  const patch:any={status,updated_at:new Date().toISOString()};
  if(status==="published") patch.published_at=new Date().toISOString();
  if(status==="closed") patch.closed_at=new Date().toISOString();
  await supabase.from("assemblies").update(patch).eq("id",id);
  revalidatePath("/governance");
  revalidatePath("/governance/assemblies/"+id);
}

export async function saveAssemblyMinutes(formData:FormData){
  const {supabase,role}=await ctx();
  if(!isStaff(role)) return;
  const id=String(formData.get("assembly_id")||"");
  if(!id) return;
  await supabase.from("assemblies").update({
    minutes:String(formData.get("minutes")||"").trim()||null,
    minutes_published:formData.get("minutes_published")==="on",
    updated_at:new Date().toISOString(),
  }).eq("id",id);
  revalidatePath("/governance/assemblies/"+id);
}

export async function toggleAssemblyRsvp(formData:FormData){
  const {supabase,user}=await ctx();
  if(!user) return;
  const id=String(formData.get("assembly_id")||"");
  const status=String(formData.get("status")||"attending");
  if(!id||!["attending","not_attending"].includes(status)) return;
  await supabase.from("assembly_rsvps").upsert({
    assembly_id:id,user_id:user.id,status,updated_at:new Date().toISOString()
  },{onConflict:"assembly_id,user_id"});
  revalidatePath("/governance/assemblies/"+id);
}

export async function createProxy(formData:FormData){
  const {supabase,member}=await ctx();
  if(!member) return;
  const assemblyId=String(formData.get("assembly_id")||"");
  const holderId=String(formData.get("holder_member_id")||"");
  if(!assemblyId||!holderId||holderId===member.id) return;
  await supabase.from("assembly_proxies").upsert({
    assembly_id:assemblyId,
    grantor_member_id:member.id,
    holder_member_id:holderId,
    status:"pending",
    updated_at:new Date().toISOString(),
  },{onConflict:"assembly_id,grantor_member_id"});
  revalidatePath("/governance/assemblies/"+assemblyId);
}

export async function respondProxy(formData:FormData){
  const {supabase}=await ctx();
  const proxyId=String(formData.get("proxy_id")||"");
  const status=String(formData.get("status")||"");
  const assemblyId=String(formData.get("assembly_id")||"");
  if(!proxyId||!["accepted","rejected"].includes(status)) return;
  await supabase.rpc("respond_to_proxy",{p_proxy_id:proxyId,p_status:status});
  revalidatePath("/governance/assemblies/"+assemblyId);
}

export async function revokeProxy(formData:FormData){
  const {supabase}=await ctx();
  const proxyId=String(formData.get("proxy_id")||"");
  const assemblyId=String(formData.get("assembly_id")||"");
  if(!proxyId) return;
  await supabase.rpc("revoke_my_proxy",{p_proxy_id:proxyId});
  revalidatePath("/governance/assemblies/"+assemblyId);
}

export async function markAttendance(formData:FormData){
  const {supabase,user,role}=await ctx();
  if(!user||!isStaff(role)) return;
  const assemblyId=String(formData.get("assembly_id")||"");
  const memberId=String(formData.get("member_id")||"");
  const present=String(formData.get("present")||"true")==="true";
  if(!assemblyId||!memberId) return;
  await supabase.from("assembly_attendance").upsert({
    assembly_id:assemblyId,member_id:memberId,present,
    checked_in_at:new Date().toISOString(),checked_in_by:user.id
  },{onConflict:"assembly_id,member_id"});
  revalidatePath("/governance/assemblies/"+assemblyId);
}

export async function createMotion(formData:FormData){
  const {supabase,user,role}=await ctx();
  if(!user||!isStaff(role)) return;
  const assemblyId=String(formData.get("assembly_id")||"");
  const title=String(formData.get("title")||"").trim();
  if(!assemblyId||!title) return;
  await supabase.from("motions").insert({
    assembly_id:assemblyId,
    title,
    body:String(formData.get("body")||"").trim()||null,
    vote_method:String(formData.get("vote_method")||"secret"),
    majority_rule:String(formData.get("majority_rule")||"simple"),
    status:"draft",
    created_by:user.id,
  });
  revalidatePath("/governance/assemblies/"+assemblyId);
}

export async function setMotionStatus(formData:FormData){
  const {supabase,role}=await ctx();
  if(!isStaff(role)) return;
  const motionId=String(formData.get("motion_id")||"");
  const assemblyId=String(formData.get("assembly_id")||"");
  const status=String(formData.get("status")||"");
  if(!motionId||!["draft","open","closed","cancelled"].includes(status)) return;
  const patch:any={status};
  if(status==="open") patch.opens_at=new Date().toISOString();
  if(status==="closed") patch.closes_at=new Date().toISOString();
  await supabase.from("motions").update(patch).eq("id",motionId);
  revalidatePath("/governance/assemblies/"+assemblyId);
}

export async function castMotionVote(formData:FormData){
  const {supabase}=await ctx();
  const motionId=String(formData.get("motion_id")||"");
  const choice=String(formData.get("choice")||"");
  const assemblyId=String(formData.get("assembly_id")||"");
  if(!motionId||!["yes","no","abstain"].includes(choice)) return;
  await supabase.rpc("cast_motion_vote",{p_motion_id:motionId,p_choice:choice});
  revalidatePath("/governance/assemblies/"+assemblyId);
}

export async function createElection(formData:FormData){
  const {supabase,user,role}=await ctx();
  if(!user||!isStaff(role)) return;
  const title=String(formData.get("title")||"").trim();
  const starts=String(formData.get("starts_at")||"");
  const ends=String(formData.get("ends_at")||"");
  if(!title||!starts||!ends) return;
  const {data}=await supabase.from("elections").insert({
    title,
    description:String(formData.get("description")||"").trim()||null,
    starts_at:toIso(starts),
    ends_at:toIso(ends),
    rules:String(formData.get("rules")||"").trim()||null,
    status:"draft",
    created_by:user.id,
  }).select("id").single();
  if(data?.id) redirect("/governance/elections/"+data.id);
}

export async function addElectionPosition(formData:FormData){
  const {supabase,role}=await ctx();
  if(!isStaff(role)) return;
  const electionId=String(formData.get("election_id")||"");
  const title=String(formData.get("title")||"").trim();
  if(!electionId||!title) return;
  const {count}=await supabase.from("election_positions").select("*",{count:"exact",head:true}).eq("election_id",electionId);
  await supabase.from("election_positions").insert({election_id:electionId,title,seats:1,sort_order:(count||0)+1});
  revalidatePath("/governance/elections/"+electionId);
}

export async function nominateSelf(formData:FormData){
  const {supabase,member}=await ctx();
  if(!member) return;
  const positionId=String(formData.get("position_id")||"");
  const electionId=String(formData.get("election_id")||"");
  if(!positionId) return;
  await supabase.from("election_candidates").insert({
    position_id:positionId,
    member_id:member.id,
    statement:String(formData.get("statement")||"").trim()||null,
    status:"pending",
  });
  revalidatePath("/governance/elections/"+electionId);
}

export async function reviewCandidate(formData:FormData){
  const {supabase,role}=await ctx();
  if(!isStaff(role)) return;
  const candidateId=String(formData.get("candidate_id")||"");
  const electionId=String(formData.get("election_id")||"");
  const status=String(formData.get("status")||"");
  if(!candidateId||!["approved","rejected","withdrawn"].includes(status)) return;
  await supabase.from("election_candidates").update({status}).eq("id",candidateId);
  revalidatePath("/governance/elections/"+electionId);
}

export async function withdrawCandidacy(formData:FormData){
  const {supabase}=await ctx();
  const candidateId=String(formData.get("candidate_id")||"");
  const electionId=String(formData.get("election_id")||"");
  if(!candidateId) return;
  await supabase.from("election_candidates").update({status:"withdrawn"}).eq("id",candidateId);
  revalidatePath("/governance/elections/"+electionId);
}

export async function setElectionStatus(formData:FormData){
  const {supabase,role}=await ctx();
  if(!isStaff(role)) return;
  const id=String(formData.get("election_id")||"");
  const status=String(formData.get("status")||"");
  if(!id||!["draft","published","open","closed","cancelled"].includes(status)) return;
  const patch:any={status};
  if(status==="published") patch.published_at=new Date().toISOString();
  await supabase.from("elections").update(patch).eq("id",id);
  revalidatePath("/governance");
  revalidatePath("/governance/elections/"+id);
}

export async function castElectionVote(formData:FormData){
  const {supabase}=await ctx();
  const positionId=String(formData.get("position_id")||"");
  const candidateId=String(formData.get("candidate_id")||"");
  const electionId=String(formData.get("election_id")||"");
  if(!positionId||!candidateId) return;
  await supabase.rpc("cast_election_vote",{p_position_id:positionId,p_candidate_id:candidateId});
  revalidatePath("/governance/elections/"+electionId);
}
