import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/server-access";
import { attachmentHeaders } from "@/lib/tabular-export";

export const dynamic="force-dynamic";

const tables=[
  "members",
  "payments",
  "expenses",
  "finance_categories",
  "cash_accounts",
  "budget_years",
  "budget_lines",
  "membership_dues_cycles",
  "member_dues",
  "quotes",
  "quote_items",
  "invoices",
  "invoice_items",
  "invoice_payments",
  "member_service_requests",
  "governance_documents",
  "assemblies",
  "decision_register",
  "operational_tasks",
  "correspondence_register",
  "administrative_issuances",
  "internal_broadcasts",
  "asset_categories",
  "assets",
  "asset_events",
  "asset_maintenance",
  "stock_items",
  "stock_movements",
  "partners",
  "partner_commitments",
  "partner_receipts",
] as const;

export async function GET(){
  const {allowed,supabase}=await getAccessContext("admin_manage");
  if(!allowed) return new NextResponse("Accès refusé",{status:403});

  const snapshot:Record<string,unknown>={
    generated_at:new Date().toISOString(),
    app:"AEDBVT",
    format_version:1,
    note:"Snapshot métier. Auth Supabase, mots de passe, secrets et fichiers binaires exclus.",
  };

  for(const table of tables){
    const {data,error}=await supabase.from(table).select("*");
    snapshot[table]=error?{error:error.message}:data||[];
  }

  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  return new NextResponse(JSON.stringify(snapshot,null,2),{
    headers:attachmentHeaders("aedbvt-snapshot-"+stamp+".json","application/json; charset=utf-8"),
  });
}
