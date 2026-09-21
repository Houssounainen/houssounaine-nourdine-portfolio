"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";

export async function addMember(formData: FormData) {
  const {allowed,supabase,user}=await getAccessContext("members_manage");
  if(!allowed||!user) return;

  const full_name = String(formData.get("full_name") || "").trim();
  if (!full_name) return;

  await supabase.from("members").insert({
    full_name,
    village: String(formData.get("village") || ""),
    program: String(formData.get("program") || ""),
    study_level: String(formData.get("study_level") || ""),
    phone: String(formData.get("phone") || ""),
    email:String(formData.get("email")||"").trim().toLowerCase()||null,
    status: "active",
    created_by: user.id,
  });

  revalidatePath("/members");
}
