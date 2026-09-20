import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { simplePdf } from "@/lib/pdf";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return new NextResponse("Non autorisé",{status:401});

  const {data:payment}=await supabase.from("invoice_payments")
    .select("id,amount,method,external_reference,receipt_number,paid_at,notes,invoices(number,recipient_name,subject)")
    .eq("id",id).maybeSingle();
  if(!payment) return new NextResponse("Reçu introuvable",{status:404});

  const invoice=Array.isArray(payment.invoices)?payment.invoices[0]:payment.invoices;
  const rows=[
    "Association des Etudiants de Darsalama et Bandrani-Vouani a Tulear (AEDBVT)",
    "",
    "RECU : "+payment.receipt_number,
    "Date : "+new Date(payment.paid_at).toLocaleDateString("fr-FR"),
    "Facture : "+(invoice?.number||"-"),
    "Destinataire : "+(invoice?.recipient_name||"-"),
    "Objet : "+(invoice?.subject||"-"),
    "Montant reçu : "+Number(payment.amount).toLocaleString("fr-FR")+" Ar",
    "Moyen : "+payment.method,
    "Référence externe : "+(payment.external_reference||"-"),
    payment.notes ? "Note : "+payment.notes : "",
    "",
    "Ce reçu interne atteste l'enregistrement du règlement dans l'application AEDBVT."
  ].filter(Boolean);

  const pdf=simplePdf("Reçu de règlement AEDBVT",rows);
  return new NextResponse(pdf as BodyInit,{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":'attachment; filename="'+payment.receipt_number+'.pdf"',
    "Cache-Control":"private, no-store"
  }});
}
