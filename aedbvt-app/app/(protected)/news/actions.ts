"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function createArticle(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isStaff(profile?.role)) return;

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!title || !body) return;

  await supabase.from("articles").insert({
    title,
    slug: slugify(title) + "-" + Date.now().toString().slice(-6),
    excerpt: String(formData.get("excerpt") || "").trim(),
    body,
    category: String(formData.get("category") || "Vie associative"),
    published: true,
    published_at: new Date().toISOString(),
    author_id: user.id,
  });

  revalidatePath("/news");
  revalidatePath("/dashboard");
}
