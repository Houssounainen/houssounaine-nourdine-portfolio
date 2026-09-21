import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/server-access";
import { simplePdf } from "@/lib/pdf";
import { attachmentHeaders } from "@/lib/tabular-export";

export const dynamic="force-dynamic";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {allowed,supabase}=await getAccessContext("finance_manage");
  if(!allowed) return new NextResponse("Accès refusé",{status:403});

  const {data:receipt}=await supabase.from("partner_receipts")
    .select("id,amount,method,external_reference,receipt_number,received_at,notes,partners(name,partner_type,contact_name),partner_commitments(title,contribution_type)")
    .eq("id",id)
    .maybeSingle();

  if(!receipt) return new NextResponse("Reçu introuvable",{status:404});
  const partner=Array.isArray(receipt.partners)?receipt.partners[0]:receipt.partners;
  const commitment=Array.isArray(receipt.partner_commitments)?receipt.partner_commitments[0]:receipt.partner_commitments;

  const rows=[
    "Reçu : "+(receipt.receipt_number||receipt.id),
    "Date : "+new Date(receipt.received_at).toLocaleString("fr-FR"),
    "",
    "Partenaire : "+(partner?.name||"Partenaire"),
    partner?.contact_name?"Contact : "+partner.contact_name:"",
    "Objet : "+(commitment?.title||"Contribution / soutien"),
    "Montant reçu : "+Number(receipt.amount).toLocaleString("fr-FR")+" Ar",
    "Moyen : "+receipt.method,
    receipt.external_reference?"Référence : "+receipt.external_reference:"",
    receipt.notes?"Note : "+receipt.notes:"",
    "",
    "Ce reçu confirme l’encaissement enregistré dans la trésorerie AEDBVT.",
  ].filter(Boolean);

  const pdf=simplePdf("Reçu partenaire AEDBVT",rows);
  return new NextResponse(pdf as BodyInit,{
    headers:attachmentHeaders((receipt.receipt_number||"recu-partenaire")+".pdf","application/pdf"),
  });
}
