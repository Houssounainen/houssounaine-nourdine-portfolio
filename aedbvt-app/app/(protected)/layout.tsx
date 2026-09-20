import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { bootstrapAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await bootstrapAdmin(user);
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  return <AppShell profile={profile}>{children}</AppShell>;
}
