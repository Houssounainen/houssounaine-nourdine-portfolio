import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, type AppRole } from "@/lib/access";

export type { AppRole };

export async function bootstrapAdmin(user: User) {
  const adminEmail = process.env.AEDBVT_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || user.email?.toLowerCase() !== adminEmail) return;
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("profiles").upsert({
    id: user.id,
    full_name: "Houssounaine Nourdine",
    role: "admin" satisfies AppRole,
    active: true,
  });
}

export function isStaff(role?: string | null) {
  return can(role,"staff");
}
