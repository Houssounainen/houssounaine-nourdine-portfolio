import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { simplePdf } from "@/lib/pdf";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return new NextResponse("Non autorisé",{status:401});

  const {data:version}=await supabase.from("governance_document_versions")
    .select("id,version_label,title,body,change_summary,status,checksum,approved_at,published_at,governance_documents(category)")
    .eq("id",id).maybeSingle();

  if(!version) return new NextResponse("Version introuvable",{status:404});
  const doc=Array.isArray(version.governance_documents)?version.governance_documents[0]:version.governance_documents;
  const rows=[
    "Association des Etudiants de Darsalama et Bandrani-Vouani a Tulear (AEDBVT)",
    "",
    (doc?.category||"Document institutionnel")+" - version "+version.version_label,
    "Statut : "+version.status,
    version.approved_at ? "Approuvee le : "+new Date(version.approved_at).toLocaleDateString("fr-FR") : "",
    version.published_at ? "Publiee le : "+new Date(version.published_at).toLocaleDateString("fr-FR") : "",
    version.change_summary ? "Resume des changements : "+version.change_summary : "",
    "",
    version.body,
    "",
    "Empreinte SHA-256 : "+(version.checksum||"-"),
    "",
    "Document genere depuis le registre institutionnel AEDBVT."
  ].filter(Boolean);

  const pdf=simplePdf(version.title,rows);
  const safe=(version.title+"-v"+version.version_label).replace(/[^a-zA-Z0-9._-]+/g,"-");
  return new NextResponse(pdf as BodyInit,{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":'attachment; filename="'+safe+'.pdf"',
    "Cache-Control":"private, no-store"
  }});
}
