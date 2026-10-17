import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { addMember, inviteMember } from "./actions";
import { MemberDirectory } from "@/components/member-directory";
import { Sheet } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";

export default async function MembersPage({
  searchParams,
}:{searchParams:Promise<{created?:string;error?:string;invite?:string}>}) {
  const params=await searchParams;
  const supabase=await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("members").select("id,member_number,full_name,village,program,study_level,phone,email,status,profile_id,invitation_sent_at,account_activated_at").order("full_name"),
  ]);
  if (!can(profile?.role,"members_manage")) notFound();

  return (
    <section className="page">
      <header className="page-header">
        <div><h1>Membres</h1><p>{members?.length || 0} fiches au registre · {(members||[]).filter((m)=>m.status==="active").length} actives</p></div>
        <div className="header-actions">
          <details className="menu-button">
            <summary className="button secondary"><UiIcon name="download"/>Exporter</summary>
            <div>
              <Link href="/members/annuaire"><UiIcon name="document"/>Annuaire imprimable (PDF)</Link>
              <a href="/api/exports/members?format=excel"><UiIcon name="grid"/>Tableur Excel</a>
              <a href="/api/exports/members"><UiIcon name="list"/>Fichier CSV</a>
            </div>
          </details>
          {can(profile?.role,"member_import")&&<Link className="button secondary" href="/members/import">Importer</Link>}
          <Sheet label="Nouveau membre" title="Nouveau membre" description="La fiche est créée immédiatement ; une invitation peut être envoyée ensuite.">
            <form action={addMember} className="form-stack">
              <label>Nom complet<input name="full_name" required /></label>
              <div className="form-two"><label>N° membre<input name="member_number" placeholder="Attribué automatiquement si vide" /></label><label>Village<select name="village"><option>Darsalama</option><option>Bandrani-Vouani</option></select></label></div>
              <div className="form-two"><label>Filière<input name="program" /></label><label>Niveau<input name="study_level" /></label></div>
              <div className="form-two"><label>Téléphone<input name="phone" type="tel" /></label><label>Email<input name="email" type="email" /></label></div>
              <div className="form-two"><label>Statut<select name="status" defaultValue="active"><option value="active">Actif</option><option value="pending">En attente</option><option value="inactive">Inactif</option></select></label><label>Date d’adhésion<input name="joined_at" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></label></div>
              <button className="button primary" type="submit">Ajouter le membre</button>
            </form>
          </Sheet>
        </div>
      </header>

      {params.created==="1"&&<article className="panel"><span className="badge ok">Membre ajouté</span><p>{params.invite==="invited"?"Le registre est à jour et une invitation de connexion a été envoyée par email.":params.invite==="linked"?"Le registre est à jour et le membre est relié à son compte existant.":params.invite==="error"?"Le registre est à jour, mais l’invitation n’a pas pu être envoyée. Utilise « Envoyer l’accès » dans la liste.":"Le registre a été mis à jour immédiatement."}</p></article>}
      {params.created!=="1"&&params.invite==="invited"&&<article className="panel"><span className="badge ok">Invitation envoyée</span><p>Le membre peut maintenant ouvrir l’email AEDBVT et créer son mot de passe.</p></article>}
      {params.created!=="1"&&params.invite==="error"&&<div className="error-box">L’invitation n’a pas pu être envoyée. Vérifie l’adresse email et la configuration email Supabase.</div>}
      {params.error&&<div className="error-box">{params.error}</div>}


      <MemberDirectory members={members||[]} inviteAction={inviteMember}/>
    </section>
  );
}
