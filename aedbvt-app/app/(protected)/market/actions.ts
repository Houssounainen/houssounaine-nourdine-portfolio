"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/server-access";
import { safeImageUrls } from "@/lib/format";

const CATEGORIES = ["livres", "electronique", "vetements", "maison", "services", "alimentation", "autre"];
const CONDITIONS = ["neuf", "tres_bon", "bon", "usage"];
const STATUSES = ["available", "reserved", "sold"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) || "").trim().slice(0, max);
}

export async function createListing(formData: FormData) {
  const context = await getAccessContext();
  if (!context.allowed) redirect("/market");

  const title = text(formData, "title", 120);
  if (title.length < 2) redirect("/market?erreur=titre");

  const category = CATEGORIES.includes(String(formData.get("category"))) ? String(formData.get("category")) : "autre";
  const conditionRaw = String(formData.get("condition") || "");
  const condition = CONDITIONS.includes(conditionRaw) ? conditionRaw : null;
  const priceRaw = String(formData.get("price") || "").replace(/[\s  ]/g, "");
  const priceValue = priceRaw ? Math.round(Number(priceRaw)) : null;
  const price = priceValue !== null && Number.isFinite(priceValue) && priceValue >= 0 && priceValue < 1e12 ? priceValue : null;

  const { data, error } = await context.supabase.from("market_listings").insert({
    title,
    category,
    condition,
    price,
    description: text(formData, "description", 2000),
    contact: text(formData, "contact", 120),
    images: safeImageUrls(formData.getAll("images"), 5),
  }).select("id").single();

  revalidatePath("/market");
  if (error || !data) redirect("/market?erreur=publication");
  redirect(`/market/${data.id}`);
}

export async function updateListingStatus(formData: FormData) {
  const context = await getAccessContext();
  const id = String(formData.get("id") || "");
  if (!context.allowed || !UUID.test(id)) redirect("/market");
  const status = String(formData.get("status") || "");
  if (STATUSES.includes(status)) {
    await context.supabase.from("market_listings").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  }
  revalidatePath("/market");
  revalidatePath(`/market/${id}`);
  redirect(`/market/${id}`);
}

export async function deleteListing(formData: FormData) {
  const context = await getAccessContext();
  const id = String(formData.get("id") || "");
  if (!context.allowed || !UUID.test(id)) redirect("/market");
  const now = new Date().toISOString();
  await context.supabase.from("market_listings").update({ deleted_at: now, updated_at: now }).eq("id", id);
  revalidatePath("/market");
  redirect("/market");
}
