import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { simplePdf } from "@/lib/pdf";

const money=(value:number)=>value.toLocaleString("fr-FR")+" Ar";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return new NextResponse("Non autorisé",{status:401});

  const [{data:quote},{data:items}]=await Promise.all([
    supabase.from("quotes").select("id,number,recipient_name,recipient_email,recipient_phone,recipient_address,subject,total,status,issued_at,valid_until,notes").eq("id",id).maybeSingle(),
    supabase.from("quote_items").select("position,description,quantity,unit_price").eq("quote_id",id).order("position")
  ]);
  if(!quote) return new NextResponse("Devis introuvable",{status:404});

  const rows=[
    "Association des Etudiants de Darsalama et Bandrani-Vouani a Tulear (AEDBVT)",
    "",
    "DEVIS : "+quote.number,
    "Date : "+new Date(quote.issued_at).toLocaleDateString("fr-FR"),
    quote.valid_until ? "Valable jusqu'au : "+new Date(quote.valid_until).toLocaleDateString("fr-FR") : "",
    "Destinataire : "+quote.recipient_name,
    quote.recipient_address ? "Adresse : "+quote.recipient_address : "",
    [quote.recipient_email,quote.recipient_phone].filter(Boolean).join(" | "),
    "Objet : "+quote.subject,
    "",
    ...(items||[]).map((item)=>item.description+" | "+Number(item.quantity).toLocaleString("fr-FR")+" x "+money(Number(item.unit_price))+" = "+money(Number(item.quantity)*Number(item.unit_price))),
    "",
    "TOTAL : "+money(Number(quote.total||0)),
    quote.notes ? "Note : "+quote.notes : "",
    "",
    "Statut : "+quote.status
  ].filter(Boolean);

  const pdf=simplePdf("Devis AEDBVT",rows);
  return new NextResponse(pdf as BodyInit,{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":'attachment; filename="'+quote.number+'.pdf"',
    "Cache-Control":"private, no-store"
  }});
}
