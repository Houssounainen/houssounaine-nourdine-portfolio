import { NextResponse } from "next/server";

export const dynamic="force-dynamic";

export async function GET(){
  const packageName=(process.env.AEDBVT_ANDROID_PACKAGE_ID||"mg.aedbvt.tulear").trim();
  const fingerprints=(process.env.ANDROID_SHA256_FINGERPRINTS||"")
    .split(",")
    .map((value)=>value.trim())
    .filter(Boolean);

  const body=fingerprints.length?[
    {
      relation:["delegate_permission/common.handle_all_urls"],
      target:{
        namespace:"android_app",
        package_name:packageName,
        sha256_cert_fingerprints:fingerprints,
      },
    },
  ]:[];

  return NextResponse.json(body,{
    headers:{
      "Cache-Control":"public, max-age=300, must-revalidate",
      "Content-Type":"application/json; charset=utf-8",
    },
  });
}
