"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const allowedRoles = ["admin","bureau","tresorier","secretaire","membre"];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, admin: null, user: null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { allowed: profile?.role === "admin", admin: createAdminClient(), user };
}

export async function inviteUser(formData: FormData) {
  const { allowed, admin } = await requireAdmin();
  if (!allowed || !admin) return;

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") || "").trim();
  const role = String(formData.get("role") || "membre");
  const memberId = String(formData.get("member_id") || "");
  if (!email || !fullName || !allowedRoles.includes(role)) return;

  const redirectTo = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/,"") + "/login";
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo,
  });
  if (error || !data.user) return;

  await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: fullName,
    role,
    active: true,
  });

  if (memberId) {
    await admin.from("members").update({ profile_id: data.user.id, email }).eq("id", memberId);
  }

  revalidatePath("/admin");
  revalidatePath("/members");
}

export async function updateUserAccess(formData: FormData) {
  const { allowed, admin, user } = await requireAdmin();
  if (!allowed || !admin || !user) return;

  const profileId = String(formData.get("profile_id") || "");
  const role = String(formData.get("role") || "membre");
  const active = String(formData.get("active") || "true") === "true";
  if (!profileId || !allowedRoles.includes(role)) return;
  if (profileId === user.id && (!active || role !== "admin")) return;

  await admin.from("profiles").update({ role, active, updated_at: new Date().toISOString() }).eq("id", profileId);
  revalidatePath("/admin");
}
