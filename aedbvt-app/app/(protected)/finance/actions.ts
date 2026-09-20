"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function financeAllowed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, supabase, user: null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { ok: ["admin","bureau","tresorier"].includes(profile?.role || ""), supabase, user };
}

export async function addPayment(formData: FormData) {
  const { ok, supabase, user } = await financeAllowed();
  if (!ok || !user) return;
  const amount = Number(formData.get("amount") || 0);
  if (amount <= 0) return;

  await supabase.from("payments").insert({
    member_id: String(formData.get("member_id")),
    amount,
    method: String(formData.get("method") || "Espèces"),
    external_reference: String(formData.get("external_reference") || ""),
    status: "confirmed",
    paid_at: new Date().toISOString(),
    created_by: user.id,
  });
  revalidatePath("/finance");
}

export async function addExpense(formData: FormData) {
  const { ok, supabase, user } = await financeAllowed();
  if (!ok || !user) return;
  const amount = Number(formData.get("amount") || 0);
  if (amount <= 0) return;

  await supabase.from("expenses").insert({
    label: String(formData.get("label") || ""),
    amount,
    spent_at: String(formData.get("spent_at") || new Date().toISOString().slice(0,10)),
    created_by: user.id,
  });
  revalidatePath("/finance");
}
