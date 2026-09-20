import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { simplePdf } from "@/lib/pdf";

const money=(value:number)=>value.toLocaleString("fr-FR")+" Ar";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return new NextResponse("Non autorisé",{status:401});

  const [{data:invoice},{data:items},{data:payments}]=await Promise.all([
    supabase.from("invoices").select("id,number,recipient_name,recipient_email,recipient_phone,recipient_address,subject,total,status,issued_at,due_at,notes").eq("id",id).maybeSingle(),
    supabase.from("invoice_items").select("position,description,quantity,unit_price").eq("invoice_id",id).order("position"),
    supabase.from("invoice_payments").select("amount,paid_at,receipt_number").eq("invoice_id",id)
  ]);
  if(!invoice) return new NextResponse("Facture introuvable",{status:404});

  const paid=(payments||[]).reduce((sum,p)=>sum+Number(p.amount||0),0);
  const remaining=Math.max(0,Number(invoice.total||0)-paid);

  const rows=[
    "Association des Etudiants de Darsalama et Bandrani-Vouani a Tulear (AEDBVT)",
    "",
    "FACTURE : "+invoice.number,
    "Date : "+new Date(invoice.issued_at).toLocaleDateString("fr-FR"),
    invoice.due_at ? "Echeance : "+new Date(invoice.due_at).toLocaleDateString("fr-FR") : "",
    "Destinataire : "+invoice.recipient_name,
    invoice.recipient_address ? "Adresse : "+invoice.recipient_address : "",
    [invoice.recipient_email,invoice.recipient_phone].filter(Boolean).join(" | "),
    "Objet : "+invoice.subject,
    "",
    ...(items||[]).map((item)=>item.description+" | "+Number(item.quantity).toLocaleString("fr-FR")+" x "+money(Number(item.unit_price))+" = "+money(Number(item.quantity)*Number(item.unit_price))),
    "",
    "TOTAL : "+money(Number(invoice.total||0)),
    "DEJA REGLE : "+money(paid),
    "RESTE A PAYER : "+money(remaining),
    invoice.notes ? "Note : "+invoice.notes : "",
    "",
    "Statut : "+invoice.status
  ].filter(Boolean);

  const pdf=simplePdf("Facture AEDBVT",rows);
  return new NextResponse(pdf as BodyInit,{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":'attachment; filename="'+invoice.number+'.pdf"',
    "Cache-Control":"private, no-store"
  }});
}
