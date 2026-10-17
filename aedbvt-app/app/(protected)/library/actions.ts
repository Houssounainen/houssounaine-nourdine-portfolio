"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/server-access";

const CATEGORIES = ["cours", "memoire", "examen", "modele", "livre", "administratif", "autre"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createLibraryItem(formData: FormData) {
  const context = await getAccessContext();
  if (!context.allowed || !context.user) redirect("/library");

  const title = String(formData.get("title") || "").trim().slice(0, 160);
  const description = String(formData.get("description") || "").trim().slice(0, 1000);
  const categoryRaw = String(formData.get("category") || "");
  const category = CATEGORIES.includes(categoryRaw) ? categoryRaw : "autre";

  const urlRaw = String(formData.get("url") || "").trim().slice(0, 2000);
  const url = /^https?:\/\/[^\s]+$/i.test(urlRaw) ? urlRaw : null;
  const pathRaw = String(formData.get("file_path") || "").trim();
  const file_path = pathRaw.startsWith(`${context.user.id}/`) && !pathRaw.includes("..") && pathRaw.length <= 400 ? pathRaw : null;
  const file_name = file_path ? (String(formData.get("file_name") || "").trim().replace(/[\r\n"]/g, "").slice(0, 200) || null) : null;

  if (title.length < 2 || (!url && !file_path)) redirect("/library?erreur=1");

  const { error } = await context.supabase.from("library_items").insert({
    title,
    description,
    category,
    url: file_path ? null : url,
    file_path,
    file_name,
  });

  revalidatePath("/library");
  redirect(error ? "/library?erreur=1" : "/library");
}

export async function deleteLibraryItem(formData: FormData) {
  const context = await getAccessContext();
  const id = String(formData.get("id") || "");
  if (!context.allowed || !UUID.test(id)) redirect("/library");
  await context.supabase.from("library_items").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/library");
}
