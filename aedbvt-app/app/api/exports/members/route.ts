import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/server-access";
import { csvFile, excelXmlFile, attachmentHeaders } from "@/lib/tabular-export";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  const {allowed,supabase}=await getAccessContext("members_manage");
  if(!allowed) return new NextResponse("Accès refusé",{status:403});

  const {data:members}=await supabase.from("members")
    .select("member_number,full_name,village,program,study_level,phone,email,status,joined_at,profile_id,invitation_sent_at,account_activated_at")
    .order("full_name");

  const headers=["Numéro","Nom complet","Village","Filière","Niveau","Téléphone","Email","Statut","Adhésion","Compte"];
  const rows=(members||[]).map((m)=>[
    m.member_number||"",
    m.full_name,
    m.village||"",
    m.program||"",
    m.study_level||"",
    m.phone||"",
    m.email||"",
    m.status,
    m.joined_at||"",
    m.account_activated_at?"Activé":m.profile_id?"Invité":"À inviter",
  ]);

  const format=new URL(request.url).searchParams.get("format")==="excel"?"excel":"csv";
  const stamp=new Date().toISOString().slice(0,10);

  if(format==="excel"){
    return new NextResponse(excelXmlFile("Membres",headers,rows),{
      headers:attachmentHeaders("aedbvt-membres-"+stamp+".xml","application/vnd.ms-excel; charset=utf-8"),
    });
  }

  return new NextResponse(csvFile(headers,rows),{
    headers:attachmentHeaders("aedbvt-membres-"+stamp+".csv","text/csv; charset=utf-8"),
  });
}
