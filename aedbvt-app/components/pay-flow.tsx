"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { uploadImage } from "@/lib/media";
import { OPERATORS, ariary, formatPhone, guessOperator, ussdHref, type Operator } from "@/lib/mobile-money";
import { UiIcon } from "@/components/ui-icon";
import { refreshProviderPayment, startPayment, submitPayment } from "@/app/(protected)/pay/actions";

function Submit({ children, pending }: { children: React.ReactNode; pending: string }) {
  const status = useFormStatus();
  return <button className="button primary pay-submit" disabled={status.pending}>{status.pending ? pending : children}</button>;
}

export function CopyValue({ label, value, display, mono = true }: { label: string; value: string; display?: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return <div className="pay-copy">
    <span>{label}</span>
    <b className={mono ? "mono" : undefined}>{display || value}</b>
    <button type="button" className="icon-button" aria-label={`Copier ${label.toLowerCase()}`} onClick={async () => { try { await navigator.clipboard.writeText(value.replace(/\s/g, "")); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}>
      <UiIcon name={copied ? "check" : "copy"}/>
    </button>
  </div>;
}

type Cycle = { id: string; label: string; balance: number };

export function PayForm({ cycles, numbers, defaultPhone, apiOperators }: { cycles: Cycle[]; numbers: Partial<Record<Operator, string>>; defaultPhone: string; apiOperators: Operator[] }) {
  const available = (Object.keys(OPERATORS) as Operator[]).filter(key => numbers[key] || apiOperators.includes(key));
  const [cycleId, setCycleId] = useState(cycles[0]?.id || "");
  const cycle = cycles.find(item => item.id === cycleId);
  const [amount, setAmount] = useState(cycle?.balance || 0);
  const [phone, setPhone] = useState(defaultPhone);
  const [operator, setOperator] = useState<Operator | "">(guessOperator(defaultPhone) && available.includes(guessOperator(defaultPhone)!) ? guessOperator(defaultPhone)! : available[0] || "");

  useEffect(() => { setAmount(cycle?.balance || 0); }, [cycle?.balance]);
  if (!available.length) return <p className="notice">Le paiement mobile n’est pas encore configuré par la trésorerie. Réglez votre cotisation auprès du trésorier.</p>;

  const api = operator !== "" && apiOperators.includes(operator);
  return <form action={startPayment} className="form-stack pay-form">
    {cycles.length > 1 && <label>Exercice<select name="cycle_id" value={cycleId} onChange={event => setCycleId(event.target.value)}>{cycles.map(item => <option key={item.id} value={item.id}>{item.label} · reste {ariary(item.balance)}</option>)}</select></label>}
    {cycles.length <= 1 && <input type="hidden" name="cycle_id" value={cycleId}/>}
    <fieldset className="pay-operators">
      <legend>Choisissez votre opérateur</legend>
      {available.map(key => <label key={key} className={`pay-operator op-${key}${operator === key ? " is-selected" : ""}`}>
        <input type="radio" name="operator" value={key} checked={operator === key} onChange={() => setOperator(key)}/>
        <span className={`pay-op-mark lg op-${key}`} aria-hidden="true">{OPERATORS[key].short}</span>
        <span><b>{OPERATORS[key].label}</b><small>{apiOperators.includes(key) ? "Confirmation sur votre téléphone" : `Envoi au ${formatPhone(numbers[key] || "")}`}</small></span>
        <span className="pay-operator-check" aria-hidden="true"><UiIcon name="check"/></span>
      </label>)}
    </fieldset>
    <div className="form-two">
      <label>Montant (Ar)<input name="amount" type="number" inputMode="numeric" min={100} max={cycle?.balance || undefined} step={100} required value={amount || ""} onChange={event => setAmount(Number(event.target.value))}/></label>
      <label>Votre numéro<input name="phone" type="tel" inputMode="tel" required value={phone} placeholder="034 00 000 00" onChange={event => { setPhone(event.target.value); const guess = guessOperator(event.target.value); if (guess && available.includes(guess)) setOperator(guess); }}/></label>
    </div>
    {cycle && amount < cycle.balance && amount > 0 && <p className="muted" style={{ margin: 0 }}>Paiement partiel : il restera {ariary(cycle.balance - amount)} à régler.</p>}
    {api && <input type="hidden" name="mode" value="api"/>}
    <Submit pending={api ? "Envoi de la demande…" : "Préparation…"}>{api ? `Payer ${ariary(amount || 0)} avec MVola` : `Continuer · ${ariary(amount || 0)}`}</Submit>
  </form>;
}

export function PayInstructions({ payment, merchantNumber, holder, extra }: { payment: { id: string; reference: string; amount: number; operator: Operator; status: string; rejection_reason?: string | null }; merchantNumber: string; holder: string; extra?: string }) {
  const op = OPERATORS[payment.operator];
  const [proof, setProof] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onProof(file?: File) {
    if (!file) return;
    setBusy(true); setError("");
    try { setProof((await uploadImage(file, { bucket: "payment-proofs", folder: "proofs", maxSize: 1400 })).path); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Échec de l’envoi."); }
    finally { setBusy(false); }
  }

  return <div className="pay-steps">
    {payment.status === "rejected" && <p className="error-box">Paiement refusé : {payment.rejection_reason || "transaction introuvable"}. Vérifiez l’identifiant et déclarez-le à nouveau.</p>}
    <ol>
      <li>
        <h3>Envoyez le paiement {op.label}</h3>
        <p>Composez <a className="mono" href={ussdHref(op.ussd)}>{op.ussd}</a>, choisissez « Transfert d’argent » ou « Paiement marchand » et utilisez ces informations :</p>
        <div className="pay-copy-grid">
          <CopyValue label="Numéro" value={formatPhone(merchantNumber)}/>
          <CopyValue label="Montant" value={String(Math.round(payment.amount))} display={ariary(payment.amount)}/>
          <CopyValue label="Motif / référence" value={payment.reference}/>
        </div>
        {holder && <p className="muted" style={{ margin: "8px 0 0" }}>Bénéficiaire : {holder}</p>}
        {extra && <p className="muted" style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{extra}</p>}
        <a className="button secondary" href={ussdHref(op.ussd)} style={{ marginTop: 12 }}><UiIcon name="phone"/>Ouvrir {op.label} ({op.ussd})</a>
      </li>
      <li>
        <h3>Déclarez la transaction</h3>
        <p>Recopiez l’identifiant reçu par SMS après le paiement. La trésorerie le vérifie, puis votre reçu est généré.</p>
        <form action={submitPayment} className="form-stack">
          <input type="hidden" name="id" value={payment.id}/>
          <input type="hidden" name="proof_path" value={proof}/>
          <label>Identifiant de transaction<input name="transaction_id" required minLength={4} maxLength={80} autoComplete="off" autoCapitalize="characters" placeholder="Ex. 1234567890 ou MP231017.1234.A12345"/></label>
          <label className="pay-proof">
            <input type="file" accept="image/*" disabled={busy} onChange={event => { void onProof(event.target.files?.[0]); event.target.value = ""; }}/>
            <UiIcon name={proof ? "check" : "camera"}/><span>{busy ? "Envoi…" : proof ? "Capture jointe" : "Joindre une capture du SMS (facultatif)"}</span>
          </label>
          {error && <p className="field-error">{error}</p>}
          <Submit pending="Envoi…">Déclarer le paiement</Submit>
        </form>
      </li>
    </ol>
  </div>;
}

/** Attente de la confirmation sur le téléphone (API MVola) : vérifie l’état toutes les 4 secondes. */
export function ProviderWaiting({ id }: { id: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setSeconds(value => value + 1), 1000);
    const poll = setInterval(async () => {
      const status = await refreshProviderPayment(id).catch(() => null);
      if (status && status !== "pending_provider") router.refresh();
    }, 4000);
    const stop = setTimeout(() => { clearInterval(poll); }, 5 * 60 * 1000);
    return () => { clearInterval(tick); clearInterval(poll); clearTimeout(stop); };
  }, [id, router]);
  return <div className="pay-waiting">
    <span className="pay-spinner" aria-hidden="true"/>
    <h3>Confirmez sur votre téléphone</h3>
    <p>Une demande MVola vient d’être envoyée. Saisissez votre code secret pour valider le paiement.</p>
    <small>{seconds < 300 ? `En attente depuis ${seconds} s` : "Toujours rien ? Actualisez la page ou payez manuellement."}</small>
  </div>;
}
