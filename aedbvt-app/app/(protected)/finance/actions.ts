"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";

async function financeContext() {
  return getAccessContext("finance_manage");
}

export async function addPayment(formData: FormData) {
  const { allowed, supabase, user } = await financeContext();
  if (!allowed || !user) return;
  const amount = Number(formData.get("amount") || 0);
  const memberId = String(formData.get("member_id") || "");
  if (amount <= 0 || !memberId) return;

  await supabase.from("payments").insert({
    member_id: memberId,
    amount,
    dues_cycle_id:String(formData.get("dues_cycle_id")||"")||null,
    method: String(formData.get("method") || "Espèces"),
    external_reference: String(formData.get("external_reference") || "").trim() || null,
    category_id: String(formData.get("category_id") || "") || null,
    account_id: String(formData.get("account_id") || "") || null,
    notes: String(formData.get("notes") || "").trim() || null,
    status: "confirmed",
    paid_at: new Date().toISOString(),
    created_by: user.id,
  });

  revalidatePath("/finance");
  revalidatePath("/documents");
}

export async function addExpense(formData: FormData) {
  const { allowed, supabase, user } = await financeContext();
  if (!allowed || !user) return;
  const amount = Number(formData.get("amount") || 0);
  const label = String(formData.get("label") || "").trim();
  if (amount <= 0 || !label) return;

  await supabase.from("expenses").insert({
    label,
    amount,
    spent_at: String(formData.get("spent_at") || new Date().toISOString().slice(0,10)),
    category_id: String(formData.get("category_id") || "") || null,
    account_id: String(formData.get("account_id") || "") || null,
    payment_method: String(formData.get("payment_method") || "Espèces"),
    reference: String(formData.get("reference") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
    created_by: user.id,
  });

  revalidatePath("/finance");
}

export async function createBudget(formData: FormData) {
  const { allowed, supabase, user } = await financeContext();
  if (!allowed || !user) return;
  const label = String(formData.get("label") || "").trim();
  const startsOn = String(formData.get("starts_on") || "");
  const endsOn = String(formData.get("ends_on") || "");
  if (!label || !startsOn || !endsOn) return;

  await supabase.from("budget_years").insert({
    label,
    starts_on: startsOn,
    ends_on: endsOn,
    created_by: user.id,
  });
  revalidatePath("/finance");
}

export async function saveBudgetLine(formData: FormData) {
  const { allowed, supabase } = await financeContext();
  if (!allowed) return;
  const budgetId = String(formData.get("budget_id") || "");
  const categoryId = String(formData.get("category_id") || "");
  const planned = Number(formData.get("planned_amount") || 0);
  if (!budgetId || !categoryId || planned < 0) return;

  await supabase.from("budget_lines").upsert({
    budget_id: budgetId,
    category_id: categoryId,
    planned_amount: planned,
    notes: String(formData.get("notes") || "").trim() || null,
  }, { onConflict: "budget_id,category_id" });

  revalidatePath("/finance");
}

export async function approveBudget(formData: FormData) {
  const { allowed, supabase, user } = await financeContext();
  if (!allowed || !user) return;
  const budgetId = String(formData.get("budget_id") || "");
  if (!budgetId) return;

  await supabase.from("budget_years").update({
    status: "approved",
    approved_at: new Date().toISOString(),
    approved_by: user.id,
  }).eq("id", budgetId);

  revalidatePath("/finance");
}
