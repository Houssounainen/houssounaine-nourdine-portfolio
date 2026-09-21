import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/server-access";
import { csvFile, excelXmlFile, attachmentHeaders } from "@/lib/tabular-export";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  const {allowed,supabase}=await getAccessContext("partners_manage");
  if(!allowed) return new NextResponse("Accès refusé",{status:403});

  const [{data:partners},{data:commitments}]=await Promise.all([
    supabase.from("partners").select("id,name,partner_type,status,contact_name,email,phone,address,website,created_at").order("name"),
    supabase.from("partner_commitments").select("partner_id,contribution_type,pledged_amount,received_amount,status"),
  ]);

  const summary=new Map<string,{pledged:number;received:number;inKind:number}>();
  for(const item of commitments||[]){
    const current=summary.get(item.partner_id)||{pledged:0,received:0,inKind:0};
    if(item.status!=="cancelled"){
      if(item.contribution_type==="in_kind") current.inKind+=1;
      else{
        current.pledged+=Number(item.pledged_amount||0);
        current.received+=Number(item.received_amount||0);
      }
    }
    summary.set(item.partner_id,current);
  }

  const headers=["Nom","Type","Statut","Contact","Email","Téléphone","Adresse","Site web","Engagé (Ar)","Reçu (Ar)","Apports en nature"];
  const rows=(partners||[]).map((p)=>{
    const s=summary.get(p.id)||{pledged:0,received:0,inKind:0};
    return [p.name,p.partner_type,p.status,p.contact_name||"",p.email||"",p.phone||"",p.address||"",p.website||"",s.pledged,s.received,s.inKind];
  });

  const format=new URL(request.url).searchParams.get("format")==="excel"?"excel":"csv";
  const stamp=new Date().toISOString().slice(0,10);
  if(format==="excel"){
    return new NextResponse(excelXmlFile("Partenaires",headers,rows),{
      headers:attachmentHeaders("aedbvt-partenaires-"+stamp+".xml","application/vnd.ms-excel; charset=utf-8"),
    });
  }
  return new NextResponse(csvFile(headers,rows),{
    headers:attachmentHeaders("aedbvt-partenaires-"+stamp+".csv","text/csv; charset=utf-8"),
  });
}
