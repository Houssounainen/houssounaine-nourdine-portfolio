"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";

async function staffContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, allowed: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, user, allowed: isStaff(profile?.role) };
}

export async function createAnnouncement(formData: FormData) {
  const { supabase, user, allowed } = await staffContext();
  if (!user || !allowed) return;
  const title = String(formData.get("title") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!title || !message) return;

  await supabase.from("announcements").insert({
    title,
    message,
    level: String(formData.get("level") || "info"),
    pinned: formData.get("pinned") === "on",
    published_at: new Date().toISOString(),
    created_by: user.id,
  });

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}

export async function toggleAnnouncementPin(formData: FormData) {
  const { supabase, allowed } = await staffContext();
  if (!allowed) return;
  const id = String(formData.get("id") || "");
  const next = String(formData.get("next") || "false") === "true";
  if (!id) return;
  await supabase.from("announcements").update({ pinned: next, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}
