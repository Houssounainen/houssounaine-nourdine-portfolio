import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { MemberImportWizard } from "@/components/member-import-wizard";

export default async function MemberImportPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user!.id).single();
  if(!can(profile?.role,"member_import")) notFound();

  return <section className="page">
    <header className="page-header"><div><span className="eyebrow">Registre · import contrôlé</span><h1>Importer des membres</h1></div><Link className="button secondary" href="/members">← Membres</Link></header>
    <div className="notice">L’import ajoute uniquement de nouvelles fiches. Les numéros membre ou emails déjà présents sont ignorés afin d’éviter tout écrasement silencieux.</div>
    <MemberImportWizard/>
  </section>;
}
