import Link from "next/link";
import { getAccessContext } from "@/lib/server-access";
import { isMvolaApiEnabled } from "@/lib/mvola";
import { OPERATORS, PAYMENT_STATUS, ariary, isOperator, type Operator } from "@/lib/mobile-money";
import { isMissingTable, relativeTime } from "@/lib/format";
import { PayForm, PayInstructions, ProviderWaiting } from "@/components/pay-flow";
import { UiIcon } from "@/components/ui-icon";
import { cancelPayment } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paiements" };

type MobilePayment = { id: string; reference: string; amount: number; operator: Operator; status: string; channel: string; transaction_id: string | null; rejection_reason: string | null; created_at: string; payment_id: string | null };

export default async function PayPage({ searchParams }: { searchParams: Promise<{ id?: string; erreur?: string }> }) {
  const params = await searchParams;
  const context = await getAccessContext();
  const supabase = context.supabase;
  const userId = context.user!.id;

  const { data: member } = await supabase.from("members").select("id,phone,full_name").eq("profile_id", userId).maybeSingle();
  const header = <header className="page-header"><div><h1>Paiements</h1><p>Réglez votre cotisation par MVola, Orange Money ou Airtel Money. Le reçu est généré dès la validation.</p></div><Link className="button secondary" href="/me#carte">Mon espace</Link></header>;
  if (!member) return <section className="page">{header}<p className="notice">Votre compte n’est pas encore lié à une fiche membre. Contactez le secrétariat.</p></section>;

  const [{ data: dues }, settingsResult, paymentsResult, { data: receipts }] = await Promise.all([
    supabase.from("member_dues_overview").select("cycle_id,cycle_label,cycle_status,balance,amount_due,waived_amount,paid_amount,due_on,current_status").eq("member_id", member.id).order("starts_on", { ascending: false }),
    supabase.rpc("get_mobile_money_settings"),
    supabase.from("mobile_payments").select("id,reference,amount,operator,status,channel,transaction_id,rejection_reason,created_at,payment_id").eq("profile_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("payments").select("id,amount,method,receipt_number,paid_at").eq("member_id", member.id).eq("status", "confirmed").order("paid_at", { ascending: false }).limit(5),
  ]);

  if (paymentsResult.error && isMissingTable(paymentsResult.error)) return <section className="page">{header}<p className="notice">Le paiement mobile sera disponible après l’activation du module par l’administration.</p></section>;

  const settings = new Map(((settingsResult.data || []) as { key: string; value: unknown }[]).map(row => [row.key, typeof row.value === "string" ? row.value : String(row.value ?? "")]));
  const numbers: Partial<Record<Operator, string>> = {};
  (Object.keys(OPERATORS) as Operator[]).forEach(key => { const value = settings.get(OPERATORS[key].settingKey); if (value) numbers[key] = value; });
  const apiOperators: Operator[] = isMvolaApiEnabled() ? ["mvola"] : [];
  const cycles = ((dues || []) as { cycle_id: string; cycle_label: string; cycle_status: string; balance: number }[])
    .filter(row => row.cycle_status === "open" && Number(row.balance) > 0)
    .map(row => ({ id: row.cycle_id, label: row.cycle_label, balance: Number(row.balance) }));
  const payments = (paymentsResult.data || []) as MobilePayment[];
  const selected = payments.find(payment => payment.id === params.id) || payments.find(payment => ["initiated", "pending_provider"].includes(payment.status));
  const totalDue = cycles.reduce((sum, cycle) => sum + cycle.balance, 0);

  return <section className="page pay-page">
    {header}
    {params.erreur && <p className="error-box" role="alert">{params.erreur}</p>}

    <div className="pay-layout">
      <div className="pay-main">
        {selected && ["initiated", "rejected"].includes(selected.status) && isOperator(selected.operator) && <article className="panel">
          <div className="pay-head"><div><small>Paiement {selected.reference}</small><h2>{ariary(selected.amount)} via {OPERATORS[selected.operator].label}</h2></div><form action={cancelPayment}><input type="hidden" name="id" value={selected.id}/><button className="button secondary">Annuler</button></form></div>
          <PayInstructions payment={selected} merchantNumber={numbers[selected.operator] || ""} holder={settings.get("mobile_money_holder") || ""} extra={settings.get("mobile_money_instructions") || ""}/>
        </article>}

        {selected?.status === "pending_provider" && <article className="panel"><ProviderWaiting id={selected.id}/></article>}

        {selected?.status === "submitted" && params.id === selected.id && <article className="panel pay-done">
          <span className="pay-done-icon"><UiIcon name="clock"/></span>
          <h2>Paiement déclaré</h2>
          <p>La trésorerie vérifie la transaction {selected.transaction_id}. Vous recevrez une notification et votre reçu dès la validation.</p>
        </article>}

        {selected?.status === "confirmed" && params.id === selected.id && <article className="panel pay-done is-ok">
          <span className="pay-done-icon"><UiIcon name="check"/></span>
          <h2>Paiement validé</h2>
          <p>{ariary(selected.amount)} enregistrés sur votre cotisation. Le reçu est disponible ci-dessous.</p>
        </article>}

        {!(selected && ["initiated", "rejected", "pending_provider"].includes(selected.status)) && <article className="panel">
          <div className="pay-head"><div><small>Cotisation</small><h2>{cycles.length ? `Reste à régler : ${ariary(totalDue)}` : "Vous êtes à jour"}</h2></div></div>
          {cycles.length ? <PayForm cycles={cycles} numbers={numbers} defaultPhone={member.phone || ""} apiOperators={apiOperators}/> : <p className="muted">Aucune cotisation en attente. Merci !</p>}
        </article>}
      </div>

      <aside className="pay-side">
        <article className="panel list-card">
          <header><h2>Historique</h2></header>
          {payments.map(payment => <Link key={payment.id} className="list-row" href={`/pay?id=${payment.id}`} style={{ gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
            <i className="pay-dot" style={{ background: isOperator(payment.operator) ? OPERATORS[payment.operator].color : "var(--faint)" }} aria-hidden="true"/>
            <div><b>{ariary(payment.amount)}</b><small>{payment.reference} · {relativeTime(payment.created_at)}</small></div>
            <span className={`badge ${PAYMENT_STATUS[payment.status]?.tone || ""}`}>{PAYMENT_STATUS[payment.status]?.label || payment.status}</span>
          </Link>)}
          {!payments.length && <p className="list-empty">Aucun paiement mobile.</p>}
        </article>
        {!!receipts?.length && <article className="panel list-card">
          <header><h2>Reçus</h2><Link href="/me">Tout voir</Link></header>
          {receipts.map(receipt => <a key={receipt.id} className="list-row" href={`/api/receipts/${receipt.id}`} style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
            <div><b>{receipt.receipt_number || "Reçu"}</b><small>{receipt.method} · {receipt.paid_at ? new Date(receipt.paid_at).toLocaleDateString("fr-FR") : ""}</small></div>
            <span className="meta">{ariary(Number(receipt.amount))}</span>
          </a>)}
        </article>}
        <p className="muted pay-safety">Ne communiquez jamais votre code secret. L’AEDBVT ne vous le demandera pas.</p>
      </aside>
    </div>
  </section>;
}
