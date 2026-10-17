"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/server-access";
import { sendPushToProfiles } from "@/lib/push";
import { syncProviderPayment } from "@/lib/mobile-payments-server";

export async function reviewMobilePayment(formData: FormData) {
  const { allowed, supabase } = await getAccessContext("finance_manage");
  if (!allowed) return;
  const approve = formData.get("decision") === "approve";
  const { data, error } = await supabase.rpc("review_mobile_payment", { p_id: String(formData.get("id") || ""), p_approve: approve, p_reason: String(formData.get("reason") || "") });
  if (error || !data) redirect("/finance/mobile?erreur=" + encodeURIComponent((error?.message || "Validation impossible.").slice(0, 200)));
  const payment = data as { profile_id: string; amount: number; reference: string; rejection_reason: string | null };
  await sendPushToProfiles([payment.profile_id], {
    title: approve ? "Paiement validé" : "Paiement refusé",
    body: approve ? `${Math.round(Number(payment.amount)).toLocaleString("fr-FR")} Ar · ${payment.reference}. Votre reçu est disponible.` : `${payment.reference} : ${payment.rejection_reason || "transaction introuvable"}.`,
    url: "/pay",
    tag: "mobile-payment",
  }, "administration").catch(() => undefined);
  revalidatePath("/finance/mobile");
  revalidatePath("/finance");
  revalidatePath("/finance/dues");
}

export async function recheckProviderPayment(formData: FormData) {
  const { allowed } = await getAccessContext("finance_manage");
  if (!allowed) return;
  await syncProviderPayment(String(formData.get("id") || ""));
  revalidatePath("/finance/mobile");
}
