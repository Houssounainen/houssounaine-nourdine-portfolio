import { createClient } from "@/lib/supabase/server";
import { addExpense, addPayment } from "./actions";

export default async function FinancePage() {
  const supabase = await createClient();
  const [{ data: members }, { data: payments }, { data: expenses }] = await Promise.all([
    supabase.from("members").select("id,full_name").eq("status","active").order("full_name"),
    supabase.from("payments").select("id,amount,method,receipt_number,paid_at,members(full_name)").order("paid_at",{ascending:false}).limit(20),
    supabase.from("expenses").select("id,label,amount,spent_at").order("spent_at",{ascending:false}).limit(20),
  ]);

  const income=(payments||[]).reduce((sum,p)=>sum+Number(p.amount||0),0);
  const outcome=(expenses||[]).reduce((sum,e)=>sum+Number(e.amount||0),0);

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Trésorerie</span><h1>Finances</h1></div><span className="status-pill">Solde affiché : {(income-outcome).toLocaleString("fr-FR")} Ar</span></header>
      <div className="content-grid">
        <form action={addPayment} className="panel form-stack">
          <h2>Enregistrer un paiement</h2>
          <label>Membre<select name="member_id" required>{(members||[]).map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label>
          <label>Montant (Ar)<input name="amount" type="number" min="1" required /></label>
          <label>Moyen<select name="method"><option>MVola</option><option>Orange Money</option><option>Airtel Money</option><option>Espèces</option><option>Virement</option></select></label>
          <label>Référence externe<input name="external_reference" /></label>
          <button className="button primary">Confirmer</button>
        </form>
        <form action={addExpense} className="panel form-stack">
          <h2>Enregistrer une dépense</h2>
          <label>Libellé<input name="label" required /></label>
          <label>Montant (Ar)<input name="amount" type="number" min="1" required /></label>
          <label>Date<input name="spent_at" type="date" required /></label>
          <button className="button secondary">Enregistrer</button>
        </form>
      </div>
      <div className="content-grid">
        <article className="panel"><h2>Derniers paiements</h2><div className="feed">{(payments||[]).map((p) => <div key={p.id}><span><b>{Array.isArray(p.members) ? p.members[0]?.full_name : p.members?.full_name || "Membre"}</b><small>{p.method} · {p.receipt_number||"reçu en génération"}</small></span><strong>+ {Number(p.amount).toLocaleString("fr-FR")} Ar</strong></div>)}</div></article>
        <article className="panel"><h2>Dernières dépenses</h2><div className="feed">{(expenses||[]).map(e=><div key={e.id}><span><b>{e.label}</b><small>{e.spent_at}</small></span><strong className="negative">− {Number(e.amount).toLocaleString("fr-FR")} Ar</strong></div>)}</div></article>
      </div>
    </section>
  );
}
