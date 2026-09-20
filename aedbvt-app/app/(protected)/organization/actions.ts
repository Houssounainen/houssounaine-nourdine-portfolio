"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";

export async function assignPosition(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isStaff(profile?.role)) return;

  const slug = String(formData.get("slug") || "");
  const memberId = String(formData.get("member_id") || "");
  if (!slug) return;

  await supabase.from("organization_positions").update({ member_id: memberId || null, updated_at: new Date().toISOString() }).eq("slug", slug);
  revalidatePath("/organization");
}
