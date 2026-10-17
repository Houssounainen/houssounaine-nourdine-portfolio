import { createAdminClient } from "@/lib/supabase/admin";
import { getMvolaStatus } from "@/lib/mvola";
import { sendPushToProfiles } from "@/lib/push";

/** Revérifie auprès de MVola un paiement en attente et le solde si l’opérateur l’a confirmé. */
export async function syncProviderPayment(id: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: payment } = await admin.from("mobile_payments").select("id,status,provider_correlation_id,profile_id,amount,reference").eq("id", id).maybeSingle();
  if (!payment || payment.status !== "pending_provider" || !payment.provider_correlation_id) return payment?.status || null;
  const status = await getMvolaStatus(payment.provider_correlation_id).catch(() => null);
  if (!status || status.status === "pending") return "pending_provider";
  const success = status.status === "completed";
  await admin.rpc("provider_settle_mobile_payment", { p_id: id, p_success: success, p_transaction_id: status.objectReference || "", p_payload: status });
  await sendPushToProfiles([payment.profile_id], {
    title: success ? "Paiement reçu" : "Paiement non abouti",
    body: success ? `${Math.round(Number(payment.amount)).toLocaleString("fr-FR")} Ar · ${payment.reference}. Votre reçu est disponible.` : "La transaction MVola n’a pas été confirmée.",
    url: "/pay",
    tag: "mobile-payment",
  }, "administration").catch(() => undefined);
  return success ? "confirmed" : "failed";
}

export async function notifyTreasury(reference: string, amount: number, operator: string) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data } = await admin.from("profiles").select("id").in("role", ["admin", "bureau", "tresorier"]).eq("active", true);
  await sendPushToProfiles((data || []).map(row => row.id), {
    title: "Paiement mobile à vérifier",
    body: `${Math.round(amount).toLocaleString("fr-FR")} Ar via ${operator} · ${reference}`,
    url: "/finance/mobile",
    tag: "mobile-payment-review",
  }, "administration").catch(() => undefined);
}
