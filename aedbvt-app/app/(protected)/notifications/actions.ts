"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateNotificationPreferences(formData:FormData){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return;

  await supabase.from("notification_preferences").upsert({
    profile_id:user.id,
    announcements:formData.get("announcements")==="on",
    agenda:formData.get("agenda")==="on",
    operations:formData.get("operations")==="on",
    administration:formData.get("administration")==="on",
    updated_at:new Date().toISOString(),
  },{onConflict:"profile_id"});

  revalidatePath("/notifications");
}

export async function markNotificationRead(formData:FormData){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return;
  const id=String(formData.get("notification_id")||"");
  if(!id) return;
  await supabase.rpc("mark_internal_notification_read",{p_notification_id:id});
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return;
  await supabase.rpc("mark_all_internal_notifications_read");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
