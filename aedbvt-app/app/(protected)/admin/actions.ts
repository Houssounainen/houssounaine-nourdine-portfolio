"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccessContext } from "@/lib/server-access";
import type { AppRole } from "@/lib/access";

const allowedRoles:AppRole[]=["admin","bureau","tresorier","secretaire","membre"];

async function requireAdmin(){
  const context=await getAccessContext("admin_manage");
  return {
    allowed:context.allowed,
    admin:context.allowed?createAdminClient():null,
    user:context.user,
  };
}

async function sendInvitation({
  email,
  fullName,
  role,
  memberId,
}:{email:string;fullName:string;role:AppRole;memberId?:string|null}){
  const {allowed,admin}=await requireAdmin();
  if(!allowed||!admin||!email||!fullName||!allowedRoles.includes(role)) return false;

  const appUrl=(process.env.NEXT_PUBLIC_APP_URL||"").replace(/\/$/,"");
  if(!appUrl) return false;

  const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{
    data:{full_name:fullName},
    redirectTo:appUrl+"/auth/complete?next="+encodeURIComponent("/update-password?mode=invite"),
  });
  if(error||!data.user) return false;

  await admin.from("profiles").upsert({
    id:data.user.id,
    full_name:fullName,
    role,
    active:true,
  });

  if(memberId){
    await admin.from("members").update({
      profile_id:data.user.id,
      email,
      invitation_sent_at:new Date().toISOString(),
    }).eq("id",memberId);
  }

  return true;
}

export async function inviteUser(formData: FormData) {
  const email=String(formData.get("email")||"").trim().toLowerCase();
  const fullName=String(formData.get("full_name")||"").trim();
  const role=String(formData.get("role")||"membre") as AppRole;
  const memberId=String(formData.get("member_id")||"")||null;

  const sent=await sendInvitation({email,fullName,role,memberId});
  if(!sent) return;

  revalidatePath("/admin");
  revalidatePath("/members");
}

export async function inviteMemberAccount(formData:FormData){
  const {allowed,admin}=await requireAdmin();
  if(!allowed||!admin) return;

  const memberId=String(formData.get("member_id")||"");
  if(!memberId) return;

  const {data:member}=await admin.from("members")
    .select("id,full_name,email,profile_id")
    .eq("id",memberId)
    .maybeSingle();

  if(!member||member.profile_id||!member.email) return;

  const sent=await sendInvitation({
    email:String(member.email).trim().toLowerCase(),
    fullName:member.full_name,
    role:"membre",
    memberId:member.id,
  });

  if(!sent) return;
  revalidatePath("/admin");
  revalidatePath("/members");
}

export async function updateUserAccess(formData: FormData) {
  const { allowed, admin, user } = await requireAdmin();
  if (!allowed || !admin || !user) return;

  const profileId = String(formData.get("profile_id") || "");
  const role = String(formData.get("role") || "membre") as AppRole;
  const active = String(formData.get("active") || "true") === "true";
  if (!profileId || !allowedRoles.includes(role)) return;
  if (profileId === user.id && (!active || role !== "admin")) return;

  await admin.from("profiles").update({ role, active, updated_at: new Date().toISOString() }).eq("id", profileId);
  revalidatePath("/admin");
}
