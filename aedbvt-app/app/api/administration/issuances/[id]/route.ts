import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { simplePdf } from "@/lib/pdf";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return new NextResponse("Non autorisé",{status:401});

  const {data:item}=await supabase.from("administrative_issuances")
    .select("id,number,document_type,subject,purpose,body_snapshot,status,secretary_approved_at,presidency_approved_at,issued_at,verification_token,members(full_name,member_number,village)")
    .eq("id",id).maybeSingle();
  if(!item) return new NextResponse("Document introuvable",{status:404});

  const member=Array.isArray(item.members)?item.members[0]:item.members;
  const rows=[
    "Association des Etudiants de Darsalama et Bandrani-Vouani a Tulear (AEDBVT)",
    "",
    "Reference : "+item.number,
    "Type : "+item.document_type,
    member?"Beneficiaire : "+member.full_name:"",
    member?.member_number?"Numero membre : "+member.member_number:"",
    member?.village?"Village : "+member.village:"",
    item.issued_at?"Delivre le : "+new Date(item.issued_at).toLocaleDateString("fr-FR"):"",
    "",
    item.body_snapshot,
    "",
    item.purpose?"Usage declare : "+item.purpose:"",
    item.secretary_approved_at?"Validation secretariat : oui":"",
    item.presidency_approved_at?"Validation presidence / Bureau : oui":"",
    "Statut : "+item.status,
    item.status==="issued"?"Jeton de verification : "+item.verification_token:"",
    "",
    "La validation affichée correspond au circuit interne AEDBVT et ne constitue pas une signature électronique qualifiée."
  ].filter(Boolean);

  const pdf=simplePdf(item.subject,rows);
  return new NextResponse(pdf as BodyInit,{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":'attachment; filename="'+item.number+'.pdf"',
    "Cache-Control":"private, no-store"
  }});
}
