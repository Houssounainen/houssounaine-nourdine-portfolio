import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/server-access";
import { can } from "@/lib/access";
import { simplePdf } from "@/lib/pdf";
import { attachmentHeaders } from "@/lib/tabular-export";

export const dynamic="force-dynamic";

export async function GET(){
  const {allowed,supabase,role}=await getAccessContext("analytics_view");
  if(!allowed) return new NextResponse("Accès refusé",{status:403});

  const finance=can(role,"finance_manage");
  const [{data:members},{data:tasks},{data:events},{data:meetings}]=await Promise.all([
    supabase.from("members").select("id,village,profile_id,account_activated_at").eq("status","active"),
    supabase.from("operational_tasks").select("status,due_on"),
    supabase.from("events").select("id").eq("published",true),
    supabase.from("meetings").select("id").eq("published",true),
  ]);

  const active=members||[];
  const activated=active.filter((m)=>m.account_activated_at).length;
  const villageCounts=new Map<string,number>();
  active.forEach((m)=>villageCounts.set(m.village||"Non renseigné",(villageCounts.get(m.village||"Non renseigné")||0)+1));

  const allTasks=tasks||[];
  const open=allTasks.filter((t)=>!["done","cancelled"].includes(t.status)).length;
  const today=new Date().toISOString().slice(0,10);
  const overdue=allTasks.filter((t)=>!["done","cancelled"].includes(t.status)&&t.due_on&&t.due_on<today).length;

  const rows=[
    "Date du rapport : "+new Date().toLocaleString("fr-FR"),
    "",
    "MEMBRES",
    "Membres actifs : "+active.length,
    "Comptes activés : "+activated,
    "Taux d’activation : "+(active.length?Math.round(activated/active.length*100):0)+" %",
    ...[...villageCounts.entries()].map(([name,count])=>"Village "+name+" : "+count),
    "",
    "PILOTAGE",
    "Actions ouvertes : "+open,
    "Actions en retard : "+overdue,
    "Événements publiés : "+(events?.length||0),
    "Réunions publiées : "+(meetings?.length||0),
  ];

  if(finance){
    const [{data:dues},{data:ledger}]=await Promise.all([
      supabase.from("member_dues_overview").select("amount_due,waived_amount,paid_amount,balance,current_status,cycle_status").eq("cycle_status","open"),
      supabase.from("finance_ledger").select("income,expense"),
    ]);
    const expected=(dues||[]).reduce((sum,row)=>sum+Math.max(0,Number(row.amount_due)-Number(row.waived_amount)),0);
    const collected=(dues||[]).reduce((sum,row)=>sum+Number(row.paid_amount||0),0);
    const income=(ledger||[]).reduce((sum,row)=>sum+Number(row.income||0),0);
    const expense=(ledger||[]).reduce((sum,row)=>sum+Number(row.expense||0),0);
    rows.push(
      "",
      "FINANCES",
      "Cotisations attendues : "+expected.toLocaleString("fr-FR")+" Ar",
      "Cotisations encaissées : "+collected.toLocaleString("fr-FR")+" Ar",
      "Taux de cotisation : "+(expected?Math.round(collected/expected*100):0)+" %",
      "Recettes enregistrées : "+income.toLocaleString("fr-FR")+" Ar",
      "Dépenses enregistrées : "+expense.toLocaleString("fr-FR")+" Ar",
      "Solde comptable : "+(income-expense).toLocaleString("fr-FR")+" Ar"
    );
  }

  const pdf=simplePdf("Rapport synthétique AEDBVT",rows);
  const stamp=new Date().toISOString().slice(0,10);
  return new NextResponse(pdf as BodyInit,{
    headers:attachmentHeaders("aedbvt-rapport-"+stamp+".pdf","application/pdf"),
  });
}
