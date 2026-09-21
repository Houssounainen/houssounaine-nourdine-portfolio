import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { bootstrapAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await bootstrapAdmin(user);

  const [{data:profile},{count:unreadCount}]=await Promise.all([
    supabase.from("profiles").select("full_name,role,active").eq("id", user.id).maybeSingle(),
    supabase.from("internal_notifications").select("*",{count:"exact",head:true}).eq("recipient_id",user.id).is("read_at",null),
  ]);

  if(!profile) redirect("/access-denied?reason=profile");
  if(profile.active===false) redirect("/access-denied?reason=suspended");

  await supabase.rpc("mark_my_account_activated");

  return <AppShell profile={profile} unreadNotifications={unreadCount||0}>{children}</AppShell>;
}
