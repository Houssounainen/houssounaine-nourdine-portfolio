import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { simplePdf } from "@/lib/pdf";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return new NextResponse("Non autorisé",{status:401});

  const {data:d}=await supabase.from("decision_register")
    .select("id,number,decision_type,title,summary,outcome,decision_date,assembly_id,motion_id,election_id,document_id")
    .eq("id",id).maybeSingle();

  if(!d) return new NextResponse("Décision introuvable",{status:404});

  const rows=[
    "Association des Etudiants de Darsalama et Bandrani-Vouani a Tulear (AEDBVT)",
    "",
    "Reference : "+d.number,
    "Date : "+new Date(d.decision_date).toLocaleDateString("fr-FR"),
    "Type : "+d.decision_type,
    "Issue : "+d.outcome,
    "",
    d.summary||"Aucun résumé.",
    "",
    d.assembly_id ? "Assemblée liée : "+d.assembly_id : "",
    d.election_id ? "Élection liée : "+d.election_id : "",
    d.document_id ? "Document lié : "+d.document_id : "",
    "",
    "Extrait du registre des décisions AEDBVT."
  ].filter(Boolean);

  const pdf=simplePdf(d.title,rows);
  return new NextResponse(pdf as BodyInit,{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":'attachment; filename="'+d.number+'.pdf"',
    "Cache-Control":"private, no-store"
  }});
}
