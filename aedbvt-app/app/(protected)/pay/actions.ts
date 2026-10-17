"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMvolaApiEnabled, requestMvolaPayment } from "@/lib/mvola";
import { isOperator, normalizePhone, OPERATORS } from "@/lib/mobile-money";
import { notifyTreasury, syncProviderPayment } from "@/lib/mobile-payments-server";

const fail = (message: string) => redirect("/pay?erreur=" + encodeURIComponent(message));
const clean = (error: { message?: string } | null) => (error?.message || "Opération impossible.").replace(/^.*?ERROR:\s*/, "").slice(0, 200);

export async function startPayment(formData: FormData) {
  const context = await getAccessContext();
  if (!context.allowed) redirect("/login");
  const operator = String(formData.get("operator") || "");
  if (!isOperator(operator)) fail("Choisissez un opérateur.");
  const amount = Math.round(Number(formData.get("amount") || 0));
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const cycle = String(formData.get("cycle_id") || "") || null;
  if (!(amount > 0)) fail("Indiquez un montant.");
  if (phone.length !== 10) fail("Indiquez votre numéro au format 03X XX XXX XX.");
  const viaApi = operator === "mvola" && formData.get("mode") === "api" && isMvolaApiEnabled();

  const { data, error } = await context.supabase.rpc("start_mobile_payment", { p_operator: operator, p_cycle_id: cycle, p_amount: amount, p_phone: phone, p_channel: viaApi ? "api" : "manual" });
  if (error || !data) fail(clean(error));
  const payment = data as { id: string; reference: string };

  if (viaApi) {
    const admin = createAdminClient();
    try {
      const result = await requestMvolaPayment({ id: payment.id, reference: payment.reference, amount, payerPhone: phone, description: `Cotisation AEDBVT ${payment.reference}` });
      await admin?.rpc("attach_provider_correlation", { p_id: payment.id, p_correlation: result.serverCorrelationId });
    } catch {
      await admin?.rpc("provider_settle_mobile_payment", { p_id: payment.id, p_success: false, p_transaction_id: "", p_payload: { error: "request_failed" } });
      fail("MVola n’a pas pu envoyer la demande. Réessayez ou payez manuellement.");
    }
  }
  revalidatePath("/pay");
  redirect("/pay?id=" + payment.id);
}

export async function submitPayment(formData: FormData) {
  const context = await getAccessContext();
  if (!context.allowed) redirect("/login");
  const id = String(formData.get("id") || "");
  const proof = String(formData.get("proof_path") || "") || null;
  const { data, error } = await context.supabase.rpc("submit_mobile_payment", { p_id: id, p_transaction_id: String(formData.get("transaction_id") || ""), p_proof_path: proof });
  if (error || !data) redirect(`/pay?id=${id}&erreur=` + encodeURIComponent(clean(error)));
  const payment = data as { reference: string; amount: number; operator: string };
  await notifyTreasury(payment.reference, Number(payment.amount), OPERATORS[payment.operator as keyof typeof OPERATORS]?.label || payment.operator);
  revalidatePath("/pay");
  revalidatePath("/finance/mobile");
  redirect("/pay?id=" + id);
}

export async function cancelPayment(formData: FormData) {
  const context = await getAccessContext();
  if (!context.allowed) redirect("/login");
  await context.supabase.rpc("cancel_mobile_payment", { p_id: String(formData.get("id") || "") });
  revalidatePath("/pay");
  redirect("/pay");
}

/** Interrogé par la page pendant qu’un paiement MVola attend la confirmation du membre. */
export async function refreshProviderPayment(id: string) {
  const context = await getAccessContext();
  if (!context.allowed) return null;
  const { data } = await context.supabase.from("mobile_payments").select("id,status").eq("id", id).maybeSingle();
  if (!data) return null;
  if (data.status !== "pending_provider") return data.status as string;
  return syncProviderPayment(id);
}
