import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { simplePdf } from "@/lib/pdf";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return new NextResponse("Non autorisé",{status:401});

  const {data:item}=await supabase.from("correspondence_register")
    .select("id,number,direction,category,subject,correspondent_name,correspondent_contact,body,received_on,sent_on,status,notes,secretary_approved_at,presidency_approved_at,dispatched_at")
    .eq("id",id).maybeSingle();
  if(!item) return new NextResponse("Courrier introuvable",{status:404});

  const rows=[
    "Association des Etudiants de Darsalama et Bandrani-Vouani a Tulear (AEDBVT)",
    "",
    "REGISTRE DU COURRIER",
    "Reference : "+item.number,
    "Sens : "+(item.direction==="incoming"?"Entrant":"Sortant"),
    "Categorie : "+item.category,
    item.received_on?"Recu le : "+new Date(item.received_on+"T12:00:00").toLocaleDateString("fr-FR"):"",
    item.sent_on?"Envoye le : "+new Date(item.sent_on+"T12:00:00").toLocaleDateString("fr-FR"):"",
    "Correspondant : "+item.correspondent_name,
    item.correspondent_contact?"Coordonnees : "+item.correspondent_contact:"",
    "",
    item.body||"Aucun contenu detaille.",
    "",
    item.secretary_approved_at?"Validation secretariat : oui":"",
    item.presidency_approved_at?"Validation presidence / Bureau : oui":"",
    "Statut : "+item.status,
    item.notes?"Note interne : "+item.notes:"",
  ].filter(Boolean);

  const pdf=simplePdf(item.subject,rows);
  return new NextResponse(pdf as BodyInit,{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":'attachment; filename="'+item.number+'.pdf"',
    "Cache-Control":"private, no-store"
  }});
}
