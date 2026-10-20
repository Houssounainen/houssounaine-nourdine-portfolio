"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateMyProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc("update_my_member_profile", {
    p_phone: String(formData.get("phone") || ""),
    p_program: String(formData.get("program") || ""),
    p_study_level: String(formData.get("study_level") || ""),
  });

  revalidatePath("/me");
}

export async function createMyRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: member } = await supabase.from("members").select("id").eq("profile_id", user.id).maybeSingle();
  if (!member) return;

  const subject = String(formData.get("subject") || "").trim();
  if (!subject) return;

  await supabase.from("member_service_requests").insert({
    member_id: member.id,
    request_type: String(formData.get("request_type") || "autre"),
    subject,
    details: String(formData.get("details") || "").trim(),
  });

  revalidatePath("/me");
}

export async function updateMyBio(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const bio = String(formData.get("bio") || "").trim().slice(0, 280);
  // p_url = null : la photo actuelle est conservée (coalesce côté base), seule la bio change.
  const { error } = await supabase.rpc("set_my_avatar", { p_url: null, p_bio: bio });
  revalidatePath("/me");
  revalidatePath(`/people/${user.id}`);
  redirect(error ? "/me?error=bio#profil" : "/me?ok=Bio%20enregistr%C3%A9e#profil");
}
