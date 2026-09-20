import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToProfiles } from "@/lib/push";

export async function POST(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Non autorisé"},{status:401});

  const result=await sendPushToProfiles([user.id],{
    title:"AEDBVT · Test",
    body:"Les notifications push sont correctement activées sur cet appareil.",
    url:"/notifications",
    tag:"aedbvt-test",
  },"announcements");

  if(!result.configured) return NextResponse.json({error:"VAPID n’est pas configuré sur le serveur."},{status:503});
  if(result.attempted===0) return NextResponse.json({error:"Aucun appareil actif n’est enregistré."},{status:404});
  return NextResponse.json({ok:true,...result});
}
