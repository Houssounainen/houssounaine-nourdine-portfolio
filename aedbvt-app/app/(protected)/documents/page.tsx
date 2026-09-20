import { createClient } from "@/lib/supabase/server";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const [{ data: quotes }, { data: invoices }, { data: payments }] = await Promise.all([
    supabase.from("quotes").select("id,number,recipient_name,subject,total,status,issued_at").order("issued_at",{ascending:false}),
    supabase.from("invoices").select("id,number,recipient_name,subject,total,status,issued_at,due_at").order("issued_at",{ascending:false}),
    supabase.from("payments").select("id,receipt_number,amount,paid_at,members(full_name)").eq("status","confirmed").order("paid_at",{ascending:false}).limit(12),
  ]);

  const financialDocs = [
    ...(quotes || []).map((item) => ({ ...item, kind: "Devis" })),
    ...(invoices || []).map((item) => ({ ...item, kind: "Facture" })),
  ];

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Pièces & références</span><h1>Documents</h1></div><span className="status-pill">Historique non destructif</span></header>
      <div className="stat-grid"><article><small>Devis</small><strong>{quotes?.length||0}</strong><span>DEV</span></article><article><small>Factures</small><strong>{invoices?.length||0}</strong><span>FAC</span></article><article><small>Reçus</small><strong>{payments?.length||0}</strong><span>REC</span></article></div>
      <article className="panel"><h2>Documents financiers</h2><div className="doc-list">{financialDocs.map((d) => <div key={d.kind + "-" + d.id}><span><small>{d.kind}</small><b>{d.number}</b><em>{d.recipient_name} · {d.subject}</em></span><strong>{Number(d.total||0).toLocaleString("fr-FR")} Ar</strong><span className="badge">{d.status}</span></div>)}</div></article>
      <article className="panel"><h2>Reçus de cotisation</h2><div className="doc-list">{(payments||[]).map((p) => { const related = Array.isArray(p.members) ? p.members[0] : p.members; return <div key={p.id}><span><small>Reçu</small><b>{p.receipt_number||"En attente de numéro"}</b><em>{related?.full_name||"Membre"}</em></span><strong>{Number(p.amount).toLocaleString("fr-FR")} Ar</strong></div>; })}</div></article>
    </section>
  );
}
