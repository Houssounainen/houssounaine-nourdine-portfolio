import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { uploadFinancialAttachment } from "@/lib/financial-files";
import { addQuoteItem, convertQuote, updateQuoteStatus } from "../../actions";

const fmt=(value:number)=>value.toLocaleString("fr-FR")+" Ar";

export default async function QuoteDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:quote},{data:items}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("quotes").select("id,number,recipient_name,recipient_email,recipient_phone,recipient_address,subject,total,status,issued_at,valid_until,notes,currency").eq("id",id).maybeSingle(),
    supabase.from("quote_items").select("id,position,description,quantity,unit_price").eq("quote_id",id).order("position"),
  ]);
  if(!quote||!isStaff(profile?.role)) notFound();

  const finance=["admin","bureau","tresorier"].includes(profile?.role||"");
  const attachments=finance ? (await supabase.from("financial_attachments").select("id,file_name,content_type,size_bytes,created_at").eq("entity_type","quote").eq("entity_id",quote.id).order("created_at",{ascending:false})).data || [] : [];
  const editable=["draft","issued"].includes(quote.status);
  const canConvert=finance&&quote.status!=="cancelled"&&Number(quote.total)>0;

  return <section className="page">
    <header className="page-header"><div><Link className="back-link" href="/documents">← Documents</Link><span className="eyebrow">Devis</span><h1>{quote.number}</h1></div><span className={"status-pill status-"+quote.status}>{quote.status}</span></header>

    <div className="document-detail-grid">
      <article className="panel document-paper">
        <div className="document-paper-head"><div><span className="eyebrow">AEDBVT</span><h2>DEVIS</h2></div><div><b>{quote.number}</b><small>Émis le {new Date(quote.issued_at).toLocaleDateString("fr-FR")}</small>{quote.valid_until&&<small>Valable jusqu’au {new Date(quote.valid_until).toLocaleDateString("fr-FR")}</small>}</div></div>
        <div className="recipient-block"><small>Destinataire</small><b>{quote.recipient_name}</b><span>{quote.recipient_address||""}</span><span>{[quote.recipient_email,quote.recipient_phone].filter(Boolean).join(" · ")}</span></div>
        <h3 className="document-subject">{quote.subject}</h3>
        <div className="line-table"><div className="line-head"><span>Description</span><span>Qté</span><span>Prix unitaire</span><span>Total</span></div>{(items||[]).map((item)=><div className="line-row" key={item.id}><span>{item.description}</span><span>{Number(item.quantity).toLocaleString("fr-FR")}</span><span>{fmt(Number(item.unit_price))}</span><strong>{fmt(Number(item.quantity)*Number(item.unit_price))}</strong></div>)}{!items?.length&&<div className="empty-line">Ajoutez au moins une ligne au devis.</div>}</div>
        <div className="document-total"><span>Total</span><strong>{fmt(Number(quote.total||0))}</strong></div>
        {quote.notes&&<div className="document-notes"><b>Note</b><p>{quote.notes}</p></div>}
      </article>

      <aside className="document-tools">
        <article className="panel">
          <span className="eyebrow">Actions</span><h2>Devis</h2>
          <div className="tool-stack">
            <a className="button secondary" href={"/api/documents/quotes/"+quote.id}>Télécharger PDF</a>
            {quote.status==="draft"&&<form action={updateQuoteStatus}><input type="hidden" name="quote_id" value={quote.id}/><input type="hidden" name="status" value="issued"/><button className="button primary">Marquer envoyé</button></form>}
            {quote.status!=="cancelled"&&quote.status!=="accepted"&&<form action={updateQuoteStatus}><input type="hidden" name="quote_id" value={quote.id}/><input type="hidden" name="status" value="cancelled"/><button className="button danger-button">Annuler le devis</button></form>}
          </div>
        </article>

        {editable&&<form action={addQuoteItem} className="panel form-stack">
          <input type="hidden" name="quote_id" value={quote.id}/>
          <div><span className="eyebrow">Ligne</span><h2>Ajouter un élément</h2></div>
          <label>Description<input name="description" required/></label>
          <label>Quantité<input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" required/></label>
          <label>Prix unitaire (Ar)<input name="unit_price" type="number" min="0" step="1" required/></label>
          <button className="button secondary">Ajouter la ligne</button>
        </form>}

        {finance&&<form action={uploadFinancialAttachment} className="panel form-stack" encType="multipart/form-data">
          <input type="hidden" name="entity_type" value="quote"/>
          <input type="hidden" name="entity_id" value={quote.id}/>
          <div><span className="eyebrow">Justificatif</span><h2>Ajouter une pièce</h2></div>
          <label>PDF ou image<input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required/></label>
          <small className="muted">5 Mo maximum. Le fichier reste privé.</small>
          <button className="button secondary">Téléverser</button>
        </form>}

        {canConvert&&<form action={convertQuote} className="panel form-stack">
          <input type="hidden" name="quote_id" value={quote.id}/>
          <div><span className="eyebrow">Conversion</span><h2>Créer la facture</h2></div>
          <label>Échéance<input name="due_at" type="date"/></label>
          <p className="muted">La facture reprend automatiquement le destinataire et toutes les lignes du devis.</p>
          <button className="button primary">Convertir en facture</button>
        </form>}
      </aside>
    </div>
    {finance&&<article className="panel attachment-panel">
      <div className="panel-head"><div><span className="eyebrow">Pièces jointes</span><h2>Documents privés</h2></div><span>{attachments.length}</span></div>
      <div className="attachment-list">{attachments.map((file)=><a href={"/api/financial-files/"+file.id} key={file.id}><span><b>{file.file_name}</b><small>{file.content_type||"fichier"} · {Math.max(1,Math.round(Number(file.size_bytes||0)/1024))} Ko</small></span><strong>↓</strong></a>)}{!attachments.length&&<p>Aucune pièce jointe.</p>}</div>
    </article>}
  </section>
}
