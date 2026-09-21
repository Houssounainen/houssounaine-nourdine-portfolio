import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/server-access";
import { csvFile, excelXmlFile, attachmentHeaders } from "@/lib/tabular-export";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  const {allowed,supabase}=await getAccessContext("finance_manage");
  if(!allowed) return new NextResponse("Accès refusé",{status:403});

  const {data:dues}=await supabase.from("member_dues_overview")
    .select("member_id,cycle_label,due_on,amount_due,waived_amount,paid_amount,balance,current_status")
    .order("starts_on",{ascending:false});

  const memberIds=[...new Set((dues||[]).map((d)=>d.member_id))];
  const {data:members}=memberIds.length
    ? await supabase.from("members").select("id,member_number,full_name,village").in("id",memberIds)
    : {data:[] as any[]};
  const memberMap=new Map((members||[]).map((m)=>[m.id,m]));

  const headers=["Exercice","Échéance","Numéro membre","Nom","Village","Montant dû","Remise","Payé","Reste","Statut"];
  const rows=(dues||[]).map((d)=>{
    const m=memberMap.get(d.member_id);
    return [
      d.cycle_label,
      d.due_on,
      m?.member_number||"",
      m?.full_name||"Membre",
      m?.village||"",
      Number(d.amount_due||0),
      Number(d.waived_amount||0),
      Number(d.paid_amount||0),
      Number(d.balance||0),
      d.current_status,
    ];
  });

  const format=new URL(request.url).searchParams.get("format")==="excel"?"excel":"csv";
  const stamp=new Date().toISOString().slice(0,10);

  if(format==="excel"){
    return new NextResponse(excelXmlFile("Cotisations",headers,rows),{
      headers:attachmentHeaders("aedbvt-cotisations-"+stamp+".xml","application/vnd.ms-excel; charset=utf-8"),
    });
  }
  return new NextResponse(csvFile(headers,rows),{
    headers:attachmentHeaders("aedbvt-cotisations-"+stamp+".csv","text/csv; charset=utf-8"),
  });
}
