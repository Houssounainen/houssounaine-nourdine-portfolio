"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";

async function documentContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id",user.id).single();
  return { supabase, user, role: profile?.role || null };
}

function financeRole(role: string | null) {
  return ["admin","bureau","tresorier"].includes(role || "");
}

export async function createQuote(formData: FormData) {
  const { supabase, user, role } = await documentContext();
  if (!user || !isStaff(role)) return;

  const recipient = String(formData.get("recipient_name") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  if (!recipient || !subject) return;

  const { data } = await supabase.from("quotes").insert({
    recipient_name: recipient,
    recipient_email: String(formData.get("recipient_email") || "").trim() || null,
    recipient_phone: String(formData.get("recipient_phone") || "").trim() || null,
    recipient_address: String(formData.get("recipient_address") || "").trim() || null,
    subject,
    valid_until: String(formData.get("valid_until") || "") || null,
    notes: String(formData.get("notes") || "").trim() || null,
    status: "draft",
    created_by: user.id,
  }).select("id").single();

  if (data?.id) redirect("/documents/quotes/" + data.id);
}

export async function createInvoice(formData: FormData) {
  const { supabase, user, role } = await documentContext();
  if (!user || !financeRole(role)) return;

  const recipient = String(formData.get("recipient_name") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  if (!recipient || !subject) return;

  const { data } = await supabase.from("invoices").insert({
    recipient_name: recipient,
    recipient_email: String(formData.get("recipient_email") || "").trim() || null,
    recipient_phone: String(formData.get("recipient_phone") || "").trim() || null,
    recipient_address: String(formData.get("recipient_address") || "").trim() || null,
    subject,
    due_at: String(formData.get("due_at") || "") || null,
    notes: String(formData.get("notes") || "").trim() || null,
    status: "issued",
    created_by: user.id,
  }).select("id").single();

  if (data?.id) redirect("/documents/invoices/" + data.id);
}

export async function addQuoteItem(formData: FormData) {
  const { supabase, role } = await documentContext();
  if (!isStaff(role)) return;
  const quoteId = String(formData.get("quote_id") || "");
  const description = String(formData.get("description") || "").trim();
  const quantity = Number(formData.get("quantity") || 1);
  const unitPrice = Number(formData.get("unit_price") || 0);
  if (!quoteId || !description || quantity <= 0 || unitPrice < 0) return;

  const { count } = await supabase.from("quote_items").select("*",{count:"exact",head:true}).eq("quote_id",quoteId);
  await supabase.from("quote_items").insert({
    quote_id: quoteId,
    position: (count || 0) + 1,
    description,
    quantity,
    unit_price: unitPrice,
  });
  revalidatePath("/documents/quotes/" + quoteId);
  revalidatePath("/documents");
}

export async function addInvoiceItem(formData: FormData) {
  const { supabase, role } = await documentContext();
  if (!financeRole(role)) return;
  const invoiceId = String(formData.get("invoice_id") || "");
  const description = String(formData.get("description") || "").trim();
  const quantity = Number(formData.get("quantity") || 1);
  const unitPrice = Number(formData.get("unit_price") || 0);
  if (!invoiceId || !description || quantity <= 0 || unitPrice < 0) return;

  const { count } = await supabase.from("invoice_items").select("*",{count:"exact",head:true}).eq("invoice_id",invoiceId);
  await supabase.from("invoice_items").insert({
    invoice_id: invoiceId,
    position: (count || 0) + 1,
    description,
    quantity,
    unit_price: unitPrice,
  });
  revalidatePath("/documents/invoices/" + invoiceId);
  revalidatePath("/documents");
}

export async function updateQuoteStatus(formData: FormData) {
  const { supabase, role } = await documentContext();
  if (!isStaff(role)) return;
  const quoteId = String(formData.get("quote_id") || "");
  const status = String(formData.get("status") || "");
  if (!quoteId || !["draft","issued","accepted","cancelled"].includes(status)) return;

  await supabase.from("quotes").update({ status }).eq("id",quoteId);
  revalidatePath("/documents/quotes/" + quoteId);
  revalidatePath("/documents");
}

export async function convertQuote(formData: FormData) {
  const { supabase, role } = await documentContext();
  if (!financeRole(role)) return;
  const quoteId = String(formData.get("quote_id") || "");
  const dueAt = String(formData.get("due_at") || "") || null;
  if (!quoteId) return;

  const { data } = await supabase.rpc("convert_quote_to_invoice",{p_quote_id:quoteId,p_due_at:dueAt});
  if (data) redirect("/documents/invoices/" + data);
}

export async function recordInvoicePayment(formData: FormData) {
  const { supabase, user, role } = await documentContext();
  if (!user || !financeRole(role)) return;

  const invoiceId = String(formData.get("invoice_id") || "");
  const amount = Number(formData.get("amount") || 0);
  if (!invoiceId || amount <= 0) return;

  await supabase.from("invoice_payments").insert({
    invoice_id: invoiceId,
    amount,
    method: String(formData.get("method") || "Espèces"),
    external_reference: String(formData.get("external_reference") || "").trim() || null,
    account_id: String(formData.get("account_id") || "") || null,
    notes: String(formData.get("notes") || "").trim() || null,
    paid_at: String(formData.get("paid_at") || "") ? new Date(String(formData.get("paid_at")) + "T12:00:00+03:00").toISOString() : new Date().toISOString(),
    created_by: user.id,
  });

  revalidatePath("/documents/invoices/" + invoiceId);
  revalidatePath("/documents");
  revalidatePath("/finance");
}

export async function cancelInvoice(formData: FormData) {
  const { supabase, role } = await documentContext();
  if (!financeRole(role)) return;
  const invoiceId = String(formData.get("invoice_id") || "");
  if (!invoiceId) return;
  await supabase.from("invoices").update({status:"cancelled"}).eq("id",invoiceId);
  revalidatePath("/documents/invoices/" + invoiceId);
  revalidatePath("/documents");
}
