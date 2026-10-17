import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { Sheet, Tabs } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";
import { FilterList } from "@/components/manage/filter-list";
import { addExpense, addPayment, approveBudget, createBudget, saveBudgetLine } from "./actions";
import { uploadFinancialAttachment } from "@/lib/financial-files";
import "@/app/manage.css";

const fmt = (value: number) => value.toLocaleString("fr-FR") + " Ar";
const budgetStatus: Record<string,string> = { draft: "Brouillon", approved: "Approuvé", closed: "Clôturé" };

function DateChip({ value }: { value?: string | null }) {
  if (!value) return <span className="date-chip" aria-hidden="true"><b>—</b></span>;
  const date = new Date(value.length <= 10 ? value + "T12:00:00" : value);
  return <span className="date-chip"><b>{date.getDate()}</b><small>{date.toLocaleDateString("fr-FR",{month:"short"}).replace(".","")}</small></span>;
}

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
  const memberName=(p:any)=>Array.isArray(p.members)?p.members[0]?.full_name:p.members?.full_name;

  /* ———— Formulaires ———— */
  const paymentForm=<form action={addPayment} className="form-stack">
    <p className="form-section">Membre</p>
    <label>Membre<select name="member_id" required>{(members||[]).map(m=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number||"sans n°"}</option>)}</select></label>
    <label>Exercice de cotisation<select name="dues_cycle_id"><option value="">Paiement général / historique</option>{(duesCycles||[]).map(cycle=><option key={cycle.id} value={cycle.id}>{cycle.label} · {fmt(Number(cycle.amount))}</option>)}</select></label>
    <p className="form-section">Encaissement</p>
    <div className="form-two">
      <label>Montant (Ar)<input name="amount" type="number" min="1" required /></label>
      <label>Moyen<select name="method"><option>MVola</option><option>Orange Money</option><option>Airtel Money</option><option>Espèces</option><option>Virement</option></select></label>
    </div>
    <div className="form-two">
      <label>Catégorie<select name="category_id" required><option value="">Choisir…</option>{incomeCategories.map(c=><option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></label>
      <label>Compte encaissé<select name="account_id" required><option value="">Choisir…</option>{(accounts||[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    </div>
    <label>Référence externe<input name="external_reference" /></label>
    <label>Note<textarea name="notes" rows={2}/></label>
    <button className="button primary">Confirmer l’encaissement</button>
  </form>;

  const expenseForm=<form action={addExpense} className="form-stack">
    <p className="form-section">Dépense</p>
    <label>Libellé<input name="label" required /></label>
    <div className="form-two">
      <label>Montant (Ar)<input name="amount" type="number" min="1" required /></label>
      <label>Date<input name="spent_at" type="date" required /></label>
    </div>
    <p className="form-section">Imputation</p>
    <div className="form-two">
      <label>Catégorie<select name="category_id" required><option value="">Choisir…</option>{expenseCategories.map(c=><option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></label>
      <label>Compte débité<select name="account_id" required><option value="">Choisir…</option>{(accounts||[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    </div>
    <div className="form-two">
      <label>Moyen<select name="payment_method"><option>Espèces</option><option>MVola</option><option>Orange Money</option><option>Airtel Money</option><option>Virement</option></select></label>
      <label>Référence<input name="reference" /></label>
    </div>
    <label>Note<textarea name="notes" rows={2}/></label>
    <button className="button primary">Enregistrer la dépense</button>
  </form>;

  const paymentSheet=(variant:"primary"|"secondary"="primary")=><Sheet label="Encaisser une cotisation" title="Enregistrer une cotisation" description="Le reçu est généré à la confirmation." icon="wallet" variant={variant}>{paymentForm}</Sheet>;
  const expenseSheet=(variant:"primary"|"secondary"="secondary")=><Sheet label="Dépense" title="Enregistrer une dépense" description="Sortie de trésorerie imputée à une catégorie et un compte." icon="arrowUp" variant={variant}>{expenseForm}</Sheet>;

  /* ———— Vues ———— */
  const journalView=<FilterList
    placeholder="Libellé, référence…"
    filters={[
      {key:"flow",label:"Sens",options:[{value:"in",label:"Entrées"},{value:"out",label:"Sorties"}]},
      {key:"account",label:"Compte",mode:"select",options:(accounts||[]).map(a=>({value:a.id,label:a.name}))},
      {key:"category",label:"Catégorie",mode:"select",options:(categories||[]).map(c=>({value:c.id,label:c.code+" · "+c.name}))},
    ]}
    table={<tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Compte</th><th className="num">Entrée</th><th className="num">Sortie</th></tr>}
    empty={<div className="panel empty-state"><p>Aucune écriture.</p>{paymentSheet()}</div>}
    items={allLedger.map(row=>({
      id:row.source_type+"-"+row.id,
      text:[row.label,row.reference,categoryMap.get(row.category_id)?.name,accountMap.get(row.account_id)?.name].filter(Boolean).join(" "),
      facets:{flow:Number(row.income)>0?"in":"out",account:row.account_id||"",category:row.category_id||""},
      node:<tr>
        <td>{new Date(row.entry_date).toLocaleDateString("fr-FR")}</td>
        <td>{row.label}{row.reference&&<small>{row.reference}</small>}</td>
        <td>{categoryMap.get(row.category_id)?.name||"—"}</td>
        <td>{accountMap.get(row.account_id)?.name||"—"}</td>
        <td className="num money-in">{Number(row.income)>0?fmt(Number(row.income)):"—"}</td>
        <td className="num money-out">{Number(row.expense)>0?fmt(Number(row.expense)):"—"}</td>
      </tr>,
    }))}
  />;

  const duesView=<>
    <div className="tab-head"><p>Dernières cotisations encaissées. Le suivi par exercice (retards, exonérations, relances) se fait dans Cotisations.</p><Link className="button secondary" href="/finance/dues"><UiIcon name="users"/>Suivi des cotisations</Link></div>
    <FilterList
      placeholder="Membre, reçu…"
      empty={<div className="panel empty-state"><p>Aucune cotisation enregistrée.</p>{paymentSheet()}</div>}
      items={(payments||[]).map((p:any)=>({
        id:p.id,
        text:[memberName(p),p.receipt_number,p.method].filter(Boolean).join(" "),
        node:<div className="list-row is-static stack-sm">
          <DateChip value={p.paid_at}/>
          <div><b>{memberName(p)||"Membre"}</b><small>{p.receipt_number||"reçu en génération"} · {accountMap.get(p.account_id)?.name||p.method}</small></div>
          <div className="row-end"><strong className="positive">+ {fmt(Number(p.amount))}</strong></div>
        </div>,
      }))}
    />
  </>;

  const expenseView=<FilterList
    placeholder="Libellé, référence…"
    filters={[{key:"category",label:"Catégorie",mode:"select",options:expenseCategories.map(c=>({value:c.id,label:c.code+" · "+c.name}))}]}
    empty={<div className="panel empty-state"><p>Aucune dépense enregistrée.</p>{expenseSheet("primary")}</div>}
    items={(expenses||[]).map(e=>{
      const files=expenseFiles.get(e.id)||[];
      return {
        id:e.id,
        text:[e.label,e.reference,categoryMap.get(e.category_id)?.name].filter(Boolean).join(" "),
        facets:{category:e.category_id||""},
        node:<div className="list-row is-static stack-sm">
          <DateChip value={e.spent_at}/>
          <div>
            <b>{e.label}</b>
            <small>{[e.reference,categoryMap.get(e.category_id)?.name,accountMap.get(e.account_id)?.name||e.payment_method].filter(Boolean).join(" · ")||"—"}</small>
            {files.length>0&&<small>{files.map((file,index)=><span key={file.id}>{index>0&&" · "}<a href={"/api/financial-files/"+file.id}>{file.file_name}</a></span>)}</small>}
          </div>
          <div className="row-end">
            <strong className="negative">− {fmt(Number(e.amount))}</strong>
            <Sheet label={files.length?"Pièce +":"Justificatif"} title="Joindre un justificatif" description={e.label} icon="document" variant="secondary">
              <form action={uploadFinancialAttachment} encType="multipart/form-data" className="form-stack">
                <input type="hidden" name="entity_type" value="expense"/>
                <input type="hidden" name="entity_id" value={e.id}/>
                <label>Fichier (PDF ou image)<input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required/></label>
                <button className="button primary">Joindre</button>
              </form>
            </Sheet>
          </div>
        </div>,
      };
    })}
  />;

  const budgetView=!activeBudget
    ? <div className="panel">
      <p className="muted">Aucun budget annuel. Créez l’exercice pour saisir les prévisions par catégorie.</p>
      <form action={createBudget} className="budget-create-inline"><label>Exercice<input name="label" placeholder="2026-2027" required/></label><label>Début<input name="starts_on" type="date" required/></label><label>Fin<input name="ends_on" type="date" required/></label><button className="button primary">Créer le budget</button></form>
    </div>
    : <>
      <div className="tab-head"><p>Budget {activeBudget.label} · {budgetStatus[activeBudget.status]||activeBudget.status}</p>{activeBudget.status==="draft"&&<form action={approveBudget}><input type="hidden" name="budget_id" value={activeBudget.id}/><button className="button primary">Approuver le budget</button></form>}</div>
      <div className="panel budget-head"><div><small>Recettes prévues</small><strong>{fmt(plannedIncome)}</strong></div><div><small>Dépenses prévues</small><strong>{fmt(plannedExpense)}</strong></div><div><small>Résultat prévisionnel</small><strong>{fmt(plannedIncome-plannedExpense)}</strong></div><div><small>Statut</small><strong>{budgetStatus[activeBudget.status]||activeBudget.status}</strong></div></div>
      <div className="panel budget-rows">
        {(categories||[]).map((cat)=>{
          const line=lineMap.get(cat.id);
          const actual=Math.abs(actualByCategory.get(cat.id)||0);
          const planned=Number(line?.planned_amount||0);
          const pct=planned>0?Math.min(100,Math.round((actual/planned)*100)):0;
          return <form action={saveBudgetLine} className="budget-row" key={cat.id}>
            <input type="hidden" name="budget_id" value={activeBudget.id}/><input type="hidden" name="category_id" value={cat.id}/>
            <div><b>{cat.name}</b><small>{cat.code} · {cat.kind==="income"?"Recette":"Dépense"}</small></div>
            <label>Prévision (Ar)<input name="planned_amount" type="number" min="0" defaultValue={planned}/></label>
            <label>Note<input name="notes" defaultValue={line?.notes||""}/></label>
            <div className="budget-real"><small>Réalisé {fmt(actual)} · {pct} %</small><span className="progress-mini"><i style={{width:pct+"%"}}/></span></div>
            <button className="button secondary">Enregistrer</button>
          </form>;
        })}
      </div>
    </>;

  return (
    <section className="page manage-page">
      <header className="page-header">
        <div><h1>Finances</h1><p>Solde {fmt(balance)} sur {allLedger.length} écriture(s) récente(s), {accountBalances.length} compte(s) actif(s).</p></div>
        <div className="header-actions"><Link className="button secondary" href="/finance/dues"><UiIcon name="users"/>Cotisations</Link>{expenseSheet()}{paymentSheet()}</div>
      </header>

      <div className="stat-grid manage-stats">
        <article><a className="stat-link" href="#journal"><small>Recettes enregistrées</small><strong>{fmt(totalIncome)}</strong><span>cotisations et factures</span></a></article>
        <article><a className="stat-link" href="#depenses"><small>Dépenses enregistrées</small><strong>{fmt(totalExpense)}</strong><span>sorties de trésorerie</span></a></article>
        <article><a className="stat-link" href="#journal"><small>Solde global</small><strong>{fmt(balance)}</strong><span>tous comptes confondus</span></a></article>
        <article><a className="stat-link" href="#budget"><small>Budget courant</small><strong>{activeBudget?.label || "—"}</strong><span>{activeBudget?(budgetStatus[activeBudget.status]||activeBudget.status):"à créer"}</span></a></article>
      </div>

      {accountBalances.length>0&&<div className="account-strip">
        {accountBalances.map((account)=><article className="panel" key={account.id}><small>{account.provider || account.kind}</small><b>{account.name}</b><strong>{fmt(account.balance)}</strong><small>Entrées {fmt(account.income)} · Sorties {fmt(account.expense)}</small></article>)}
      </div>}

      <Tabs tabs={[
        {id:"journal",label:"Journal",count:allLedger.length,content:journalView},
        {id:"cotisations",label:"Cotisations",count:payments?.length||0,content:duesView},
        {id:"depenses",label:"Dépenses",count:expenses?.length||0,content:expenseView},
        {id:"budget",label:"Budget",content:budgetView},
      ]}/>
    </section>
  );
}
