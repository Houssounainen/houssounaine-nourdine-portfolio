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
  const header = <header className="shop-hero shop-hero-pay pay-hero">
    <div className="shop-hero-text">
      <span className="shop-hero-kicker"><UiIcon name="lock"/>Paiement mobile sécurisé</span>
      <h1>Paiements</h1>
      <p>Réglez votre cotisation par MVola, Orange Money ou Airtel Money. Le reçu est généré dès la validation.</p>
      <div className="pay-hero-ops" aria-hidden="true">{(Object.keys(OPERATORS) as Operator[]).map(key => <span key={key} className={`pay-op-mark op-${key}`}>{OPERATORS[key].short}</span>)}</div>
    </div>
    <div className="shop-hero-side"><Link className="button shop-hero-cta" href="/me#carte"><UiIcon name="user"/>Mon espace</Link></div>
    <span className="shop-hero-deco" aria-hidden="true"><UiIcon name="wallet"/></span>
  </header>;
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
  const inProgress = Boolean(selected && ["initiated", "rejected", "pending_provider"].includes(selected.status));
  const step = selected?.status === "confirmed" && params.id === selected.id ? 4 : selected?.status === "submitted" && params.id === selected.id ? 3 : inProgress ? 2 : 1;
  const steps = ["Montant", "Paiement", "Vérification", "Reçu"];

  return <section className="page pay-page">
    {header}
    {params.erreur && <p className="error-box" role="alert">{params.erreur}</p>}

    {cycles.length > 0 || selected ? <ol className="pay-stepper" aria-label="Étapes du paiement">
      {steps.map((label, index) => {
        const n = index + 1;
        const state = n < step || (step === 4 && n === 4) ? "done" : n === step ? "current" : "todo";
        return <li key={label} className={`is-${state}`} aria-current={state === "current" ? "step" : undefined}>
          <span>{state === "done" ? <UiIcon name="check"/> : n}</span><b>{label}</b>
        </li>;
      })}
    </ol> : null}

    <div className="pay-layout">
      <div className="pay-main">
        {selected && ["initiated", "rejected"].includes(selected.status) && isOperator(selected.operator) && <article className="panel">
          <div className="pay-head"><span className={`pay-op-mark lg op-${selected.operator}`} aria-hidden="true">{OPERATORS[selected.operator].short}</span><div><small>Paiement {selected.reference}</small><h2>{ariary(selected.amount)} via {OPERATORS[selected.operator].label}</h2></div><form action={cancelPayment}><input type="hidden" name="id" value={selected.id}/><button className="button secondary">Annuler</button></form></div>
          <PayInstructions payment={selected} merchantNumber={numbers[selected.operator] || ""} holder={settings.get("mobile_money_holder") || ""} extra={settings.get("mobile_money_instructions") || ""}/>
        </article>}

        {selected?.status === "pending_provider" && <article className="panel"><ProviderWaiting id={selected.id}/></article>}

        {selected && ["submitted", "confirmed"].includes(selected.status) && params.id === selected.id && <article className={`panel pay-done pay-ticket${selected.status === "confirmed" ? " is-ok" : ""}`}>
          <span className="pay-done-icon"><UiIcon name={selected.status === "confirmed" ? "check" : "clock"}/></span>
          <h2>{selected.status === "confirmed" ? "Paiement validé" : "Paiement déclaré"}</h2>
          <p>{selected.status === "confirmed" ? <>{ariary(selected.amount)} enregistrés sur votre cotisation. Le reçu est disponible dans la rubrique « Reçus ».</> : <>La trésorerie vérifie la transaction. Vous recevrez une notification et votre reçu dès la validation.</>}</p>
          <dl className="pay-ticket-lines">
            <div><dt>Montant</dt><dd className="pay-ticket-amount">{ariary(selected.amount)}</dd></div>
            {isOperator(selected.operator) && <div><dt>Opérateur</dt><dd><i className="pay-dot" style={{ background: OPERATORS[selected.operator].color }} aria-hidden="true"/>{OPERATORS[selected.operator].label}</dd></div>}
            <div><dt>Référence</dt><dd className="mono">{selected.reference}</dd></div>
            {selected.transaction_id && <div><dt>Transaction</dt><dd className="mono">{selected.transaction_id}</dd></div>}
            <div><dt>Date</dt><dd>{new Date(selected.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
            <div><dt>Statut</dt><dd><span className={`badge ${PAYMENT_STATUS[selected.status]?.tone || ""}`}>{PAYMENT_STATUS[selected.status]?.label || selected.status}</span></dd></div>
          </dl>
        </article>}

        {!inProgress && <article className="panel pay-checkout">
          <div className={`pay-summary${cycles.length ? "" : " is-clear"}`}>
            <div className="pay-summary-top">
              <span><UiIcon name={cycles.length ? "wallet" : "check"}/>Cotisation AEDBVT</span>
              <small>{member.full_name}</small>
            </div>
            <small className="pay-summary-label">{cycles.length ? "Reste à régler" : "Situation"}</small>
            <strong className="pay-summary-amount">{cycles.length ? ariary(totalDue) : "Vous êtes à jour"}</strong>
            <div className="pay-summary-foot">{cycles.length ? cycles.map(cycle => <span key={cycle.id}>{cycle.label} · {ariary(cycle.balance)}</span>) : <span>Aucune cotisation en attente. Merci !</span>}</div>
          </div>
          {cycles.length ? <PayForm cycles={cycles} numbers={numbers} defaultPhone={member.phone || ""} apiOperators={apiOperators}/> : null}
        </article>}
      </div>

      <aside className="pay-side">
        <article className="panel list-card">
          <header><h2>Historique</h2></header>
          {payments.map(payment => <Link key={payment.id} className="list-row pay-history-row" href={`/pay?id=${payment.id}`} style={{ gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
            {isOperator(payment.operator) ? <span className={`pay-op-mark op-${payment.operator}`} aria-hidden="true">{OPERATORS[payment.operator].short}</span> : <i className="pay-dot" style={{ background: "var(--faint)" }} aria-hidden="true"/>}
            <div><b>{ariary(payment.amount)}</b><small>{payment.reference} · {relativeTime(payment.created_at)}</small></div>
            <span className={`badge ${PAYMENT_STATUS[payment.status]?.tone || ""}`}>{PAYMENT_STATUS[payment.status]?.label || payment.status}</span>
          </Link>)}
          {!payments.length && <p className="list-empty pay-empty"><UiIcon name="receipt"/>Aucun paiement mobile pour l’instant.</p>}
        </article>
        {!!receipts?.length && <article className="panel list-card">
          <header><h2>Reçus</h2><Link href="/me">Tout voir</Link></header>
          {receipts.map((receipt, index) => <a key={receipt.id || index} className="list-row pay-history-row" href={`/api/receipts/${receipt.id}`} style={{ gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
            <span className="icon-tile" style={{ "--tile": "#079455" } as React.CSSProperties} aria-hidden="true"><UiIcon name="receipt"/></span>
            <div><b>{receipt.receipt_number || "Reçu"}</b><small>{receipt.method} · {receipt.paid_at ? new Date(receipt.paid_at).toLocaleDateString("fr-FR") : ""}</small></div>
            <span className="meta">{ariary(Number(receipt.amount))}</span>
          </a>)}
        </article>}
        <p className="pay-safety"><UiIcon name="shield"/><span>Ne communiquez jamais votre code secret. L’AEDBVT ne vous le demandera pas.</span></p>
      </aside>
    </div>
  </section>;
}
