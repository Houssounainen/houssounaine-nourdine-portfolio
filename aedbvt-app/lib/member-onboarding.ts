import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type ProvisionResult={
  ok:boolean;
  state:"invited"|"linked"|"skipped"|"config"|"error";
  userId?:string;
  error?:string;
};

function appOrigin(){
  return (process.env.NEXT_PUBLIC_APP_URL||"").replace(/\/$/,"");
}

function inviteRedirect(){
  const origin=appOrigin();
  if(!origin) return "";
  const next=encodeURIComponent("/update-password?mode=invite");
  return origin+"/auth/complete?next="+next;
}

async function findAuthUserByEmail(email:string){
  const admin=createAdminClient();
  if(!admin) return null;

  for(let page=1;page<=10;page++){
    const {data,error}=await admin.auth.admin.listUsers({page,perPage:100});
    if(error) return null;
    const match=data.users.find((user)=>user.email?.toLowerCase()===email.toLowerCase());
    if(match) return match;
    if(data.users.length<100) break;
  }
  return null;
}

async function sendAccessEmail(email:string){
  const admin=createAdminClient();
  const redirectTo=inviteRedirect();
  if(!admin||!redirectTo) return {ok:false,error:"Configuration d’invitation incomplète."};

  const {error}=await admin.auth.resetPasswordForEmail(email,{redirectTo});
  return error?{ok:false,error:error.message}:{ok:true as const};
}

export async function provisionMemberAccount(
  input:{
    memberId:string;
    email:string|null|undefined;
    fullName:string;
  },
  options:{resend?:boolean}={}
):Promise<ProvisionResult>{
  const email=(input.email||"").trim().toLowerCase();
  if(!email) return {ok:true,state:"skipped"};

  const admin=createAdminClient();
  const redirectTo=inviteRedirect();
  if(!admin||!redirectTo) return {ok:false,state:"config",error:"Configuration d’invitation incomplète."};

  const {data:member,error:memberError}=await admin
    .from("members")
    .select("id,profile_id,invitation_sent_at,account_activated_at")
    .eq("id",input.memberId)
    .maybeSingle();

  if(memberError||!member) return {ok:false,state:"error",error:"Membre introuvable."};

  if(member.profile_id){
    if(options.resend||!member.account_activated_at){
      const sent=await sendAccessEmail(email);
      if(!sent.ok) return {ok:false,state:"error",userId:member.profile_id,error:sent.error};
      await admin.from("members").update({invitation_sent_at:new Date().toISOString()}).eq("id",input.memberId);
      return {ok:true,state:"invited",userId:member.profile_id};
    }
    return {ok:true,state:"linked",userId:member.profile_id};
  }

  let authUser=await findAuthUserByEmail(email);
  let invited=false;
  let applicantPasswordAccount=false;

  if(!authUser){
    const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{
      redirectTo,
      data:{full_name:input.fullName,member_id:input.memberId},
    });

    if(error||!data.user){
      return {ok:false,state:"error",error:error?.message||"L’invitation n’a pas pu être envoyée."};
    }

    authUser=data.user;
    invited=true;
  }

  applicantPasswordAccount=Boolean(authUser?.user_metadata?.application_pending);

  const {data:profile}=await admin
    .from("profiles")
    .select("id,role")
    .eq("id",authUser.id)
    .maybeSingle();

  if(profile){
    await admin.from("profiles").update({
      full_name:input.fullName,
      active:true,
    }).eq("id",authUser.id);
  }else{
    await admin.from("profiles").insert({
      id:authUser.id,
      full_name:input.fullName,
      role:"membre",
      active:true,
    });
  }

  if(applicantPasswordAccount){
    await admin.auth.admin.updateUserById(authUser.id,{
      user_metadata:{...(authUser.user_metadata||{}),application_pending:false,full_name:input.fullName,member_id:input.memberId},
    });
  }

  const {error:linkError}=await admin.from("members").update({
    profile_id:authUser.id,
    invitation_sent_at:invited?new Date().toISOString():member.invitation_sent_at,
  }).eq("id",input.memberId);

  if(linkError) return {ok:false,state:"error",error:"Le compte existe mais n’a pas pu être lié au membre."};

  if(applicantPasswordAccount){
    return {ok:true,state:"linked",userId:authUser.id};
  }

  if(!invited){
    const sent=await sendAccessEmail(email);
    if(sent.ok){
      await admin.from("members").update({invitation_sent_at:new Date().toISOString()}).eq("id",input.memberId);
      invited=true;
    }else{
      return {ok:false,state:"error",userId:authUser.id,error:sent.error};
    }
  }

  return {ok:true,state:invited?"invited":"linked",userId:authUser.id};
}
