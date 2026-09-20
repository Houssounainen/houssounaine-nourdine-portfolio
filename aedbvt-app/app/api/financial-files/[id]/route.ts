import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return new NextResponse("Non autorisé",{status:401});

  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
  if(!["admin","bureau","tresorier"].includes(profile?.role||"")) return new NextResponse("Accès refusé",{status:403});

  const {data:meta}=await supabase.from("financial_attachments")
    .select("id,file_name,storage_path,content_type")
    .eq("id",id).maybeSingle();
  if(!meta) return new NextResponse("Pièce introuvable",{status:404});

  const {data,error}=await supabase.storage.from("financial-documents").download(meta.storage_path);
  if(error||!data) return new NextResponse("Fichier indisponible",{status:404});

  return new NextResponse(await data.arrayBuffer(),{headers:{
    "Content-Type":meta.content_type||"application/octet-stream",
    "Content-Disposition":'attachment; filename="'+meta.file_name.replace(/"/g,"")+'"',
    "Cache-Control":"private, no-store"
  }});
}
