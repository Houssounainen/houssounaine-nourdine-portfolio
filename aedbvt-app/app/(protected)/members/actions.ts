"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";

export async function addMember(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isStaff(profile?.role)) return;

  const full_name = String(formData.get("full_name") || "").trim();
  if (!full_name) return;

  await supabase.from("members").insert({
    full_name,
    village: String(formData.get("village") || ""),
    program: String(formData.get("program") || ""),
    study_level: String(formData.get("study_level") || ""),
    phone: String(formData.get("phone") || ""),
    status: "active",
    created_by: user.id,
  });

  revalidatePath("/members");
}
