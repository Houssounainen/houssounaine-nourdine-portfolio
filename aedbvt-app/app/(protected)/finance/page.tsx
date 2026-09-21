import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { addExpense, addPayment, approveBudget, createBudget, saveBudgetLine } from "./actions";
import { uploadFinancialAttachment } from "@/lib/financial-files";

const fmt = (value: number) => value.toLocaleString("fr-FR") + " Ar";

export default async function FinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id",user!.id).single();
  if (!can(profile?.role,"finance_manage")) notFound();

  const [
    { data: members },
    { data: payments },
    { data: expenses },
    { data: categories },
    { data: accounts },
    { data: budgets },
    { data: ledger },
    { data: expenseAttachments },
    { data: duesCycles },
  ] = await Promise.all([
    supabase.from("members").select("id,full_name,member_number").eq("status","active").order("full_name"),
    supabase.from("payments").select("id,amount,method,receipt_number,paid_at,account_id,category_id,members(full_name,member_number)").order("paid_at",{ascending:false}).limit(30),
    supabase.from("expenses").select("id,label,amount,spent_at,reference,account_id,category_id,payment_method").order("spent_at",{ascending:false}).limit(30),
    supabase.from("finance_categories").select("id,code,name,kind,active").eq("active",true).order("code"),
    supabase.from("cash_accounts").select("id,name,kind,provider,active").eq("active",true).order("name"),
    supabase.from("budget_years").select("id,label,starts_on,ends_on,status,approved_at").order("starts_on",{ascending:false}),
    supabase.from("finance_ledger").select("id,entry_date,source_type,reference,label,income,expense,category_id,account_id").order("entry_date",{ascending:false}).limit(120),
    supabase.from("financial_attachments").select("id,entity_id,file_name,size_bytes").eq("entity_type","expense").order("created_at",{ascending:false}),
    supabase.from("membership_dues_cycles").select("id,label,amount,due_on,status").eq("status","open").order("starts_on",{ascending:false}),
  ]);

  const activeBudget = budgets?.[0] || null;
  const budgetLines = activeBudget
    ? (await supabase.from("budget_lines").select("id,budget_id,category_id,planned_amount,notes").eq("budget_id",activeBudget.id)).data || []
    : [];

  const incomeCategories=(categories||[]).filter((x)=>x.kind==="income");
  const expenseCategories=(categories||[]).filter((x)=>x.kind==="expense");
  const categoryMap=new Map((categories||[]).map((x)=>[x.id,x]));
  const accountMap=new Map((accounts||[]).map((x)=>[x.id,x]));
  const lineMap=new Map(budgetLines.map((x)=>[x.category_id,x]));
  const expenseFiles=new Map<string,typeof expenseAttachments>();
  (expenseAttachments||[]).forEach((file)=>expenseFiles.set(file.entity_id,[...(expenseFiles.get(file.entity_id)||[]),file]));

  const allLedger=ledger||[];
  const totalIncome=allLedger.reduce((sum,row)=>sum+Number(row.income||0),0);
  const totalExpense=allLedger.reduce((sum,row)=>sum+Number(row.expense||0),0);
  const balance=totalIncome-totalExpense;

  const accountBalances=(accounts||[]).map((account)=>{
    const rows=allLedger.filter((row)=>row.account_id===account.id);
    const income=rows.reduce((sum,row)=>sum+Number(row.income||0),0);
    const expense=rows.reduce((sum,row)=>sum+Number(row.expense||0),0);
    return {...account,income,expense,balance:income-expense};
  });

  const actualByCategory=new Map<string,number>();
  allLedger.forEach((row)=>{
    if(!row.category_id) return;
    const signed=Number(row.income||0)-Number(row.expense||0);
    actualByCategory.set(row.category_id,(actualByCategory.get(row.category_id)||0)+signed);
  });

  const plannedIncome=incomeCategories.reduce((sum,cat)=>sum+Number(lineMap.get(cat.id)?.planned_amount||0),0);
  const plannedExpense=expenseCategories.reduce((sum,cat)=>sum+Number(lineMap.get(cat.id)?.planned_amount||0),0);

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Trésorerie & budget</span><h1>Finances</h1></div><span className="status-pill">Solde : {fmt(balance)}</span></header>

      <div className="stat-grid finance-stats">
        <article><small>Recettes enregistrées</small><strong>{fmt(totalIncome)}</strong><span>cotisations + factures</span></article>
        <article><small>Dépenses enregistrées</small><strong>{fmt(totalExpense)}</strong><span>sorties de trésorerie</span></article>
        <article><small>Solde global</small><strong>{fmt(balance)}</strong><span>tous comptes confondus</span></article>
        <article><small>Budget courant</small><strong>{activeBudget?.label || "—"}</strong><span>{activeBudget?.status || "à créer"}</span></article>
      </div>

      <div className="cash-account-grid">
        {accountBalances.map((account)=><article className="panel cash-account" key={account.id}><span className="eyebrow">{account.provider || account.kind}</span><h2>{account.name}</h2><strong>{fmt(account.balance)}</strong><small>Entrées {fmt(account.income)} · Sorties {fmt(account.expense)}</small></article>)}
      </div>

      <div className="content-grid">
        <form action={addPayment} className="panel form-stack">
          <div><span className="eyebrow">Recette</span><h2>Enregistrer une cotisation</h2></div>
          <label>Membre<select name="member_id" required>{(members||[]).map(m=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number||"sans n°"}</option>)}</select></label>
          <label>Exercice de cotisation<select name="dues_cycle_id"><option value="">Paiement général / historique</option>{(duesCycles||[]).map(cycle=><option key={cycle.id} value={cycle.id}>{cycle.label} · {fmt(Number(cycle.amount))}</option>)}</select></label>
          <label>Catégorie<select name="category_id" required><option value="">Choisir…</option>{incomeCategories.map(c=><option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></label>
          <label>Compte encaissé<select name="account_id" required><option value="">Choisir…</option>{(accounts||[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label>Montant (Ar)<input name="amount" type="number" min="1" required /></label>
          <label>Moyen<select name="method"><option>MVola</option><option>Orange Money</option><option>Airtel Money</option><option>Espèces</option><option>Virement</option></select></label>
          <label>Référence externe<input name="external_reference" /></label>
          <label>Note<textarea name="notes" rows={2}/></label>
          <button className="button primary">Confirmer l’encaissement</button>
        </form>

        <form action={addExpense} className="panel form-stack">
          <div><span className="eyebrow">Dépense</span><h2>Enregistrer une sortie</h2></div>
          <label>Libellé<input name="label" required /></label>
          <label>Catégorie<select name="category_id" required><option value="">Choisir…</option>{expenseCategories.map(c=><option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></label>
          <label>Compte débité<select name="account_id" required><option value="">Choisir…</option>{(accounts||[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label>Montant (Ar)<input name="amount" type="number" min="1" required /></label>
          <label>Date<input name="spent_at" type="date" required /></label>
          <label>Moyen<select name="payment_method"><option>Espèces</option><option>MVola</option><option>Orange Money</option><option>Airtel Money</option><option>Virement</option></select></label>
          <label>Référence<input name="reference" /></label>
          <label>Note<textarea name="notes" rows={2}/></label>
          <button className="button secondary">Enregistrer la dépense</button>
        </form>
      </div>

      <article className="panel finance-dues-callout"><div><span className="eyebrow">Adhésions</span><h2>Cotisations annuelles</h2><p>Suivre les exercices, retards, exonérations et relances membre par membre.</p></div><a className="button primary" href="/finance/dues">Ouvrir les cotisations →</a></article>

      <section className="finance-budget-section">
        <div className="section-heading-row"><div><span className="eyebrow">Prévisionnel</span><h2>Budget annuel</h2></div>{activeBudget&&activeBudget.status==="draft"&&<form action={approveBudget}><input type="hidden" name="budget_id" value={activeBudget.id}/><button className="button primary">Approuver le budget</button></form>}</div>

        {!activeBudget && <form action={createBudget} className="panel budget-create"><label>Exercice<input name="label" placeholder="2026-2027" required/></label><label>Début<input name="starts_on" type="date" required/></label><label>Fin<input name="ends_on" type="date" required/></label><button className="button primary">Créer le budget</button></form>}

        {activeBudget && <>
          <div className="budget-summary panel"><div><small>Recettes prévues</small><strong>{fmt(plannedIncome)}</strong></div><div><small>Dépenses prévues</small><strong>{fmt(plannedExpense)}</strong></div><div><small>Résultat prévisionnel</small><strong>{fmt(plannedIncome-plannedExpense)}</strong></div><div><small>Statut</small><strong>{activeBudget.status}</strong></div></div>
          <div className="budget-grid">
            {(categories||[]).map((cat)=>{
              const line=lineMap.get(cat.id);
              const actual=Math.abs(actualByCategory.get(cat.id)||0);
              const planned=Number(line?.planned_amount||0);
              const pct=planned>0?Math.min(100,Math.round((actual/planned)*100)):0;
              return <form action={saveBudgetLine} className="panel budget-line" key={cat.id}><input type="hidden" name="budget_id" value={activeBudget.id}/><input type="hidden" name="category_id" value={cat.id}/><span className="badge">{cat.code}</span><h3>{cat.name}</h3><label>Prévision (Ar)<input name="planned_amount" type="number" min="0" defaultValue={planned}/></label><label>Note<input name="notes" defaultValue={line?.notes||""}/></label><div className="budget-progress"><i style={{width:pct+"%"}}/></div><small>Réalisé : {fmt(actual)} · {pct}%</small><button className="button secondary">Enregistrer</button></form>;
            })}
          </div>
        </>}
      </section>

      <div className="content-grid">
        <article className="panel"><h2>Dernières cotisations</h2><div className="feed">{(payments||[]).map((p:any)=><div key={p.id}><span><b>{Array.isArray(p.members)?p.members[0]?.full_name:p.members?.full_name||"Membre"}</b><small>{p.receipt_number||"reçu en génération"} · {accountMap.get(p.account_id)?.name||p.method}</small></span><strong>+ {fmt(Number(p.amount))}</strong></div>)}</div></article>
        <article className="panel"><h2>Dernières dépenses</h2><div className="expense-stack">{(expenses||[]).map(e=>{const files=expenseFiles.get(e.id)||[];return <div className="expense-row" key={e.id}><div className="expense-main"><span><b>{e.label}</b><small>{e.reference||e.spent_at} · {accountMap.get(e.account_id)?.name||e.payment_method||"—"}</small></span><strong className="negative">− {fmt(Number(e.amount))}</strong></div><div className="expense-files">{files.map((file)=><a key={file.id} href={"/api/financial-files/"+file.id}>{file.file_name}</a>)}</div><form action={uploadFinancialAttachment} encType="multipart/form-data" className="expense-upload"><input type="hidden" name="entity_type" value="expense"/><input type="hidden" name="entity_id" value={e.id}/><input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required/><button className="button secondary">Joindre</button></form></div>})}</div></article>
      </div>

      <article className="panel ledger-panel">
        <div className="panel-head"><div><span className="eyebrow">Traçabilité</span><h2>Grand livre récent</h2></div><small>{allLedger.length} écriture(s) affichée(s)</small></div>
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Référence</th><th>Libellé</th><th>Catégorie</th><th>Compte</th><th>Entrée</th><th>Sortie</th></tr></thead><tbody>{allLedger.map((row)=><tr key={row.source_type+"-"+row.id}><td>{new Date(row.entry_date).toLocaleDateString("fr-FR")}</td><td>{row.reference||"—"}</td><td>{row.label}</td><td>{categoryMap.get(row.category_id)?.name||"—"}</td><td>{accountMap.get(row.account_id)?.name||"—"}</td><td className="money-in">{Number(row.income)>0?fmt(Number(row.income)):"—"}</td><td className="money-out">{Number(row.expense)>0?fmt(Number(row.expense)):"—"}</td></tr>)}</tbody></table></div>
      </article>
    </section>
  );
}
