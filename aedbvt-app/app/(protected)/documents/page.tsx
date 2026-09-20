import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { createInvoice, createQuote } from "./actions";

const fmt = (value: number) => value.toLocaleString("fr-FR") + " Ar";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id",user!.id).single();
  if (!isStaff(profile?.role)) notFound();
  const finance = ["admin","bureau","tresorier"].includes(profile?.role || "");

  const [{ data: quotes }, { data: invoices }, { data: memberPayments }, { data: invoicePayments }] = await Promise.all([
    supabase.from("quotes").select("id,number,recipient_name,subject,total,status,issued_at,valid_until").order("created_at",{ascending:false}),
    supabase.from("invoices").select("id,number,recipient_name,subject,total,status,issued_at,due_at").order("created_at",{ascending:false}),
    supabase.from("payments").select("id,receipt_number,amount,paid_at,members(full_name)").eq("status","confirmed").order("paid_at",{ascending:false}).limit(10),
    finance ? supabase.from("invoice_payments").select("id,receipt_number,amount,paid_at,invoice_id,invoices(number,recipient_name)").order("paid_at",{ascending:false}).limit(10) : Promise.resolve({data:[]}),
  ]);

  const invoicePaidMap = new Map<string,number>();
  (invoicePayments||[]).forEach((p)=>invoicePaidMap.set(p.invoice_id,(invoicePaidMap.get(p.invoice_id)||0)+Number(p.amount||0)));

  const openInvoiceTotal=(invoices||[]).filter((i)=>i.status!=="paid"&&i.status!=="cancelled").reduce((sum,i)=>sum+Math.max(0,Number(i.total||0)-(invoicePaidMap.get(i.id)||0)),0);
  const quoteTotal=(quotes||[]).filter((q)=>q.status!=="cancelled").reduce((sum,q)=>sum+Number(q.total||0),0);

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Devis, factures & reçus</span><h1>Documents</h1></div><span className="status-pill">Historique non destructif</span></header>

      <div className="stat-grid">
        <article><small>Devis</small><strong>{quotes?.length||0}</strong><span>Valeur {fmt(quoteTotal)}</span></article>
        <article><small>Factures</small><strong>{invoices?.length||0}</strong><span>toutes périodes</span></article>
        <article><small>À encaisser</small><strong>{fmt(openInvoiceTotal)}</strong><span>factures non soldées</span></article>
        <article><small>Reçus récents</small><strong>{(memberPayments?.length||0)+(invoicePayments?.length||0)}</strong><span>membres + factures</span></article>
      </div>

      <div className="content-grid">
        <form action={createQuote} className="panel form-stack">
          <div><span className="eyebrow">DEV</span><h2>Nouveau devis</h2></div>
          <label>Destinataire<input name="recipient_name" required/></label>
          <label>Email<input name="recipient_email" type="email"/></label>
          <label>Téléphone<input name="recipient_phone"/></label>
          <label>Adresse<textarea name="recipient_address" rows={2}/></label>
          <label>Objet<input name="subject" required/></label>
          <label>Valable jusqu’au<input name="valid_until" type="date"/></label>
          <label>Note<textarea name="notes" rows={2}/></label>
          <button className="button primary">Créer le devis</button>
        </form>

        {finance ? <form action={createInvoice} className="panel form-stack">
          <div><span className="eyebrow">FAC</span><h2>Nouvelle facture directe</h2></div>
          <label>Destinataire<input name="recipient_name" required/></label>
          <label>Email<input name="recipient_email" type="email"/></label>
          <label>Téléphone<input name="recipient_phone"/></label>
          <label>Adresse<textarea name="recipient_address" rows={2}/></label>
          <label>Objet<input name="subject" required/></label>
          <label>Échéance<input name="due_at" type="date"/></label>
          <label>Note<textarea name="notes" rows={2}/></label>
          <button className="button secondary">Créer la facture</button>
        </form> : <article className="panel accent-panel"><span className="eyebrow">Workflow</span><h2>Devis d’abord, facture ensuite</h2><p>Le secrétariat peut préparer les devis. La conversion et la facturation restent réservées aux rôles financiers.</p></article>}
      </div>

      <div className="content-grid document-columns">
        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">Commercial</span><h2>Devis</h2></div><span>{quotes?.length||0}</span></div>
          <div className="document-stack">
            {(quotes||[]).map((q)=><Link className="document-row" href={"/documents/quotes/"+q.id} key={q.id}><span><small>{q.number}</small><b>{q.recipient_name}</b><em>{q.subject}</em></span><strong>{fmt(Number(q.total||0))}</strong><span className={"badge status-"+q.status}>{q.status}</span></Link>)}
            {!quotes?.length&&<p>Aucun devis.</p>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">Facturation</span><h2>Factures</h2></div><span>{invoices?.length||0}</span></div>
          <div className="document-stack">
            {(invoices||[]).map((i)=>{
              const paid=invoicePaidMap.get(i.id)||0;
              const remaining=Math.max(0,Number(i.total||0)-paid);
              const derived=i.status==="paid"?"payée":paid>0?"partielle":i.status;
              return <Link className="document-row" href={"/documents/invoices/"+i.id} key={i.id}><span><small>{i.number}</small><b>{i.recipient_name}</b><em>{i.subject}</em></span><strong>{fmt(Number(i.total||0))}<small>Reste {fmt(remaining)}</small></strong><span className={"badge status-"+derived}>{derived}</span></Link>;
            })}
            {!invoices?.length&&<p>Aucune facture.</p>}
          </div>
        </article>
      </div>

      <div className="content-grid">
        <article className="panel">
          <h2>Reçus de cotisation</h2>
          <div className="doc-list">{(memberPayments||[]).map((p:any)=>{const member=Array.isArray(p.members)?p.members[0]:p.members;return <div key={p.id}><span><small>Membre</small><b>{p.receipt_number||"Reçu"}</b><em>{member?.full_name||"Membre"}</em></span><strong>{fmt(Number(p.amount))}</strong><a className="button secondary" href={"/api/receipts/"+p.id}>PDF</a></div>})}</div>
        </article>

        {finance&&<article className="panel">
          <h2>Reçus de factures</h2>
          <div className="doc-list">{(invoicePayments||[]).map((p:any)=>{const invoice=Array.isArray(p.invoices)?p.invoices[0]:p.invoices;return <div key={p.id}><span><small>Facture {invoice?.number||"—"}</small><b>{p.receipt_number}</b><em>{invoice?.recipient_name||"Destinataire"}</em></span><strong>{fmt(Number(p.amount))}</strong><a className="button secondary" href={"/api/documents/invoice-payments/"+p.id}>PDF</a></div>})}</div>
        </article>}
      </div>
    </section>
  );
}
