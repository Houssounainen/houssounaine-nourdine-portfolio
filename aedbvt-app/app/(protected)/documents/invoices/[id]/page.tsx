import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addInvoiceItem, cancelInvoice, recordInvoicePayment } from "../../actions";
import { uploadFinancialAttachment } from "@/lib/financial-files";

const fmt=(value:number)=>value.toLocaleString("fr-FR")+" Ar";

export default async function InvoiceDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user!.id).single();
  if(!["admin","bureau","tresorier"].includes(profile?.role||"")) notFound();

  const [{data:invoice},{data:items},{data:payments},{data:accounts},{data:attachments}]=await Promise.all([
    supabase.from("invoices").select("id,quote_id,number,recipient_name,recipient_email,recipient_phone,recipient_address,subject,total,status,issued_at,due_at,notes,currency").eq("id",id).maybeSingle(),
    supabase.from("invoice_items").select("id,position,description,quantity,unit_price").eq("invoice_id",id).order("position"),
    supabase.from("invoice_payments").select("id,amount,method,external_reference,receipt_number,paid_at,account_id,notes").eq("invoice_id",id).order("paid_at",{ascending:false}),
    supabase.from("cash_accounts").select("id,name,provider").eq("active",true).order("name"),
    supabase.from("financial_attachments").select("id,file_name,content_type,size_bytes,created_at").eq("entity_type","invoice").eq("entity_id",id).order("created_at",{ascending:false}),
  ]);
  if(!invoice) notFound();

  const paid=(payments||[]).reduce((sum,p)=>sum+Number(p.amount||0),0);
  const remaining=Math.max(0,Number(invoice.total||0)-paid);
  const derived=invoice.status==="cancelled"?"annulée":invoice.status==="paid"?"payée":paid>0?"partiellement payée":"émise";
  const editable=invoice.status!=="paid"&&invoice.status!=="cancelled"&&paid===0;

  return <section className="page">
    <header className="page-header"><div><Link className="back-link" href="/documents">← Documents</Link><span className="eyebrow">Facture</span><h1>{invoice.number}</h1></div><span className={"status-pill status-"+invoice.status}>{derived}</span></header>

    <div className="document-detail-grid">
      <article className="panel document-paper">
        <div className="document-paper-head"><div><span className="eyebrow">AEDBVT</span><h2>FACTURE</h2></div><div><b>{invoice.number}</b><small>Émise le {new Date(invoice.issued_at).toLocaleDateString("fr-FR")}</small>{invoice.due_at&&<small>Échéance {new Date(invoice.due_at).toLocaleDateString("fr-FR")}</small>}</div></div>
        <div className="recipient-block"><small>Destinataire</small><b>{invoice.recipient_name}</b><span>{invoice.recipient_address||""}</span><span>{[invoice.recipient_email,invoice.recipient_phone].filter(Boolean).join(" · ")}</span></div>
        <h3 className="document-subject">{invoice.subject}</h3>
        <div className="line-table"><div className="line-head"><span>Description</span><span>Qté</span><span>Prix unitaire</span><span>Total</span></div>{(items||[]).map((item)=><div className="line-row" key={item.id}><span>{item.description}</span><span>{Number(item.quantity).toLocaleString("fr-FR")}</span><span>{fmt(Number(item.unit_price))}</span><strong>{fmt(Number(item.quantity)*Number(item.unit_price))}</strong></div>)}{!items?.length&&<div className="empty-line">Ajoutez au moins une ligne à la facture.</div>}</div>
        <div className="document-totals"><div><span>Total facture</span><strong>{fmt(Number(invoice.total||0))}</strong></div><div><span>Déjà réglé</span><strong>{fmt(paid)}</strong></div><div className="remaining"><span>Reste à payer</span><strong>{fmt(remaining)}</strong></div></div>
        {invoice.notes&&<div className="document-notes"><b>Note</b><p>{invoice.notes}</p></div>}
      </article>

      <aside className="document-tools">
        <article className="panel">
          <span className="eyebrow">Actions</span><h2>Facture</h2>
          <div className="tool-stack">
            <a className="button secondary" href={"/api/documents/invoices/"+invoice.id}>Télécharger PDF</a>
            {invoice.quote_id&&<Link className="button secondary" href={"/documents/quotes/"+invoice.quote_id}>Voir le devis source</Link>}
            {invoice.status!=="paid"&&invoice.status!=="cancelled"&&<form action={cancelInvoice}><input type="hidden" name="invoice_id" value={invoice.id}/><button className="button danger-button">Annuler la facture</button></form>}
          </div>
        </article>

        {editable&&<form action={addInvoiceItem} className="panel form-stack">
          <input type="hidden" name="invoice_id" value={invoice.id}/>
          <div><span className="eyebrow">Ligne</span><h2>Ajouter un élément</h2></div>
          <label>Description<input name="description" required/></label>
          <label>Quantité<input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" required/></label>
          <label>Prix unitaire (Ar)<input name="unit_price" type="number" min="0" step="1" required/></label>
          <button className="button secondary">Ajouter la ligne</button>
        </form>}

        <form action={uploadFinancialAttachment} className="panel form-stack" encType="multipart/form-data">
          <input type="hidden" name="entity_type" value="invoice"/>
          <input type="hidden" name="entity_id" value={invoice.id}/>
          <div><span className="eyebrow">Justificatif</span><h2>Ajouter une pièce</h2></div>
          <label>PDF ou image<input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required/></label>
          <small className="muted">5 Mo maximum. Le fichier reste privé.</small>
          <button className="button secondary">Téléverser</button>
        </form>

        {invoice.status!=="paid"&&invoice.status!=="cancelled"&&remaining>0&&<form action={recordInvoicePayment} className="panel form-stack">
          <input type="hidden" name="invoice_id" value={invoice.id}/>
          <div><span className="eyebrow">Règlement</span><h2>Enregistrer un paiement</h2></div>
          <label>Montant (Ar)<input name="amount" type="number" min="1" max={remaining} defaultValue={remaining} required/></label>
          <label>Compte<select name="account_id" required><option value="">Choisir…</option>{(accounts||[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label>Moyen<select name="method"><option>Espèces</option><option>MVola</option><option>Orange Money</option><option>Airtel Money</option><option>Virement</option></select></label>
          <label>Date<input name="paid_at" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></label>
          <label>Référence externe<input name="external_reference"/></label>
          <label>Note<textarea name="notes" rows={2}/></label>
          <button className="button primary">Confirmer le règlement</button>
        </form>}
      </aside>
    </div>

    <article className="panel attachment-panel">
      <div className="panel-head"><div><span className="eyebrow">Pièces jointes</span><h2>Documents privés</h2></div><span>{attachments?.length||0}</span></div>
      <div className="attachment-list">{(attachments||[]).map((file)=><a href={"/api/financial-files/"+file.id} key={file.id}><span><b>{file.file_name}</b><small>{file.content_type||"fichier"} · {Math.max(1,Math.round(Number(file.size_bytes||0)/1024))} Ko</small></span><strong>↓</strong></a>)}{!attachments?.length&&<p>Aucune pièce jointe.</p>}</div>
    </article>

    <article className="panel payment-history">
      <div className="panel-head"><div><span className="eyebrow">Encaissements</span><h2>Historique des règlements</h2></div><strong>{fmt(paid)}</strong></div>
      <div className="doc-list">{(payments||[]).map((p)=><div key={p.id}><span><small>{new Date(p.paid_at).toLocaleDateString("fr-FR")} · {p.method}</small><b>{p.receipt_number}</b><em>{p.external_reference||p.notes||"Paiement facture"}</em></span><strong>{fmt(Number(p.amount))}</strong><a className="button secondary" href={"/api/documents/invoice-payments/"+p.id}>Reçu PDF</a></div>)}{!payments?.length&&<p>Aucun règlement enregistré.</p>}</div>
    </article>
  </section>
}
