"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/server-access";

const villages=["Darsalama","Bandrani-Vouani"];
const statuses=["pending","active","inactive"];

function fail(message:string):never{
  redirect("/members?error="+encodeURIComponent(message));
}

export async function addMember(formData: FormData) {
  const {allowed,supabase,user}=await getAccessContext("members_manage");
  if(!allowed||!user) fail("Accès administrateur requis.");

  const full_name=String(formData.get("full_name")||"").trim();
  const village=String(formData.get("village")||"").trim();
  const email=String(formData.get("email")||"").trim().toLowerCase();
  const status=String(formData.get("status")||"active");
  const joined_at=String(formData.get("joined_at")||"").trim()||new Date().toISOString().slice(0,10);
  const member_number=String(formData.get("member_number")||"").trim()||null;

  if(!full_name) fail("Le nom complet est obligatoire.");
  if(!villages.includes(village)) fail("Village invalide.");
  if(!statuses.includes(status)) fail("Statut invalide.");
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Adresse email invalide.");

  const {error}=await supabase.from("members").insert({
    full_name,
    member_number,
    village,
    program:String(formData.get("program")||"").trim()||null,
    study_level:String(formData.get("study_level")||"").trim()||null,
    phone:String(formData.get("phone")||"").trim()||null,
    email:email||null,
    status,
    joined_at,
    created_by:user.id,
  });

  if(error){
    if(error.code==="23505") fail("Ce numéro de membre est déjà utilisé.");
    fail("L’ajout du membre a échoué. Vérifie les informations puis réessaie.");
  }

  revalidatePath("/members");
  revalidatePath("/dashboard");
  redirect("/members?created=1");
}
