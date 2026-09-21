import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { inviteUser, updateUserAccess } from "./actions";
import { can, ROLE_LABELS } from "@/lib/access";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (!can(me?.role,"admin_manage")) notFound();

  const admin = createAdminClient();
  const [{ data: profiles }, { data: logs }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,role,active,created_at").order("created_at"),
    supabase.from("audit_logs").select("id,actor_id,table_name,action,record_id,created_at").order("created_at",{ascending:false}).limit(40),
    supabase.from("members").select("id,full_name,member_number,profile_id,email,invitation_sent_at,account_activated_at").eq("status","active").order("full_name"),
  ]);

  let emails = new Map<string,string>();
  if (admin) {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    emails = new Map((data?.users || []).map((entry)=>[entry.id,entry.email || ""]));
  }

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Accès & traçabilité</span><h1>Administration</h1></div><span className="status-pill">Houssounaine Nourdine · administrateur</span></header>

      {!admin && <div className="panel warning"><h2>Service role non configuré</h2><p>Ajoute SUPABASE_SERVICE_ROLE_KEY au serveur pour activer les invitations et la gestion Auth.</p></div>}

      <div className="content-grid">
        <form action={inviteUser} className="panel form-stack">
          <div><span className="eyebrow">Comptes</span><h2>Inviter un utilisateur</h2></div>
          <label>Nom complet<input name="full_name" required /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Rôle<select name="role"><option value="membre">Membre</option><option value="secretaire">Secrétaire</option><option value="tresorier">Trésorier</option><option value="bureau">Bureau</option><option value="admin">Administrateur</option></select></label>
          <label>Lier au membre<select name="member_id"><option value="">— Aucun —</option>{(members||[]).filter((m)=>!m.profile_id).map((m)=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number}</option>)}</select></label>
          <button className="button primary" disabled={!admin}>Envoyer l’invitation</button>
        </form>

        <article className="panel accent-panel"><span className="eyebrow">Principe</span><h2>Le moindre privilège</h2><p>Chaque utilisateur reçoit uniquement les droits nécessaires à son rôle. Les changements de rôle et opérations métier restent tracés par le journal d’audit.</p></article>
      </div>

      <h2 className="section-title">Activation des membres</h2>
      <article className="panel onboarding-admin-list">
        {(members||[]).map((member)=>{
          const state=member.account_activated_at?"Activé":member.profile_id?"Invité":"À inviter";
          return <div key={member.id}><span><b>{member.full_name}</b><small>{member.member_number||"—"} · {member.email||"email non renseigné"}</small></span><span className={"badge onboarding-"+(member.account_activated_at?"active":member.profile_id?"invited":"pending")}>{state}</span><small>{member.account_activated_at?"Activé le "+new Date(member.account_activated_at).toLocaleDateString("fr-FR"):member.invitation_sent_at?"Invité le "+new Date(member.invitation_sent_at).toLocaleDateString("fr-FR"):"Aucune invitation envoyée"}</small></div>;
        })}
        {!members?.length&&<div className="empty-state">Aucun membre actif.</div>}
      </article>

      <h2 className="section-title">Comptes & rôles</h2>
      <div className="table-wrap panel">
        <table><thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>État</th><th>Action</th></tr></thead>
        <tbody>{(profiles||[]).map((profile)=><tr key={profile.id}><td><b>{profile.full_name || "Utilisateur"}</b></td><td>{emails.get(profile.id) || "—"}</td><td>{ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] || profile.role}</td><td><span className={"badge "+(profile.active?"ok":"")}>{profile.active?"Actif":"Suspendu"}</span></td><td>{profile.id===user!.id?<span className="muted">Compte administrateur principal</span>:<form action={updateUserAccess} className="table-action"><input type="hidden" name="profile_id" value={profile.id}/><select name="role" defaultValue={profile.role}><option value="membre">Membre</option><option value="secretaire">Secrétaire</option><option value="tresorier">Trésorier</option><option value="bureau">Bureau</option><option value="admin">Administrateur</option></select><select name="active" defaultValue={String(profile.active)}><option value="true">Actif</option><option value="false">Suspendu</option></select><button className="button secondary">Mettre à jour</button></form>}</td></tr>)}</tbody></table>
      </div>

      <h2 className="section-title">Journal d’audit</h2>
      <article className="panel audit-list">
        {(logs||[]).map((log)=><div key={log.id}><time>{new Date(log.created_at).toLocaleString("fr-FR")}</time><b>{log.action}</b><span>{log.table_name}</span><small>{log.record_id || "—"}</small></div>)}
        {!logs?.length && <div className="empty-state">Aucune opération auditée pour le moment.</div>}
      </article>
    </section>
  );
}
