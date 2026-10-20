import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { Sheet, Tabs } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";
import { FilterList } from "@/components/manage/filter-list";
import { createInvoice, createQuote } from "./actions";
import "@/app/manage.css";
import { PageIcon } from "@/components/manage/page-icon";

const fmt = (value: number) => value.toLocaleString("fr-FR") + " Ar";
const quoteStatus: Record<string,string> = { draft: "Brouillon", issued: "Envoyé", accepted: "Accepté", converted: "Facturé", cancelled: "Annulé" };
const invoiceStatus: Record<string,string> = { draft: "Brouillon", issued: "Émise", partial: "Partielle", paid: "Payée", cancelled: "Annulée" };
const statusClass: Record<string,string> = { draft: " pinned", issued: " featured", accepted: " ok", converted: " ok", partial: " pinned", paid: " ok", cancelled: "" };
const day = (value?: string | null) => value ? new Date(value.length <= 10 ? value + "T12:00:00" : value).toLocaleDateString("fr-FR") : null;

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
    finance ? supabase.from("invoice_payments").select("id,receipt_number,amount,paid_at,invoice_id,invoices(number,recipient_name)").order("paid_at",{ascending:false}) : Promise.resolve({data:[]}),
  ]);

  const invoicePaidMap = new Map<string,number>();
  (invoicePayments||[]).forEach((p)=>invoicePaidMap.set(p.invoice_id,(invoicePaidMap.get(p.invoice_id)||0)+Number(p.amount||0)));

  const openInvoiceTotal=(invoices||[]).filter((i)=>i.status!=="paid"&&i.status!=="cancelled").reduce((sum,i)=>sum+Math.max(0,Number(i.total||0)-(invoicePaidMap.get(i.id)||0)),0);
  const quoteTotal=(quotes||[]).filter((q)=>q.status!=="cancelled").reduce((sum,q)=>sum+Number(q.total||0),0);
  const openInvoices=(invoices||[]).filter((i)=>i.status!=="paid"&&i.status!=="cancelled");
  const today=new Date().toISOString().slice(0,10);
  const invoiceDerived=(i:{id:string;status:string})=>{const paid=invoicePaidMap.get(i.id)||0;return i.status==="paid"?"paid":i.status!=="cancelled"&&paid>0?"partial":i.status;};

  const recipientFields=<>
    <p className="form-section">Destinataire</p>
    <label>Destinataire<input name="recipient_name" required/></label>
    <div className="form-two"><label>Email<input name="recipient_email" type="email"/></label><label>Téléphone<input name="recipient_phone"/></label></div>
    <label>Adresse<textarea name="recipient_address" rows={2}/></label>
  </>;

  const quoteForm=<form action={createQuote} className="form-stack">
    {recipientFields}
    <p className="form-section">Devis</p>
    <label>Objet<input name="subject" required/></label>
    <label>Valable jusqu’au<input name="valid_until" type="date"/></label>
    <label>Note<textarea name="notes" rows={2}/></label>
    <p className="form-hint">Les lignes du devis se saisissent ensuite depuis sa fiche.</p>
    <button className="button primary">Créer le devis</button>
  </form>;

  const invoiceForm=<form action={createInvoice} className="form-stack">
    {recipientFields}
    <p className="form-section">Facture</p>
    <label>Objet<input name="subject" required/></label>
    <label>Échéance<input name="due_at" type="date"/></label>
    <label>Note<textarea name="notes" rows={2}/></label>
    <p className="form-hint">Les lignes et les encaissements se saisissent ensuite depuis la fiche facture.</p>
    <button className="button primary">Créer la facture</button>
  </form>;

  const quoteSheet=(variant:"primary"|"secondary"="primary")=><Sheet label="Nouveau devis" title="Nouveau devis" description="Brouillon numéroté, convertible en facture." icon="document" variant={variant}>{quoteForm}</Sheet>;
  const invoiceSheet=(variant:"primary"|"secondary"="secondary")=><Sheet label="Facture directe" title="Nouvelle facture directe" description="Facture sans devis préalable." icon="wallet" variant={variant}>{invoiceForm}</Sheet>;

  const quoteView=<FilterList
    placeholder="Numéro, destinataire, objet…"
    filters={[{key:"status",label:"Statut",options:Object.entries(quoteStatus).filter(([value])=>value!=="converted").map(([value,label])=>({value,label}))}]}
    empty={<div className="panel empty-state mg-empty-auto"><p>Aucun devis.</p>{quoteSheet()}</div>}
    items={(quotes||[]).map((q)=>({
      id:q.id,
      text:[q.number,q.recipient_name,q.subject].filter(Boolean).join(" "),
      facets:{status:q.status},
      node:<div className="list-row has-link stack-sm">
        <span className="row-icon">DEV</span>
        <div><b><Link className="row-link" href={"/documents/quotes/"+q.id}>{q.recipient_name}</Link></b><small>{q.number} · {q.subject}{q.valid_until?" · valable jusqu’au "+day(q.valid_until):""}</small></div>
        <div className="row-end">
          <strong>{fmt(Number(q.total||0))}</strong>
          <span className={"badge"+(statusClass[q.status]||"")}>{quoteStatus[q.status]||q.status}</span>
          <a className="button secondary" href={"/api/documents/quotes/"+q.id}><UiIcon name="download"/>PDF</a>
        </div>
      </div>,
    }))}
  />;

  const invoiceView=<FilterList
    placeholder="Numéro, destinataire, objet…"
    filters={[{key:"status",label:"Statut",options:Object.entries(invoiceStatus).map(([value,label])=>({value,label}))}]}
    empty={<div className="panel empty-state mg-empty-auto"><p>Aucune facture.</p>{finance&&invoiceSheet("primary")}</div>}
    items={(invoices||[]).map((i)=>{
      const paid=invoicePaidMap.get(i.id)||0;
      const remaining=Math.max(0,Number(i.total||0)-paid);
      const derived=invoiceDerived(i);
      const late=!!i.due_at&&i.due_at.slice(0,10)<today&&!["paid","cancelled"].includes(derived);
      return {
        id:i.id,
        text:[i.number,i.recipient_name,i.subject].filter(Boolean).join(" "),
        facets:{status:derived},
        node:<div className="list-row has-link stack-sm">
          <span className="row-icon">FAC</span>
          <div><b><Link className="row-link" href={"/documents/invoices/"+i.id}>{i.recipient_name}</Link></b><small>{i.number} · {i.subject}{i.due_at?" · échéance "+day(i.due_at):""}{remaining>0&&derived!=="cancelled"?" · reste "+fmt(remaining):""}</small></div>
          <div className="row-end">
            <strong>{fmt(Number(i.total||0))}</strong>
            {late&&<span className="badge overdue">Échue</span>}
            <span className={"badge"+(statusClass[derived]||"")}>{invoiceStatus[derived]||derived}</span>
            <a className="button secondary" href={"/api/documents/invoices/"+i.id}><UiIcon name="download"/>PDF</a>
          </div>
        </div>,
      };
    })}
  />;

  const receiptView=<>
    <div className="panel list-card">
      <header><h2>Reçus de cotisation</h2><Link href="/finance#cotisations">Finances</Link></header>
      {(memberPayments||[]).map((p:any)=>{const member=Array.isArray(p.members)?p.members[0]:p.members;return <div className="list-row is-static stack-sm" key={p.id}>
        <span className="row-icon"><UiIcon name="user"/></span>
        <div><b>{p.receipt_number||"Reçu"}</b><small>{member?.full_name||"Membre"}{p.paid_at?" · "+day(p.paid_at):""}</small></div>
        <div className="row-end"><strong>{fmt(Number(p.amount))}</strong><a className="button secondary" href={"/api/receipts/"+p.id}><UiIcon name="download"/>PDF</a></div>
      </div>;})}
      {!memberPayments?.length&&<div className="empty-state mg-empty-auto">Aucun reçu de cotisation.</div>}
    </div>
    {finance&&<div className="panel list-card">
      <header><h2>Reçus de factures</h2></header>
      {(invoicePayments||[]).slice(0,10).map((p:any)=>{const invoice=Array.isArray(p.invoices)?p.invoices[0]:p.invoices;return <div className="list-row is-static stack-sm" key={p.id}>
        <span className="row-icon"><UiIcon name="wallet"/></span>
        <div><b>{p.receipt_number}</b><small>Facture {invoice?.number||"—"} · {invoice?.recipient_name||"Destinataire"}{p.paid_at?" · "+day(p.paid_at):""}</small></div>
        <div className="row-end"><strong>{fmt(Number(p.amount))}</strong><a className="button secondary" href={"/api/documents/invoice-payments/"+p.id}><UiIcon name="download"/>PDF</a></div>
      </div>;})}
      {!invoicePayments?.length&&<div className="empty-state mg-empty-auto">Aucun reçu de facture.</div>}
    </div>}
  </>;

  return (
    <section className="page manage-page">
      <header className="page-header">
        <div><PageIcon href="/documents"/><h1>Documents</h1><p>{quotes?.length||0} devis, {invoices?.length||0} facture(s) dont {openInvoices.length} non soldée(s). Les documents émis ne sont jamais supprimés.</p></div>
        <div className="header-actions">{finance&&invoiceSheet()}{quoteSheet()}</div>
      </header>

      <div className="mg-stats stat-grid manage-stats">
        <article><a className="stat-link" href="#devis"><span className="icon-tile" style={{"--tile":"var(--accent)"} as React.CSSProperties}><UiIcon name="document"/></span><small>Devis</small><strong>{quotes?.length||0}</strong><span>valeur {fmt(quoteTotal)}</span></a></article>
        <article><a className="stat-link" href="#factures"><span className="icon-tile" style={{"--tile":"var(--violet)"} as React.CSSProperties}><UiIcon name="receipt"/></span><small>Factures</small><strong>{invoices?.length||0}</strong><span>toutes périodes</span></a></article>
        <article className={openInvoiceTotal?"attention-stat":""}><a className="stat-link" href="#factures"><span className="icon-tile" style={{"--tile":"var(--orange)"} as React.CSSProperties}><UiIcon name="wallet"/></span><small>À encaisser</small><strong>{fmt(openInvoiceTotal)}</strong><span>factures non soldées</span></a></article>
        <article><a className="stat-link" href="#recus"><span className="icon-tile" style={{"--tile":"var(--ok)"} as React.CSSProperties}><UiIcon name="check"/></span><small>Reçus récents</small><strong>{(memberPayments?.length||0)+(invoicePayments?.length||0)}</strong><span>membres et factures</span></a></article>
      </div>

      {!finance&&<p className="notice">Le secrétariat prépare les devis ; la conversion en facture et la facturation restent réservées aux rôles financiers.</p>}

      <Tabs tabs={[
        {id:"devis",label:"Devis",count:quotes?.length||0,content:quoteView},
        {id:"factures",label:"Factures",count:invoices?.length||0,content:invoiceView},
        {id:"recus",label:"Reçus",content:receiptView},
      ]}/>
    </section>
  );
}
