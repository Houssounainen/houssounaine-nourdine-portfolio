import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/server-access";
import { csvFile, excelXmlFile, attachmentHeaders } from "@/lib/tabular-export";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  const {allowed,supabase}=await getAccessContext("finance_manage");
  if(!allowed) return new NextResponse("Accès refusé",{status:403});

  const [{data:ledger},{data:categories},{data:accounts}]=await Promise.all([
    supabase.from("finance_ledger").select("entry_date,source_type,reference,label,income,expense,category_id,account_id").order("entry_date",{ascending:false}),
    supabase.from("finance_categories").select("id,code,name"),
    supabase.from("cash_accounts").select("id,name"),
  ]);

  const categoryMap=new Map((categories||[]).map((c)=>[c.id,c]));
  const accountMap=new Map((accounts||[]).map((a)=>[a.id,a]));

  const headers=["Date","Type","Référence","Libellé","Catégorie","Compte","Entrée","Sortie"];
  const rows=(ledger||[]).map((row)=>[
    row.entry_date,
    row.source_type,
    row.reference||"",
    row.label,
    row.category_id?(categoryMap.get(row.category_id)?.name||""):"",
    row.account_id?(accountMap.get(row.account_id)?.name||""):"",
    Number(row.income||0),
    Number(row.expense||0),
  ]);

  const format=new URL(request.url).searchParams.get("format")==="excel"?"excel":"csv";
  const stamp=new Date().toISOString().slice(0,10);

  if(format==="excel"){
    return new NextResponse(excelXmlFile("Grand livre",headers,rows),{
      headers:attachmentHeaders("aedbvt-grand-livre-"+stamp+".xml","application/vnd.ms-excel; charset=utf-8"),
    });
  }
  return new NextResponse(csvFile(headers,rows),{
    headers:attachmentHeaders("aedbvt-grand-livre-"+stamp+".csv","text/csv; charset=utf-8"),
  });
}
