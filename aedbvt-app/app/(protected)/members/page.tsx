import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { addMember } from "./actions";
import { MemberDirectory } from "@/components/member-directory";

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("members").select("id,member_number,full_name,village,program,study_level,phone,email,status,profile_id,invitation_sent_at,account_activated_at").order("full_name"),
  ]);
  if (!can(profile?.role,"members_manage")) notFound();

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Registre</span><h1>Membres</h1></div><div className="page-header-actions"><span className="status-pill">{members?.length || 0} enregistrements</span>{can(profile?.role,"member_import")&&<Link className="button secondary" href="/members/import">Importer un CSV</Link>}</div></header>

      <form action={addMember} className="panel form-grid">
        <h2>Nouveau membre</h2>
        <label>Nom complet<input name="full_name" required /></label>
        <label>Village<select name="village"><option>Darsalama</option><option>Bandrani-Vouani</option></select></label>
        <label>Filière<input name="program" /></label>
        <label>Niveau<input name="study_level" /></label>
        <label>Téléphone<input name="phone" /></label>
        <label>Email<input name="email" type="email" /></label>
        <button className="button primary" type="submit">Ajouter</button>
      </form>

      <MemberDirectory members={members||[]}/>
    </section>
  );
}
