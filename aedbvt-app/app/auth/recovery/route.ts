import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value:string|null){
  if(!value||!value.startsWith("/")||value.startsWith("//")) return "/update-password";
  return value;
}

export async function GET(request:NextRequest){
  const {searchParams}=request.nextUrl;
  const code=searchParams.get("code");
  const tokenHash=searchParams.get("token_hash");
  const type=searchParams.get("type") as EmailOtpType|null;
  const next=safeNext(searchParams.get("next"));
  const supabase=await createClient();

  let error=null;
  if(code){
    ({error}=await supabase.auth.exchangeCodeForSession(code));
  }else if(tokenHash&&type){
    ({error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type}));
  }else{
    error={message:"Lien incomplet"} as any;
  }

  const target=request.nextUrl.clone();
  target.search="";
  target.pathname=error?"/forgot-password":next.split("?")[0];
  if(error){
    target.searchParams.set("error","link");
  }else{
    const query=next.includes("?")?next.slice(next.indexOf("?")+1):"";
    if(query){
      for(const [key,value] of new URLSearchParams(query)) target.searchParams.set(key,value);
    }
  }
  return NextResponse.redirect(target);
}
