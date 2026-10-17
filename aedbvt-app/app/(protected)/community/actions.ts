"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";
import { can } from "@/lib/access";
import { safeImageUrls } from "@/lib/format";

const CATEGORIES = ["annonce", "fete", "social", "partage", "photo"];

export async function createPost(formData: FormData) {
  const context = await getAccessContext();
  if (!context.allowed) return;
  const body = String(formData.get("body") || "").trim().slice(0, 3000);
  const images = safeImageUrls(formData.getAll("images"), 6);
  let category = String(formData.get("category") || "social");
  if (!CATEGORIES.includes(category)) category = "social";
  if (category === "annonce" && !can(context.role, "staff")) category = "social";
  if (!body && !images.length) return;
  await context.supabase.from("community_posts").insert({ body, images, category: images.length && !body && category === "social" ? "photo" : category });
  revalidatePath("/community");
  revalidatePath("/dashboard");
}

export async function deletePost(formData: FormData) {
  const context = await getAccessContext();
  if (!context.allowed) return;
  await context.supabase.from("community_posts").update({ deleted_at: new Date().toISOString() }).eq("id", String(formData.get("id")));
  revalidatePath("/community");
}

export async function togglePin(formData: FormData) {
  const context = await getAccessContext("staff");
  if (!context.allowed) return;
  await context.supabase.from("community_posts").update({ pinned: formData.get("pinned") === "true" }).eq("id", String(formData.get("id")));
  revalidatePath("/community");
}

export async function addComment(formData: FormData) {
  const context = await getAccessContext();
  if (!context.allowed) return;
  const body = String(formData.get("body") || "").trim().slice(0, 1000);
  if (!body) return;
  await context.supabase.from("community_post_comments").insert({ post_id: String(formData.get("post_id")), body });
  revalidatePath("/community");
}

export async function deleteComment(formData: FormData) {
  const context = await getAccessContext();
  if (!context.allowed) return;
  await context.supabase.from("community_post_comments").update({ deleted_at: new Date().toISOString() }).eq("id", String(formData.get("id")));
  revalidatePath("/community");
}
