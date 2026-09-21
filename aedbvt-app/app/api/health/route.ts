import { NextResponse } from "next/server";

export const dynamic="force-dynamic";

export async function GET(){
  const required={
    supabaseUrl:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabasePublishableKey:Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    appUrl:Boolean(process.env.NEXT_PUBLIC_APP_URL),
  };

  const ready=Object.values(required).every(Boolean);

  return NextResponse.json({
    status:ready?"ok":"configuration_required",
    app:"aedbvt",
    environment:process.env.VERCEL_ENV||process.env.NODE_ENV||"unknown",
    commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)||null,
    checks:required,
    timestamp:new Date().toISOString(),
  },{
    status:ready?200:503,
    headers:{"Cache-Control":"no-store"},
  });
}
