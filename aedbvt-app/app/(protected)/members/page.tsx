import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { addMember } from "./actions";

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("members").select("id, member_number, full_name, village, program, study_level, phone, status").order("full_name"),
  ]);

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Registre</span><h1>Membres</h1></div><span className="status-pill">{members?.length || 0} enregistrements</span></header>
      {isStaff(profile?.role) && (
        <form action={addMember} className="panel form-grid">
          <h2>Nouveau membre</h2>
          <label>Nom complet<input name="full_name" required /></label>
          <label>Village<select name="village"><option>Darsalama</option><option>Bandrani-Vouani</option></select></label>
          <label>Filière<input name="program" /></label>
          <label>Niveau<input name="study_level" /></label>
          <label>Téléphone<input name="phone" /></label>
          <button className="button primary" type="submit">Ajouter</button>
        </form>
      )}
      <div className="table-wrap panel">
        <table><thead><tr><th>N°</th><th>Membre</th><th>Village</th><th>Études</th><th>Contact</th><th>Statut</th></tr></thead>
        <tbody>{(members || []).map((m) => <tr key={m.id}><td>{m.member_number || "—"}</td><td><b>{m.full_name}</b></td><td>{m.village || "—"}</td><td>{[m.program,m.study_level].filter(Boolean).join(" · ") || "—"}</td><td>{m.phone || "—"}</td><td><span className="badge ok">{m.status}</span></td></tr>)}</tbody></table>
      </div>
    </section>
  );
}
