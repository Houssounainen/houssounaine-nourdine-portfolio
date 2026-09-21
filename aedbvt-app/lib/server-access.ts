import { createClient } from "@/lib/supabase/server";
import { can, type Capability } from "@/lib/access";

export async function getAccessContext(capability?:Capability){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  if(!user){
    return {allowed:false as const,supabase,user:null,profile:null,role:null};
  }

  const {data:profile}=await supabase.from("profiles")
    .select("id,role,active,full_name")
    .eq("id",user.id)
    .maybeSingle();

  const active=profile?.active!==false;
  const allowed=Boolean(profile&&active&&(!capability||can(profile.role,capability)));

  return {
    allowed,
    supabase,
    user,
    profile,
    role:profile?.role||null,
  };
}
