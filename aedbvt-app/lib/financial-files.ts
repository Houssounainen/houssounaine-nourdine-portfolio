"use server";

import { revalidatePath } from "next/cache";
import { getAccessContext } from "@/lib/server-access";

const allowedTypes = new Set(["application/pdf","image/jpeg","image/png","image/webp"]);
const allowedEntities = new Set(["expense","quote","invoice","invoice_payment","member_payment"]);

export async function uploadFinancialAttachment(formData: FormData) {
  const {allowed,supabase,user}=await getAccessContext("finance_manage");
  if(!allowed||!user) return;

  const file = formData.get("file");
  const entityType = String(formData.get("entity_type") || "");
  const entityId = String(formData.get("entity_id") || "");
  if (!(file instanceof File) || !allowedEntities.has(entityType) || !entityId) return;
  if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024) return;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g,"-").slice(-120);
  const storagePath = entityType + "/" + entityId + "/" + crypto.randomUUID() + "-" + safeName;
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage.from("financial-documents").upload(storagePath, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return;

  await supabase.from("financial_attachments").insert({
    entity_type: entityType,
    entity_id: entityId,
    file_name: file.name,
    storage_path: storagePath,
    content_type: file.type,
    size_bytes: file.size,
    uploaded_by: user.id,
  });

  revalidatePath("/finance");
  revalidatePath("/documents");
  if (entityType === "quote") revalidatePath("/documents/quotes/" + entityId);
  if (entityType === "invoice") revalidatePath("/documents/invoices/" + entityId);
}
