import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccessContext } from "@/lib/server-access";
import { OPERATORS, PAYMENT_STATUS, ariary, formatPhone, isOperator } from "@/lib/mobile-money";
import { isMissingTable, relativeTime } from "@/lib/format";
import { Sheet, Tabs } from "@/components/sheet";
import { UiIcon } from "@/components/ui-icon";
import { recheckProviderPayment, reviewMobilePayment } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paiements mobiles" };

type Row = { id: string; reference: string; amount: number; operator: string; channel: string; status: string; payer_phone: string; transaction_id: string | null; proof_path: string | null; rejection_reason: string | null; created_at: string; submitted_at: string | null; reviewed_at: string | null; payment_id: string | null; members: { full_name: string; member_number: string | null } | { full_name: string; member_number: string | null }[] | null; membership_dues_cycles: { label: string } | { label: string }[] | null };

const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] || null : value;

export default async function MobilePaymentsReviewPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const params = await searchParams;
  const context = await getAccessContext("finance_manage");
  if (!context.allowed) notFound();
  const { data, error } = await context.supabase.from("mobile_payments")
    .select("id,reference,amount,operator,channel,status,payer_phone,transaction_id,proof_path,rejection_reason,created_at,submitted_at,reviewed_at,payment_id,members(full_name,member_number),membership_dues_cycles(label)")
    .neq("status", "cancelled").order("created_at", { ascending: false }).limit(200);

  const header = <header className="page-header"><div><h1>Paiements mobiles</h1><p>Vérifiez chaque transaction dans votre application MVola, Orange Money ou Airtel Money avant de valider.</p></div><div className="header-actions"><Link className="button secondary" href="/admin/settings#paiement">Numéros marchands</Link><Link className="button secondary" href="/finance">Finances</Link></div></header>;
  if (error) return <section className="page">{header}<p className="notice">{isMissingTable(error) ? "Le module sera disponible après l’activation de la base de données." : "Chargement impossible."}</p></section>;

  const rows = (data || []) as Row[];
  const proofs = rows.filter(row => row.proof_path).map(row => row.proof_path!) ;
  const signed = proofs.length ? (await context.supabase.storage.from("payment-proofs").createSignedUrls(proofs, 900)).data || [] : [];
  const proofUrl = (path: string | null) => signed.find(item => item.path === path)?.signedUrl || undefined;
  const pending = rows.filter(row => ["submitted", "pending_provider"].includes(row.status));
  const done = rows.filter(row => !["submitted", "pending_provider", "initiated"].includes(row.status));
  const today = new Date().toDateString();
  const confirmedToday = rows.filter(row => row.status === "confirmed" && row.reviewed_at && new Date(row.reviewed_at).toDateString() === today);

  const item = (row: Row, actions: boolean) => {
    const member = one(row.members);
    const cycle = one(row.membership_dues_cycles);
    const op = isOperator(row.operator) ? OPERATORS[row.operator] : null;
    return <div className="review-row" key={row.id}>
      <i className="pay-dot" style={{ background: op?.color || "var(--faint)" }} aria-hidden="true"/>
      <div className="review-main">
        <b>{member?.full_name || "Membre"} <span className="muted">{member?.member_number || ""}</span></b>
        <small>{op?.label || row.operator} · {formatPhone(row.payer_phone)} · {cycle?.label || "Don"} · {relativeTime(row.submitted_at || row.created_at)}</small>
        <div className="review-ids">
          <span>Réf. <code>{row.reference}</code></span>
          {row.transaction_id && <span>Transaction <code>{row.transaction_id}</code></span>}
          {row.channel === "api" && <span className="badge">API MVola</span>}
          {proofUrl(row.proof_path) && <a href={proofUrl(row.proof_path)} target="_blank" rel="noreferrer"><UiIcon name="image"/>Capture</a>}
          {row.rejection_reason && <span className="muted">Motif : {row.rejection_reason}</span>}
        </div>
      </div>
      <strong className="review-amount">{ariary(Number(row.amount))}</strong>
      {actions ? <div className="review-actions">
        {row.status === "pending_provider" ? <form action={recheckProviderPayment}><input type="hidden" name="id" value={row.id}/><button className="button secondary">Revérifier</button></form> : <>
          <Sheet label="Refuser" title="Refuser le paiement" description={`${row.reference} · ${ariary(Number(row.amount))}`} icon="close" variant="secondary">
            <form action={reviewMobilePayment} className="form-stack"><input type="hidden" name="id" value={row.id}/><input type="hidden" name="decision" value="reject"/>
              <label>Motif communiqué au membre<select name="reason" defaultValue="Transaction introuvable chez l’opérateur."><option>Transaction introuvable chez l’opérateur.</option><option>Montant reçu différent du montant déclaré.</option><option>Identifiant de transaction incorrect.</option><option>Paiement envoyé au mauvais numéro.</option></select></label>
              <button className="button danger">Refuser</button>
            </form>
          </Sheet>
          <form action={reviewMobilePayment}><input type="hidden" name="id" value={row.id}/><input type="hidden" name="decision" value="approve"/><button className="button primary"><UiIcon name="check"/>Valider</button></form>
        </>}
      </div> : <span className={`badge ${PAYMENT_STATUS[row.status]?.tone || ""}`}>{PAYMENT_STATUS[row.status]?.label || row.status}</span>}
    </div>;
  };

  return <section className="page">
    {header}
    {params.erreur && <p className="error-box" role="alert">{params.erreur}</p>}
    <div className="stat-grid">
      <article><small>À vérifier</small><strong>{pending.length}</strong><span>{ariary(pending.reduce((sum, row) => sum + Number(row.amount), 0))}</span></article>
      <article><small>Validés aujourd’hui</small><strong>{confirmedToday.length}</strong><span>{ariary(confirmedToday.reduce((sum, row) => sum + Number(row.amount), 0))}</span></article>
      <article><small>Validés au total</small><strong>{rows.filter(row => row.status === "confirmed").length}</strong><span>{ariary(rows.filter(row => row.status === "confirmed").reduce((sum, row) => sum + Number(row.amount), 0))}</span></article>
    </div>
    <Tabs tabs={[
      { id: "a-verifier", label: "À vérifier", count: pending.length, content: <article className="panel review-list">{pending.map(row => item(row, true))}{!pending.length && <p className="list-empty">Aucun paiement en attente.</p>}</article> },
      { id: "historique", label: "Historique", count: done.length, content: <article className="panel review-list">{done.map(row => item(row, false))}{!done.length && <p className="list-empty">Aucun paiement traité.</p>}</article> },
    ]}/>
  </section>;
}
