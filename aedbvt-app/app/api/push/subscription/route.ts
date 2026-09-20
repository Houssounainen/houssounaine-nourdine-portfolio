import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Non autorisé"},{status:401});

  const admin=createAdminClient();
  if(!admin) return NextResponse.json({error:"Configuration serveur push incomplète"},{status:503});

  let body:any;
  try{ body=await request.json(); }catch{ return NextResponse.json({error:"Requête invalide"},{status:400}); }

  const endpoint=String(body?.endpoint||"");
  const p256dh=String(body?.keys?.p256dh||"");
  const auth=String(body?.keys?.auth||"");
  if(!endpoint||!p256dh||!auth) return NextResponse.json({error:"Abonnement push incomplet"},{status:400});

  const userAgent=request.headers.get("user-agent")||null;
  const platform=String(body?.platform||"").slice(0,80)||null;

  const {error}=await admin.from("push_subscriptions").upsert({
    profile_id:user.id,
    endpoint,
    p256dh,
    auth,
    user_agent:userAgent,
    platform,
    enabled:true,
    last_seen_at:new Date().toISOString(),
    updated_at:new Date().toISOString(),
  },{onConflict:"endpoint"});

  if(error) return NextResponse.json({error:error.message},{status:500});

  await admin.from("notification_preferences").upsert({profile_id:user.id},{onConflict:"profile_id"});
  return NextResponse.json({ok:true});
}

export async function DELETE(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Non autorisé"},{status:401});

  let body:any={};
  try{ body=await request.json(); }catch{}
  const endpoint=String(body?.endpoint||"");
  if(!endpoint) return NextResponse.json({error:"Endpoint manquant"},{status:400});

  const admin=createAdminClient();
  const query=admin||supabase;
  const {error}=await query.from("push_subscriptions").delete().eq("profile_id",user.id).eq("endpoint",endpoint);
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true});
}
