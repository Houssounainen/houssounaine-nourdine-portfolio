import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { simplePdf } from "@/lib/pdf";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return new NextResponse("Non autorisé",{status:401});

  const [{data:profile},{data:a},quorumResult]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user.id).single(),
    supabase.from("assemblies").select("id,title,assembly_type,starts_at,location,mode,status,agenda,minutes,minutes_published,quorum_percent").eq("id",id).maybeSingle(),
    supabase.rpc("get_assembly_quorum",{p_assembly_id:id})
  ]);

  if(!a) return new NextResponse("Assemblée introuvable",{status:404});
  const staff=["admin","bureau","tresorier","secretaire"].includes(profile?.role||"");
  if(!staff&&!a.minutes_published) return new NextResponse("Procès-verbal non publié",{status:403});

  const q=Array.isArray(quorumResult.data)?quorumResult.data[0]:quorumResult.data;
  const agenda=Array.isArray(a.agenda)?a.agenda:[];
  const rows=[
    "Association des Etudiants de Darsalama et Bandrani-Vouani a Tulear (AEDBVT)",
    "",
    "Type : "+(a.assembly_type==="extraordinary"?"Assemblée générale extraordinaire":"Assemblée générale ordinaire"),
    "Date : "+new Date(a.starts_at).toLocaleString("fr-FR"),
    "Lieu / mode : "+(a.location||a.mode),
    "Quorum configure : "+Number(a.quorum_percent)+"%",
    "Membres actifs eligibles : "+(q?.eligible||0),
    "Presents : "+(q?.present||0),
    "Representes : "+(q?.represented||0),
    "Total compte : "+(q?.total_counted||0),
    "Quorum atteint : "+(q?.met?"Oui":"Non"),
    "",
    "ORDRE DU JOUR",
    ...agenda.map((p:string,i:number)=>(i+1)+". "+p),
    "",
    "PROCES-VERBAL",
    a.minutes||"Aucun procès-verbal rédigé.",
    "",
    "Document généré depuis l’application AEDBVT."
  ];

  const pdf=simplePdf("Procès-verbal - "+a.title,rows);
  const safe=("PV-"+a.title).replace(/[^a-zA-Z0-9._-]+/g,"-");
  return new NextResponse(pdf as BodyInit,{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":'attachment; filename="'+safe+'.pdf"',
    "Cache-Control":"private, no-store"
  }});
}
