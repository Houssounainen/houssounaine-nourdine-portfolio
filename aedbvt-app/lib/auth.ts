import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "bureau" | "tresorier" | "secretaire" | "membre";

export async function bootstrapAdmin(user: User) {
  const adminEmail = process.env.AEDBVT_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || user.email?.toLowerCase() !== adminEmail) return;
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("profiles").upsert({
    id: user.id,
    full_name: "Houssounaine Nourdine",
    role: "admin",
    active: true,
  });
}

export function isStaff(role?: string | null) {
  return ["admin", "bureau", "tresorier", "secretaire"].includes(role || "");
}
